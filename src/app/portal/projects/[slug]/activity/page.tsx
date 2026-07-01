import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, activities, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Activity as ActivityIcon, BadgeCheck, RotateCcw, Flag, Trash2, Receipt, CreditCard, Star, Bug, ArrowRight } from 'lucide-react';
import { type ReactNode } from 'react';

function getActivityDisplay(
  action: string,
  meta: Record<string, string> | null,
): { icon: ReactNode; label: string } {
  switch (action) {
    case 'signed_off':
      return {
        icon: <BadgeCheck className="size-3.5 text-success" />,
        label: `${meta?.signedOffBy || 'A client'} signed off on ${meta?.taskTitle || 'a task'}`,
      };
    case 'signoff_revoked':
      return {
        icon: <RotateCcw className="size-3.5 text-warning" />,
        label: `${meta?.revokedBy || 'An admin'} revoked sign-off on ${meta?.taskTitle || 'a task'}`,
      };
    case 'milestone_created':
      return {
        icon: <Flag className="size-3.5 text-info" />,
        label: `Created milestone: ${meta?.milestoneTitle || 'Untitled'}`,
      };
    case 'milestone_deleted':
      return {
        icon: <Trash2 className="size-3.5 text-danger" />,
        label: `Deleted milestone: ${meta?.milestoneTitle || 'Untitled'}`,
      };
    case 'invoice_created':
      return {
        icon: <Receipt className="size-3.5 text-info" />,
        label: `Created invoice ${meta?.invoiceNumber || ''} (${meta?.total ? `$${meta.total}` : ''})`,
      };
    case 'invoice_paid':
      return {
        icon: <CreditCard className="size-3.5 text-success" />,
        label: `Invoice ${meta?.invoiceNumber || ''} marked as paid`,
      };
    case 'feedback_submitted':
      return {
        icon: <Star className="size-3.5 text-warning" />,
        label: 'Left feedback',
      };
    case 'report_submitted':
      return {
        icon: <Bug className="size-3.5 text-danger" />,
        label: `Reported a ${meta?.severity || ''} ${meta?.type || 'issue'}: ${meta?.title || ''}`,
      };
    case 'report_converted':
      return {
        icon: <ArrowRight className="size-3.5 text-success" />,
        label: `Report converted to task: ${meta?.reportTitle || ''}`,
      };
    case 'project_updated':
      return {
        icon: <ActivityIcon className="size-3.5 text-info" />,
        label: 'Updated project details',
      };
    default:
      return {
        icon: <ActivityIcon className="size-3.5 text-muted-foreground" />,
        label: action,
      };
  }
}

export default async function ActivityPage({
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
    .orderBy(desc(activities.createdAt))
    .limit(100);

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
          {activityList.map((activity) => {
            const meta = activity.metadata as Record<string, string> | null;
            const { icon, label } = getActivityDisplay(activity.action, meta);

            return (
              <div key={activity.id} className="relative flex gap-4 pb-6">
                <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  {icon}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm text-foreground">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {activity.userName ?? activity.userEmail ?? 'Unknown'} &middot;{' '}
                    {activity.createdAt.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
