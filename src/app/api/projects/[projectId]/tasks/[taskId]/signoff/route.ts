import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks, projectMembers, activities, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createBulkNotifications } from '@/lib/notifications';

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, taskId } = await context.params;

  const member = await db
    .select({ role: projectMembers.role })
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

  if (session.user.role === 'admin') {
    return NextResponse.json(
      { error: 'Admins cannot sign off on tasks. This action is for clients.' },
      { status: 403 },
    );
  }

  const task = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      signedOffAt: tasks.signedOffAt,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'review') {
    return NextResponse.json(
      { error: "Only tasks in 'review' status can be signed off." },
      { status: 400 },
    );
  }

  if (task.signedOffAt) {
    return NextResponse.json(
      { error: 'Task is already signed off.' },
      { status: 409 },
    );
  }

  const [updated] = await db.transaction(async (tx) => {
    const [updatedTask] = await tx
      .update(tasks)
      .set({
        status: 'done',
        signedOffAt: new Date(),
        signedOffBy: session.user.id,
        signedOffByName: session.user.name ?? session.user.email,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    await tx.insert(activities).values({
      projectId,
      userId: session.user.id,
      action: 'signed_off',
      metadata: { taskTitle: task.title, signedOffBy: session.user.name ?? session.user.email },
    });

    return [updatedTask];
  });

  try {
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));

    const recipientIds = adminUsers
      .map((u) => u.id)
      .filter((id) => id !== session.user.id);

    await createBulkNotifications(recipientIds, {
      projectId,
      type: 'status_changed',
      title: 'Client sign-off received',
      body: `${session.user.name || session.user.email} signed off on: ${task.title}`,
    });
  } catch (err) {
    console.error('Notification error:', err);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId, taskId } = await context.params;

  const task = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      signedOffAt: tasks.signedOffAt,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.signedOffAt) {
    return NextResponse.json(
      { error: 'Task has no sign-off to revoke.' },
      { status: 400 },
    );
  }

  const [updated] = await db.transaction(async (tx) => {
    const [updatedTask] = await tx
      .update(tasks)
      .set({
        status: 'review',
        signedOffAt: null,
        signedOffBy: null,
        signedOffByName: null,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    await tx.insert(activities).values({
      projectId,
      userId: session.user.id,
      action: 'signoff_revoked',
      metadata: { taskTitle: task.title, revokedBy: session.user.name ?? session.user.email },
    });

    return [updatedTask];
  });

  return NextResponse.json(updated);
}
