import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { activities, projectMembers, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Activity as ActivityIcon } from 'lucide-react';

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const isAdmin = session.user.role === 'admin';
  const isMember = isAdmin
    ? true
    : !!(await db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, session.user.id),
          ),
        )
        .then((rows) => rows[0]));

  if (!isMember) notFound();

  const activityList = await db
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
    .where(eq(activities.projectId, projectId))
    .orderBy(desc(activities.createdAt));

  return (
    <div>
      {activityList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand bg-navy2 py-16">
          <ActivityIcon className="mb-2 size-8 text-slate" />
          <p className="text-sm text-slate">No activity yet.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[15px] top-2 h-[calc(100%-16px)] w-px bg-border" />
          {activityList.map((activity) => (
            <div key={activity.id} className="relative flex gap-4 pb-6">
              <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <ActivityIcon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm text-foreground">{activity.action}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activity.userName ?? activity.userEmail ?? 'Unknown'} &middot;{' '}
                  {activity.createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                {!!activity.metadata && (
                  <pre className="mt-1 max-w-full overflow-x-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
