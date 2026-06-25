import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks, projectMembers, projects, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createNotification, createBulkNotifications } from '@/lib/notifications';
import { sendTaskAssignedEmail } from '@/lib/bird';

async function checkMembership(projectId: string, userId: string) {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
  const member = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .then((rows) => rows[0]);
  return !!member;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, taskId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, assigneeId: tasks.assigneeId, signedOffAt: tasks.signedOffAt })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();

  if (body.status !== undefined) {
    const memberRecord = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
      .then((rows) => rows[0]);
    const isAdmin = session.user.role === 'admin';

    if (!isAdmin && memberRecord?.role === 'client' && body.status === 'done') {
      return NextResponse.json(
        { error: 'Clients must use the sign-off flow to mark tasks as done.' },
        { status: 403 },
      );
    }

    if (existing.signedOffAt && !isAdmin) {
      return NextResponse.json(
        { error: 'This task has been signed off and is locked.' },
        { status: 403 },
      );
    }
  }

  const updateData: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = body.status;
  }

  if (body.position !== undefined) {
    if (typeof body.position !== 'number') {
      return NextResponse.json({ error: 'Position must be a number' }, { status: 400 });
    }
    updateData.position = body.position;
  }

  if (body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    updateData.title = body.title.trim();
  }

  if (body.description !== undefined) {
    updateData.description = body.description;
  }

  if (body.priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }
    updateData.priority = body.priority;
  }

  if (body.assigneeId !== undefined) {
    updateData.assigneeId = body.assigneeId || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const [task] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  try {
    if (body.assigneeId && body.assigneeId !== existing.assigneeId && body.assigneeId !== session.user.id) {
      await createNotification({
        userId: body.assigneeId,
        projectId,
        type: 'task_assigned',
        title: 'New task assigned',
        body: `You've been assigned: ${existing.title}`,
      });

      const [assignee, project] = await Promise.all([
        db.select({ email: users.email }).from(users).where(eq(users.id, body.assigneeId)).then((r) => r[0]),
        db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).then((r) => r[0]),
      ]);
      if (assignee?.email) {
        const assignerName = session.user.name || session.user.email || 'Someone';
        sendTaskAssignedEmail(assignee.email, existing.title, project?.name || 'a project', assignerName).catch(() => {});
      }
    }

    if (body.status && body.status !== existing.status) {
      const members = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId));
      const recipientIds = members
        .map((m) => m.userId)
        .filter((id) => id !== session.user.id);
      await createBulkNotifications(recipientIds, {
        projectId,
        type: 'status_changed',
        title: 'Task status updated',
        body: `${existing.title} moved to ${body.status.replace('_', ' ')}`,
      });
    }
  } catch (err) {
    console.error('Notification error:', err);
  }

  return NextResponse.json(task);
}
