import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clientActions, projectMembers, users } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { createBulkNotifications } from '@/lib/notifications';

async function checkMembership(projectId: string, userId: string, role: string) {
  if (role === 'admin') return true;
  const member = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
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

  const { projectId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id, session.user.role);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const actions = await db
    .select({
      id: clientActions.id,
      title: clientActions.title,
      description: clientActions.description,
      isCompleted: clientActions.isCompleted,
      completedAt: clientActions.completedAt,
      completedById: clientActions.completedById,
      completedByName: users.name,
      position: clientActions.position,
      createdAt: clientActions.createdAt,
    })
    .from(clientActions)
    .leftJoin(users, eq(users.id, clientActions.completedById))
    .where(eq(clientActions.projectId, projectId))
    .orderBy(asc(clientActions.position), asc(clientActions.createdAt));

  return NextResponse.json(actions);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId } = await context.params;
  const body = await request.json();
  const { title, description } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const [maxPos] = await db
    .select({ max: sql<number>`coalesce(max(${clientActions.position}), -1)` })
    .from(clientActions)
    .where(eq(clientActions.projectId, projectId));

  const [action] = await db.insert(clientActions).values({
    projectId,
    title: title.trim(),
    description: description?.trim() || null,
    position: (maxPos?.max ?? -1) + 1,
  }).returning();

  // Notify client members
  const clientMembers = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'client')));

  if (clientMembers.length > 0) {
    await createBulkNotifications(
      clientMembers.map((m) => m.userId),
      {
        projectId,
        type: 'client_action_created',
        title: 'New action required',
        body: `"${action.title}" has been added to your project checklist.`,
      },
    );
  }

  return NextResponse.json(action, { status: 201 });
}
