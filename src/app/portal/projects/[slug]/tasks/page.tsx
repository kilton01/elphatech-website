import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, tasks, users as usersTable, projectMembers, milestones } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import KanbanBoard from '@/components/portal/kanban-board';
import { computeTaskReadiness } from '@/lib/task-readiness';

export default async function TasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .then((rows) => rows[0]);
  if (!project) notFound();
  const projectId = project.id;

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const member = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id),
        ),
      )
      .then((rows) => rows[0]);
    if (!member) notFound();
  }

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      position: tasks.position,
      dueDate: tasks.dueDate,
      assigneeName: usersTable.name,
      signedOffAt: tasks.signedOffAt,
      signedOffByName: tasks.signedOffByName,
      milestoneId: tasks.milestoneId,
      phase: tasks.phase,
    })
    .from(tasks)
    .leftJoin(usersTable, eq(usersTable.id, tasks.assigneeId))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.status, tasks.position);

  const milestoneRows = await db
    .select({
      id: milestones.id,
      title: milestones.title,
      startDate: milestones.startDate,
      endDate: milestones.endDate,
    })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.position));

  const readinessMap = computeTaskReadiness(
    taskRows.map(t => ({ id: t.id, milestoneId: t.milestoneId, phase: t.phase, status: t.status }))
  );

  const serializedTasks = taskRows.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    signedOffAt: t.signedOffAt?.toISOString() ?? null,
    phase: t.phase,
    isReady: readinessMap.get(t.id) ?? true,
  }));

  const serializedMilestones = milestoneRows.map((m) => ({
    ...m,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
  }));

  return (
    <div>
      <KanbanBoard
        projectId={projectId}
        tasks={serializedTasks}
        milestones={serializedMilestones}
        userRole={session.user.role}
      />
    </div>
  );
}
