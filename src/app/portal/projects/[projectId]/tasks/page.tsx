import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks, users as usersTable, projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import KanbanBoard from '@/components/portal/kanban-board';

export default async function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user) notFound();

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
    })
    .from(tasks)
    .leftJoin(usersTable, eq(usersTable.id, tasks.assigneeId))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.status, tasks.position);

  const serializedTasks = taskRows.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
  }));

  return (
    <div>
      <KanbanBoard projectId={projectId} tasks={serializedTasks} />
    </div>
  );
}
