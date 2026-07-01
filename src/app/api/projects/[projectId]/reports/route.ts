import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { testerReports, projectMembers, activities } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createBulkNotifications } from '@/lib/notifications';
import { canSubmitReports } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const isAdmin = session.user.role === 'admin';

  if (!isAdmin) {
    const member = await db
      .select({ id: projectMembers.id, role: projectMembers.role, canTest: projectMembers.canTest })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
      .then((r) => r[0]);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (member.role === 'client' && !member.canTest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const statusFilter = request.nextUrl.searchParams.get('status');
  const typeFilter = request.nextUrl.searchParams.get('type');

  let query = db
    .select()
    .from(testerReports)
    .where(eq(testerReports.projectId, projectId))
    .orderBy(desc(testerReports.createdAt))
    .$dynamic();

  if (statusFilter) {
    query = query.where(and(eq(testerReports.projectId, projectId), eq(testerReports.status, statusFilter as any)));
  }
  if (typeFilter) {
    query = query.where(and(eq(testerReports.projectId, projectId), eq(testerReports.type, typeFilter as any)));
  }

  let rows = await db
    .select()
    .from(testerReports)
    .where(eq(testerReports.projectId, projectId))
    .orderBy(desc(testerReports.createdAt));

  if (statusFilter) {
    rows = rows.filter((r) => r.status === statusFilter);
  }
  if (typeFilter) {
    rows = rows.filter((r) => r.type === typeFilter);
  }

  if (!isAdmin) {
    rows = rows.filter((r) => r.reporterId === session.user.id);
  }

  return NextResponse.json({ reports: rows });
}

const createSchema = z.object({
  type: z.enum(['bug', 'enhancement']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  fileId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const isAdmin = session.user.role === 'admin';

  if (isAdmin) {
    return NextResponse.json({ error: 'Admins cannot submit reports directly' }, { status: 403 });
  }

  const member = await db
    .select({ id: projectMembers.id, role: projectMembers.role, canTest: projectMembers.canTest })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
    .then((r) => r[0]);

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!canSubmitReports(member)) {
    return NextResponse.json({ error: 'Only testers can submit reports' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const [created] = await db.insert(testerReports).values({
    projectId,
    fileId: parsed.data.fileId ?? null,
    reporterId: session.user.id,
    reporterName: session.user.name || session.user.email || 'Unknown',
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    severity: parsed.data.severity,
    status: 'open',
  }).returning();

  const adminMembers = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'admin')));

  const adminIds = adminMembers.map((m) => m.userId);
  if (adminIds.length > 0) {
    const testerName = session.user.name || session.user.email || 'A tester';
    await createBulkNotifications(adminIds, {
      projectId,
      type: 'comment_added',
      title: `New ${parsed.data.type} report`,
      body: `${testerName} reported a ${parsed.data.severity} ${parsed.data.type}: ${parsed.data.title}`,
    });
  }

  await db.insert(activities).values({
    projectId,
    userId: session.user.id,
    action: 'report_submitted',
    metadata: { type: parsed.data.type, severity: parsed.data.severity, title: parsed.data.title },
  });

  return NextResponse.json(created, { status: 201 });
}
