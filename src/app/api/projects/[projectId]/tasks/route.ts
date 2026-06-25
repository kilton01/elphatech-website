import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks, projectMembers } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications';

async function getProjectId(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  return projectId;
}

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

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = await getProjectId(request, context);
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      position: tasks.position,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      reporterId: tasks.reporterId,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.status, tasks.position);

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = await getProjectId(request, context);
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, description, priority, dueDate, assigneeId, status } = await request.json();

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const validStatuses = ['todo', 'in_progress', 'review', 'done'];
  const taskStatus = status && validStatuses.includes(status) ? status : 'todo';

  const maxPos = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${tasks.position}), -1)` })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, taskStatus)))
    .then((rows) => rows[0]?.maxPos ?? -1);

  const [task] = await db
    .insert(tasks)
    .values({
      projectId,
      title: title.trim(),
      description: description || null,
      priority: priority || 'medium',
      reporterId: session.user.id,
      assigneeId: assigneeId || null,
      status: taskStatus,
      dueDate: dueDate ? new Date(dueDate) : null,
      position: maxPos + 1,
    })
    .returning();

  if (assigneeId && assigneeId !== session.user.id) {
    try {
      await createNotification({
        userId: assigneeId,
        projectId,
        type: 'task_assigned',
        title: 'New task assigned',
        body: `You've been assigned: ${task.title}`,
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  return NextResponse.json(task, { status: 201 });
}
