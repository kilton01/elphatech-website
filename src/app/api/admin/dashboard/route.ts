import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  projects,
  projectMembers,
  tasks,
  milestones,
  activities,
  comments,
  files,
  notifications,
  users,
  invoices,
  invoiceItems,
} from '@/lib/db/schema';
import { eq, and, lt, ne, sql, desc, isNull, inArray } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const nowISO = now.toISOString();

  // Portfolio summary
  const allProjects = await db.select({ id: projects.id }).from(projects);
  const totalProjects = allProjects.length;

  const activeProjectsResult = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(ne(tasks.status, 'done'))
    .groupBy(tasks.projectId);
  const activeProjects = activeProjectsResult.length;

  const totalClientsResult = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(users.role, 'client'))
    .groupBy(projectMembers.userId);
  const totalClients = totalClientsResult.length;

  const overdueTasksResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(lt(tasks.dueDate, now), ne(tasks.status, 'done')))
    .then((rows) => rows[0]);
  const overdueTasks = overdueTasksResult?.count ?? 0;

  const pendingSignoffsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.status, 'review'), isNull(tasks.signedOffAt)))
    .then((rows) => rows[0]);
  const pendingSignoffs = pendingSignoffsResult?.count ?? 0;

  const unreadResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)))
    .then((rows) => rows[0]);
  const unreadNotifications = unreadResult?.count ?? 0;

  // Outstanding invoices (sent but not paid)
  const outstandingInvoiceRows = await db
    .select({ id: invoices.id, invoiceId: invoices.id })
    .from(invoices)
    .where(eq(invoices.status, 'sent'));

  let outstandingInvoiceTotal = 0;
  for (const inv of outstandingInvoiceRows) {
    const items = await db
      .select({ amount: invoiceItems.amount })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, inv.id));
    outstandingInvoiceTotal += items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  }
  const outstandingInvoices = outstandingInvoiceRows.length;

  // Per-project health data
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      createdAt: projects.createdAt,
    })
    .from(projects);

  const projectData = await Promise.all(
    projectRows.map(async (p) => {
      const [taskStats] = await db
        .select({
          taskTotal: sql<number>`count(*)::int`,
          taskDone: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
          overdueCount: sql<number>`count(case when ${tasks.dueDate} < ${nowISO} and ${tasks.status} != 'done' then 1 end)::int`,
        })
        .from(tasks)
        .where(eq(tasks.projectId, p.id));

      const clientCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .where(and(eq(projectMembers.projectId, p.id), eq(users.role, 'client')))
        .then((rows) => rows[0]);

      const [milestoneStats] = await db
        .select({
          milestoneCount: sql<number>`count(*)::int`,
        })
        .from(milestones)
        .where(eq(milestones.projectId, p.id));

      // Milestones complete: a milestone is complete if all its tasks are signed off
      const allMilestones = await db
        .select({ id: milestones.id, endDate: milestones.endDate })
        .from(milestones)
        .where(eq(milestones.projectId, p.id));

      let milestonesComplete = 0;
      let atRisk = false;
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const ms of allMilestones) {
        const msTasks = await db
          .select({ signedOffAt: tasks.signedOffAt })
          .from(tasks)
          .where(eq(tasks.milestoneId, ms.id));

        const isComplete = msTasks.length > 0 && msTasks.every((t) => t.signedOffAt !== null);
        if (isComplete) milestonesComplete++;

        if (!isComplete && ms.endDate <= sevenDaysFromNow && ms.endDate > now) {
          atRisk = true;
        }
      }

      const lastActivity = await db
        .select({ createdAt: activities.createdAt })
        .from(activities)
        .where(eq(activities.projectId, p.id))
        .orderBy(desc(activities.createdAt))
        .limit(1)
        .then((rows) => rows[0]?.createdAt ?? null);

      // Last client activity: most recent comment or file upload by a client
      const clientMemberIds = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .where(and(eq(projectMembers.projectId, p.id), eq(users.role, 'client')))
        .then((rows) => rows.map((r) => r.userId));

      let lastClientActivityAt: Date | null = null;
      if (clientMemberIds.length > 0) {
        const lastComment = await db
          .select({ createdAt: comments.createdAt })
          .from(comments)
          .where(
            and(
              eq(comments.projectId, p.id),
              inArray(comments.authorId, clientMemberIds),
            ),
          )
          .orderBy(desc(comments.createdAt))
          .limit(1)
          .then((rows) => rows[0]?.createdAt ?? null);

        const lastFile = await db
          .select({ createdAt: files.createdAt })
          .from(files)
          .where(
            and(
              eq(files.projectId, p.id),
              inArray(files.uploadedById, clientMemberIds),
            ),
          )
          .orderBy(desc(files.createdAt))
          .limit(1)
          .then((rows) => rows[0]?.createdAt ?? null);

        if (lastComment && lastFile) {
          lastClientActivityAt = lastComment > lastFile ? lastComment : lastFile;
        } else {
          lastClientActivityAt = lastComment || lastFile;
        }
      }

      let health: 'on_track' | 'at_risk' | 'overdue' = 'on_track';
      if (taskStats.overdueCount > 0) health = 'overdue';
      else if (atRisk) health = 'at_risk';

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        createdAt: p.createdAt,
        clientCount: clientCountResult?.count ?? 0,
        taskTotal: taskStats.taskTotal,
        taskDone: taskStats.taskDone,
        overdueCount: taskStats.overdueCount,
        milestoneCount: milestoneStats.milestoneCount,
        milestonesComplete,
        lastActivityAt: lastActivity,
        lastClientActivityAt,
        health,
      };
    }),
  );

  // Client activity data
  const clientUsers = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, 'client'));

  const clientData = await Promise.all(
    clientUsers.map(async (c) => {
      const projectCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projectMembers)
        .where(eq(projectMembers.userId, c.userId))
        .then((rows) => rows[0]?.count ?? 0);

      const lastCommentAt = await db
        .select({ createdAt: comments.createdAt })
        .from(comments)
        .where(eq(comments.authorId, c.userId))
        .orderBy(desc(comments.createdAt))
        .limit(1)
        .then((rows) => rows[0]?.createdAt ?? null);

      const lastFileUploadAt = await db
        .select({ createdAt: files.createdAt })
        .from(files)
        .where(eq(files.uploadedById, c.userId))
        .orderBy(desc(files.createdAt))
        .limit(1)
        .then((rows) => rows[0]?.createdAt ?? null);

      let lastActiveAt: Date | null = null;
      if (lastCommentAt && lastFileUploadAt) {
        lastActiveAt = lastCommentAt > lastFileUploadAt ? lastCommentAt : lastFileUploadAt;
      } else {
        lastActiveAt = lastCommentAt || lastFileUploadAt;
      }

      return {
        userId: c.userId,
        name: c.name,
        email: c.email,
        projectCount,
        lastCommentAt,
        lastFileUploadAt,
        lastActiveAt,
      };
    }),
  );

  return NextResponse.json({
    summary: {
      totalProjects,
      activeProjects,
      totalClients,
      overdueTasks,
      pendingSignoffs,
      unreadNotifications,
      outstandingInvoices,
      outstandingInvoiceTotal,
    },
    projects: projectData,
    clients: clientData,
  });
}
