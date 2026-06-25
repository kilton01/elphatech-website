import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { comments, projectMembers, projects, tasks, users } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { createBulkNotifications } from '@/lib/notifications';
import { sendCommentNotificationEmail } from '@/lib/bird';

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

  const result = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(
      and(eq(comments.projectId, projectId), eq(comments.taskId, taskId)),
    )
    .orderBy(desc(comments.createdAt));

  return NextResponse.json(result);
}

export async function POST(
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

  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { content } = await request.json();
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const [comment] = await db
    .insert(comments)
    .values({
      projectId,
      taskId,
      authorId: session.user.id,
      content: content.trim(),
    })
    .returning();

  const author = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .then((rows) => rows[0]);

  try {
    const members = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    const recipientIds = members
      .map((m) => m.userId)
      .filter((id) => id !== session.user.id);

    const taskRecord = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .then((rows) => rows[0]);

    const commenterName = author?.name || author?.email || 'Someone';
    const taskTitle = taskRecord?.title || 'a task';

    await createBulkNotifications(recipientIds, {
      projectId,
      type: 'comment_added',
      title: 'New comment',
      body: `${commenterName} commented on ${taskTitle}`,
    });

    if (recipientIds.length > 0) {
      const project = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .then((rows) => rows[0]);

      const recipientEmails = await db
        .select({ email: users.email })
        .from(users)
        .where(inArray(users.id, recipientIds));

      const preview = content.trim().slice(0, 120);
      await Promise.allSettled(
        recipientEmails.map((r) =>
          sendCommentNotificationEmail(
            r.email,
            commenterName,
            taskTitle,
            preview,
            project?.name || 'a project',
          ),
        ),
      );
    }
  } catch (err) {
    console.error('Notification/email error:', err);
  }

  return NextResponse.json(
    {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      authorName: author?.name ?? null,
      authorEmail: author?.email ?? null,
    },
    { status: 201 },
  );
}
