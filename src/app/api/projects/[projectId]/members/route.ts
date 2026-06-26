import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectMembers, projects, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications';
import { sendProjectInviteEmail } from '@/lib/bird';
import { generateInviteLink } from '@/lib/auth-helpers';

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const member = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id),
        ),
      )
      .then((rows) => rows[0]);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const members = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .leftJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));

  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = await request.json();
  const emailSchema = z.string().email('Valid email is required');
  const parsed = emailSchema.safeParse(body?.email);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const email = parsed.data;

  let user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .then((rows) => rows[0]);

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({ email: email.toLowerCase().trim(), role: 'client' })
      .returning();
    user = created;
  }

  const existing = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, user.id),
      ),
    )
    .then((rows) => rows[0]);

  if (existing) {
    return NextResponse.json(
      { error: 'User is already a member' },
      { status: 409 },
    );
  }

  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId,
      userId: user.id,
      role: 'client',
    })
    .returning();

  try {
    const project = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .then((rows) => rows[0]);

    const inviterName = session.user.name || session.user.email || 'An admin';
    const projectName = project?.name || 'a project';

    const inviteLink = await generateInviteLink(email, `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal`);

    await Promise.all([
      createNotification({
        userId: user.id,
        projectId,
        type: 'member_invited',
        title: 'Project invitation',
        body: `You've been added to ${projectName}`,
      }),
      sendProjectInviteEmail(email, projectName, inviterName, inviteLink),
    ]);
  } catch (err) {
    console.error('Notification/email error:', err);
  }

  return NextResponse.json(member, { status: 201 });
}
