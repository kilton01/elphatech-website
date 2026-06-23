import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; memberId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, memberId } = await context.params;

  const member = await db
    .select({ id: projectMembers.id, userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.id, memberId),
        eq(projectMembers.projectId, projectId),
      ),
    )
    .then((rows) => rows[0]);

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (member.userId === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot remove yourself' },
      { status: 400 },
    );
  }

  await db.delete(projectMembers).where(eq(projectMembers.id, memberId));

  return NextResponse.json({ success: true });
}
