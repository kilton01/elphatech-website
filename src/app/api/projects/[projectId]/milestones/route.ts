import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { milestones, tasks, projectMembers, activities } from '@/lib/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

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

  const result = await db
    .select({
      id: milestones.id,
      title: milestones.title,
      description: milestones.description,
      startDate: milestones.startDate,
      endDate: milestones.endDate,
      position: milestones.position,
      taskCount: sql<number>`count(${tasks.id})::int`,
      completedTaskCount: sql<number>`count(case when ${tasks.status} = 'done' and ${tasks.signedOffAt} is not null then 1 end)::int`,
    })
    .from(milestones)
    .leftJoin(tasks, eq(tasks.milestoneId, milestones.id))
    .where(eq(milestones.projectId, projectId))
    .groupBy(milestones.id)
    .orderBy(asc(milestones.position));

  const phaseData = await db
    .select({
      milestoneId: tasks.milestoneId,
      phase: tasks.phase,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(case when ${tasks.status} = 'done' and ${tasks.signedOffAt} is not null then 1 end)::int`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.milestoneId, tasks.phase)
    .orderBy(tasks.phase);

  const enriched = result.map(m => ({
    ...m,
    phases: phaseData
      .filter(p => p.milestoneId === m.id)
      .map(p => ({ phase: p.phase, total: p.total, completed: p.completed })),
  }));

  return NextResponse.json({ milestones: enriched });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = await request.json();
  const { title, description, startDate, endDate } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  if (end <= start) {
    return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
  }

  const maxPos = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${milestones.position}), -1)` })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .then((rows) => rows[0]?.maxPos ?? -1);

  const [milestone] = await db
    .insert(milestones)
    .values({
      projectId,
      title: title.trim(),
      description: description?.trim() || null,
      startDate: start,
      endDate: end,
      position: maxPos + 1,
    })
    .returning();

  await db.insert(activities).values({
    projectId,
    userId: session.user.id,
    action: 'milestone_created',
    metadata: { milestoneTitle: milestone.title },
  });

  return NextResponse.json(milestone, { status: 201 });
}
