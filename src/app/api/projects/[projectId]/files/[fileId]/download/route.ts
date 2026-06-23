import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { files, projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPresignedDownloadUrl } from '@/lib/r2';

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
  context: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, fileId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file = await db
    .select({ id: files.id, key: files.key, name: files.name })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const url = await getPresignedDownloadUrl(file.key);
  return NextResponse.json({ url });
}
