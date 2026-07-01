import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const patchSchema = z.object({
  canTest: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; memberId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, memberId } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.canTest !== undefined) updates.canTest = parsed.data.canTest;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(projectMembers)
    .set(updates)
    .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
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
