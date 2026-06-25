import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers, tasks, activities, users } from '@/lib/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import Link from 'next/link';
import { FolderKanban, ListTodo, Activity, FileText } from 'lucide-react';
import AdminDashboard from '@/components/portal/admin-dashboard';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isAdmin = session.user.role === 'admin';

  if (isAdmin) {
    return <AdminDashboard userName={session.user.name || 'Admin'} />;
  }
  const userId = session.user.id;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [projectCount, tasksDueThisWeek, recentActivity, myTasks] = await Promise.all([
    // Active project count
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(
        isAdmin
          ? undefined
          : sql`${projects.id} IN (
              SELECT ${projectMembers.projectId} FROM ${projectMembers}
              WHERE ${projectMembers.userId} = ${userId}
            )`,
      )
      .then((rows) => rows[0]?.count ?? 0),

    // Tasks due this week
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          isAdmin
            ? undefined
            : eq(tasks.assigneeId, userId),
          gte(tasks.dueDate, now),
          lte(tasks.dueDate, weekFromNow),
          sql`${tasks.status} != 'done'`,
        ),
      )
      .then((rows) => rows[0]?.count ?? 0),

    // Recent activity (last 10 entries)
    db
      .select({
        id: activities.id,
        action: activities.action,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.userId))
      .where(
        isAdmin
          ? undefined
          : sql`${activities.projectId} IN (
              SELECT ${projectMembers.projectId} FROM ${projectMembers}
              WHERE ${projectMembers.userId} = ${userId}
            )`,
      )
      .orderBy(desc(activities.createdAt))
      .limit(10),

    // My assigned tasks (upcoming, max 5)
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        projectSlug: projects.slug,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .where(
        and(
          isAdmin ? undefined : eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`,
        ),
      )
      .orderBy(tasks.dueDate)
      .limit(5),
  ]);

  const greeting = getGreeting();
  const firstName = session.user.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[var(--font-sora)]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate">
          {tasksDueThisWeek > 0
            ? `You have ${tasksDueThisWeek} task${tasksDueThisWeek !== 1 ? 's' : ''} due this week.`
            : 'No tasks due this week.'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FolderKanban className="size-4" />}
          label="Active Projects"
          value={projectCount}
        />
        <StatCard
          icon={<ListTodo className="size-4" />}
          label="Tasks Due This Week"
          value={tasksDueThisWeek}
          danger={tasksDueThisWeek > 0}
        />
        <StatCard
          icon={<Activity className="size-4" />}
          label="Recent Activity"
          value={recentActivity.length}
        />
        <StatCard
          icon={<FileText className="size-4" />}
          label="My Tasks"
          value={myTasks.length}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Tasks */}
        <div className="rounded-xl border border-brand bg-surface-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">My Tasks</h2>
            <Link href="/portal/projects" className="text-xs text-slate hover:text-white transition-colors">
              View all
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-tertiary">
              No pending tasks. Nice work!
            </p>
          ) : (
            <div className="space-y-2">
              {myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/portal/projects/${task.projectSlug}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/5"
                >
                  <PriorityDot priority={task.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{task.title}</p>
                    <p className="text-xs text-tertiary">{task.projectName}</p>
                  </div>
                  {task.dueDate && (
                    <span className={`text-xs ${isOverdue(task.dueDate) ? 'text-danger' : 'text-tertiary'}`}>
                      {formatRelativeDate(task.dueDate)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-brand bg-surface-2 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-tertiary">
              No recent activity yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-info" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-secondary-brand">
                      <span className="font-medium text-white">
                        {activity.userName || activity.userEmail || 'System'}
                      </span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-xs text-tertiary">
                      {formatRelativeDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-brand bg-surface-2 p-4">
      <div className="flex items-center gap-2 text-slate">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${danger ? 'text-danger' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };
  return <div className={`size-2 shrink-0 rounded-full ${colors[priority] || 'bg-slate'}`} />;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function isOverdue(date: Date): boolean {
  return new Date(date) < new Date();
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Today';
    if (futureDays === 1) return 'Tomorrow';
    return `In ${futureDays} days`;
  }
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
