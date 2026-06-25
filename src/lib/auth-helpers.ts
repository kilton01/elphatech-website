import { NextResponse } from 'next/server';
import { auth } from './auth';
import { db } from './db';
import { projectMembers } from './db/schema';
import { eq, and } from 'drizzle-orm';

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function checkProjectAccess(projectId: string, userId: string, role?: 'admin' | 'client') {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
  if (role === 'admin') return false;

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

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
