import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, projects, tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const deleteSchema = z.object({
  reassignTo: z.string().uuid().nullable(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { reassignTo } = parsed.data;

  const targetUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .then((rows) => rows[0]);

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const ownedProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, userId));

  const reportedTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.reporterId, userId));

  if ((ownedProjects.length > 0 || reportedTasks.length > 0) && !reassignTo) {
    return NextResponse.json(
      { error: 'User has owned projects or reported tasks. Provide a reassignTo user.' },
      { status: 400 },
    );
  }

  if (reassignTo) {
    const reassignTarget = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, reassignTo))
      .then((rows) => rows[0]);

    if (!reassignTarget) {
      return NextResponse.json({ error: 'Reassign target user not found' }, { status: 400 });
    }

    if (ownedProjects.length > 0) {
      await db
        .update(projects)
        .set({ ownerId: reassignTo })
        .where(eq(projects.ownerId, userId));
    }

    if (reportedTasks.length > 0) {
      await db
        .update(tasks)
        .set({ reporterId: reassignTo })
        .where(eq(tasks.reporterId, userId));
    }
  }

  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
