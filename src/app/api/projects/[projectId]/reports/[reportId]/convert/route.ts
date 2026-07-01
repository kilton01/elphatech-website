import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { testerReports, tasks, activities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications';

const convertSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  milestoneId: z.string().uuid().optional(),
});

const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; reportId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { projectId, reportId } = await context.params;
  const body = await request.json();
  const parsed = convertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const report = await db
    .select()
    .from(testerReports)
    .where(eq(testerReports.id, reportId))
    .then((r) => r[0]);

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (report.status === 'converted') {
    return NextResponse.json({ error: 'Report already converted' }, { status: 400 });
  }

  const taskTitle = parsed.data.title || report.title;
  const taskDescription = parsed.data.description || report.description;
  const taskPriority = parsed.data.priority || SEVERITY_TO_PRIORITY[report.severity] || 'medium';

  const result = await db.transaction(async (tx) => {
    const [newTask] = await tx.insert(tasks).values({
      projectId,
      title: taskTitle,
      description: taskDescription,
      status: 'todo',
      priority: taskPriority as any,
      reporterId: session.user.id,
      milestoneId: parsed.data.milestoneId ?? null,
    }).returning();

    const [updatedReport] = await tx
      .update(testerReports)
      .set({ status: 'converted', convertedTaskId: newTask.id, updatedAt: new Date() })
      .where(eq(testerReports.id, reportId))
      .returning();

    await tx.insert(activities).values({
      projectId,
      userId: session.user.id,
      action: 'report_converted',
      metadata: { reportTitle: report.title, taskId: newTask.id },
    });

    return { task: newTask, report: updatedReport };
  });

  if (report.reporterId) {
    await createNotification({
      userId: report.reporterId,
      projectId,
      type: 'status_changed',
      title: 'Your report has been added to the backlog',
      body: `Your ${report.type} report '${report.title}' has been converted to a task.`,
    });
  }

  return NextResponse.json(result, { status: 201 });
}
