import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, activities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const { name, description } = parsed.data;
  if (name === undefined && description === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const changes: Record<string, string> = {};

  if (description !== undefined) {
    updates.description = description || null;
    changes.description = description || '';
  }

  if (name !== undefined) {
    updates.name = name;
    changes.name = name;

    let slug = slugify(name);
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .then((r) => r[0]);

    if (existing && existing.id !== projectId) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
    }
    updates.slug = slug;
  }

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, projectId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.insert(activities).values({
    projectId,
    userId: session.user.id,
    action: 'project_updated',
    metadata: { changes },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId } = await context.params;

  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
