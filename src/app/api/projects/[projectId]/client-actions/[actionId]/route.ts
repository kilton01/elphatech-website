import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clientActions, projectMembers, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; actionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, actionId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id, session.user.role);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const isAdmin = session.user.role === 'admin';

  // Clients can only toggle completion
  if (!isAdmin) {
    if ('isCompleted' in body) {
      const isCompleted = Boolean(body.isCompleted);
      const [updated] = await db
        .update(clientActions)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedById: isCompleted ? session.user.id : null,
        })
        .where(and(eq(clientActions.id, actionId), eq(clientActions.projectId, projectId)))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      // Notify admins when client completes an action
      if (isCompleted) {
        const [project] = await db
          .select({ name: projects.name })
          .from(projects)
          .where(eq(projects.id, projectId));

        const adminMembers = await db
          .select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'admin')));

        if (adminMembers.length > 0) {
          await createBulkNotifications(
            adminMembers.map((m) => m.userId),
            {
              projectId,
              type: 'client_action_completed',
              title: 'Client action completed',
              body: `${session.user.name || session.user.email} completed "${updated.title}" on ${project?.name || 'a project'}.`,
            },
          );
        }
      }

      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin can update title, description, position
  const updates: Record<string, unknown> = {};
  if ('title' in body && typeof body.title === 'string' && body.title.trim()) {
    updates.title = body.title.trim();
  }
  if ('description' in body) {
    updates.description = body.description?.trim() || null;
  }
  if ('position' in body && typeof body.position === 'number') {
    updates.position = body.position;
  }
  if ('isCompleted' in body) {
    updates.isCompleted = Boolean(body.isCompleted);
    updates.completedAt = body.isCompleted ? new Date() : null;
    updates.completedById = body.isCompleted ? session.user.id : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(clientActions)
    .set(updates)
    .where(and(eq(clientActions.id, actionId), eq(clientActions.projectId, projectId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; actionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId, actionId } = await context.params;

  const [deleted] = await db
    .delete(clientActions)
    .where(and(eq(clientActions.id, actionId), eq(clientActions.projectId, projectId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
