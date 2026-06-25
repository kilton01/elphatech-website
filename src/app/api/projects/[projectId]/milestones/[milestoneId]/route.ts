import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { milestones, activities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, milestoneId } = await context.params;

  const existing = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!existing) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    updateData.title = body.title.trim();
  }

  if (body.description !== undefined) {
    updateData.description = body.description?.trim() || null;
  }

  if (body.startDate !== undefined) {
    const start = new Date(body.startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
    }
    updateData.startDate = start;
  }

  if (body.endDate !== undefined) {
    const end = new Date(body.endDate);
    if (isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
    }
    updateData.endDate = end;
  }

  if (body.position !== undefined) {
    if (typeof body.position !== 'number') {
      return NextResponse.json({ error: 'Position must be a number' }, { status: 400 });
    }
    updateData.position = body.position;
  }

  if (updateData.startDate && updateData.endDate) {
    if ((updateData.endDate as Date) <= (updateData.startDate as Date)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(milestones)
    .set(updateData)
    .where(eq(milestones.id, milestoneId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, milestoneId } = await context.params;

  const existing = await db
    .select({ id: milestones.id, title: milestones.title })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!existing) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }

  await db.delete(milestones).where(eq(milestones.id, milestoneId));

  await db.insert(activities).values({
    projectId,
    userId: session.user.id,
    action: 'milestone_deleted',
    metadata: { milestoneTitle: existing.title },
  });

  return NextResponse.json({ success: true });
}
