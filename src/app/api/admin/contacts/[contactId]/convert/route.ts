import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contactSubmissions, projects, projectMembers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendProjectInviteEmail } from '@/lib/bird';
import { generateInviteLink } from '@/lib/auth-helpers';

const convertSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { contactId } = await context.params;
  const body = await request.json();
  const parsed = convertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    );
  }

  const [contact] = await db
    .select()
    .from(contactSubmissions)
    .where(eq(contactSubmissions.id, contactId));

  if (!contact) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { projectName, description } = parsed.data;

  let slug = slugify(projectName);
  if (!slug) slug = 'project';

  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .then((rows) => rows[0]);

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const result = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: projectName.trim(),
        description: description?.trim() || null,
        slug,
        ownerId: session.user.id,
      })
      .returning();

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: session.user.id,
      role: 'admin',
    });

    let user = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, contact.email.toLowerCase().trim()))
      .then((rows) => rows[0]);

    if (!user) {
      const [created] = await tx
        .insert(users)
        .values({
          email: contact.email.toLowerCase().trim(),
          name: contact.name,
          role: 'client',
        })
        .returning();
      user = created;
    }

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: user.id,
      role: 'client',
    });

    await tx
      .update(contactSubmissions)
      .set({ status: 'converted' })
      .where(eq(contactSubmissions.id, contactId));

    return { projectId: project.id, projectSlug: project.slug, clientUserId: user.id };
  });

  try {
    const inviterName = session.user.name || session.user.email || 'ElphaTech Solutions';
    const inviteLink = await generateInviteLink(
      contact.email,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal`,
    );
    await sendProjectInviteEmail(contact.email, projectName, inviterName, inviteLink);
  } catch (err) {
    console.error('Invite email error:', err);
  }

  return NextResponse.json({
    success: true,
    projectSlug: result.projectSlug,
    projectId: result.projectId,
  });
}
