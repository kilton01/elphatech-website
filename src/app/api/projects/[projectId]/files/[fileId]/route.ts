import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { files, projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { deleteFile } from '@/lib/r2';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, fileId } = await context.params;

  const file = await db
    .select({ id: files.id, key: files.key })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  await deleteFile(file.key);

  await db.delete(files).where(eq(files.id, fileId));

  return NextResponse.json({ success: true });
}
