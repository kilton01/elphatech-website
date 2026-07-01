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
  contactSubmissions,
  testerReports,
  feedback,
} from '@/lib/db/schema';
import { eq, and, ne, sql, desc, isNull, inArray, lt, gte, count, sum } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // --- Summary: 7 independent queries in parallel ---
  const [
    totalProjectsResult,
    activeProjectsResult,
    totalClientsResult,
    overdueTasksResult,
    pendingSignoffsResult,
    unreadResult,
    outstandingInvoicesResult,
    newContactsResult,
    openReportsResult,
    newFeedbackResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(projects),

    db.selectDistinct({ projectId: tasks.projectId })
      .from(tasks)
      .where(ne(tasks.status, 'done')),

    db.select({ userId: projectMembers.userId })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(users.role, 'client'))
      .groupBy(projectMembers.userId),

    db.select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(lt(tasks.dueDate, now), ne(tasks.status, 'done'))),

    db.select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.status, 'review'), isNull(tasks.signedOffAt))),

    db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false))),

    db.select({
      count: sql<number>`count(DISTINCT ${invoices.id})::int`,
      total: sql<number>`COALESCE(sum(${invoiceItems.amount}::numeric), 0)`,
    })
      .from(invoices)
      .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
      .where(eq(invoices.status, 'sent')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, 'new')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(testerReports)
      .where(eq(testerReports.status, 'open')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(feedback)
      .where(gte(feedback.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))),
  ]);

  const totalProjects = totalProjectsResult[0]?.count ?? 0;
  const activeProjects = activeProjectsResult.length;
  const totalClients = totalClientsResult.length;
  const overdueTasks = overdueTasksResult[0]?.count ?? 0;
  const pendingSignoffs = pendingSignoffsResult[0]?.count ?? 0;
  const unreadNotifications = unreadResult[0]?.count ?? 0;
  const outstandingInvoices = outstandingInvoicesResult[0]?.count ?? 0;
  const outstandingInvoiceTotal = Number(outstandingInvoicesResult[0]?.total ?? 0);
  const newContacts = newContactsResult[0]?.count ?? 0;
  const openReports = openReportsResult[0]?.count ?? 0;
  const newFeedback = newFeedbackResult[0]?.count ?? 0;

  // --- Per-project health: bulk queries instead of N+1 ---
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      createdAt: projects.createdAt,
    })
    .from(projects);

  const projectIds = projectRows.map((p) => p.id);

  let projectData: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    clientCount: number;
    taskTotal: number;
    taskDone: number;
    overdueCount: number;
    milestoneCount: number;
    milestonesComplete: number;
    lastActivityAt: Date | null;
    lastClientActivityAt: Date | null;
    health: 'on_track' | 'at_risk' | 'overdue';
  }> = [];

  if (projectIds.length > 0) {
    const [
      taskStatRows,
      milestoneCountRows,
      milestoneCompletionRows,
      activityRows,
      clientCountRows,
      clientCommentRows,
      clientFileRows,
    ] = await Promise.all([
      // Task stats per project
      db.select({
        projectId: tasks.projectId,
        taskTotal: sql<number>`count(*)::int`,
        taskDone: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
        overdueCount: sql<number>`count(case when ${tasks.dueDate} < ${now.toISOString()} and ${tasks.status} != 'done' then 1 end)::int`,
      })
        .from(tasks)
        .where(inArray(tasks.projectId, projectIds))
        .groupBy(tasks.projectId),

      // Milestone count per project
      db.select({
        projectId: milestones.projectId,
        milestoneCount: sql<number>`count(*)::int`,
        atRiskCount: sql<number>`count(case when ${milestones.endDate} <= ${sevenDaysFromNow.toISOString()} and ${milestones.endDate} > ${now.toISOString()} then 1 end)::int`,
      })
        .from(milestones)
        .where(inArray(milestones.projectId, projectIds))
        .groupBy(milestones.projectId),

      // Milestones complete: milestones where all tasks are signed off
      // A milestone is complete if it has tasks and all tasks have signedOffAt set
      db.select({
        milestoneId: tasks.milestoneId,
        projectId: tasks.projectId,
        totalTasks: sql<number>`count(*)::int`,
        signedOffTasks: sql<number>`count(${tasks.signedOffAt})::int`,
      })
        .from(tasks)
        .where(and(
          inArray(tasks.projectId, projectIds),
          sql`${tasks.milestoneId} IS NOT NULL`,
        ))
        .groupBy(tasks.milestoneId, tasks.projectId),

      // Last activity per project
      db.select({
        projectId: activities.projectId,
        lastActivityAt: sql<Date>`max(${activities.createdAt})`,
      })
        .from(activities)
        .where(inArray(activities.projectId, projectIds))
        .groupBy(activities.projectId),

      // Client count per project
      db.select({
        projectId: projectMembers.projectId,
        clientCount: sql<number>`count(*)::int`,
      })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .where(and(inArray(projectMembers.projectId, projectIds), eq(users.role, 'client')))
        .groupBy(projectMembers.projectId),

      // Last client comment per project
      db.select({
        projectId: comments.projectId,
        lastCommentAt: sql<Date>`max(${comments.createdAt})`,
      })
        .from(comments)
        .innerJoin(projectMembers, and(
          eq(projectMembers.userId, comments.authorId),
          eq(projectMembers.projectId, comments.projectId),
        ))
        .innerJoin(users, and(eq(users.id, comments.authorId), eq(users.role, 'client')))
        .where(inArray(comments.projectId, projectIds))
        .groupBy(comments.projectId),

      // Last client file upload per project
      db.select({
        projectId: files.projectId,
        lastFileAt: sql<Date>`max(${files.createdAt})`,
      })
        .from(files)
        .innerJoin(projectMembers, and(
          eq(projectMembers.userId, files.uploadedById),
          eq(projectMembers.projectId, files.projectId),
        ))
        .innerJoin(users, and(eq(users.id, files.uploadedById), eq(users.role, 'client')))
        .where(inArray(files.projectId, projectIds))
        .groupBy(files.projectId),
    ]);

    // Build lookup maps
    const taskMap = new Map(taskStatRows.map((r) => [r.projectId, r]));
    const milestoneMap = new Map(milestoneCountRows.map((r) => [r.projectId, r]));
    const activityMap = new Map(activityRows.map((r) => [r.projectId, r.lastActivityAt]));
    const clientCountMap = new Map(clientCountRows.map((r) => [r.projectId, r.clientCount]));
    const clientCommentMap = new Map(clientCommentRows.map((r) => [r.projectId, r.lastCommentAt]));
    const clientFileMap = new Map(clientFileRows.map((r) => [r.projectId, r.lastFileAt]));

    // Compute milestones complete per project
    const milestonesCompleteMap = new Map<string, number>();
    for (const row of milestoneCompletionRows) {
      if (row.projectId && row.totalTasks > 0 && row.totalTasks === row.signedOffTasks) {
        milestonesCompleteMap.set(
          row.projectId,
          (milestonesCompleteMap.get(row.projectId) ?? 0) + 1,
        );
      }
    }

    projectData = projectRows.map((p) => {
      const t = taskMap.get(p.id);
      const m = milestoneMap.get(p.id);
      const overdueCount = t?.overdueCount ?? 0;
      const atRiskMilestones = m?.atRiskCount ?? 0;

      let health: 'on_track' | 'at_risk' | 'overdue' = 'on_track';
      if (overdueCount > 0) health = 'overdue';
      else if (atRiskMilestones > 0) health = 'at_risk';

      const lastComment = clientCommentMap.get(p.id) ?? null;
      const lastFile = clientFileMap.get(p.id) ?? null;
      let lastClientActivityAt: Date | null = null;
      if (lastComment && lastFile) {
        lastClientActivityAt = lastComment > lastFile ? lastComment : lastFile;
      } else {
        lastClientActivityAt = lastComment || lastFile;
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        createdAt: p.createdAt,
        clientCount: clientCountMap.get(p.id) ?? 0,
        taskTotal: t?.taskTotal ?? 0,
        taskDone: t?.taskDone ?? 0,
        overdueCount,
        milestoneCount: m?.milestoneCount ?? 0,
        milestonesComplete: milestonesCompleteMap.get(p.id) ?? 0,
        lastActivityAt: activityMap.get(p.id) ?? null,
        lastClientActivityAt,
        health,
      };
    });
  }

  // --- Client activity: bulk queries instead of N+1 ---
  const clientUsers = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, 'client'));

  let clientData: Array<{
    userId: string;
    name: string | null;
    email: string;
    projectCount: number;
    lastCommentAt: Date | null;
    lastFileUploadAt: Date | null;
    lastActiveAt: Date | null;
  }> = [];

  if (clientUsers.length > 0) {
    const clientUserIds = clientUsers.map((c) => c.userId);

    const [clientProjectCounts, clientLastComments, clientLastFiles] = await Promise.all([
      db.select({
        userId: projectMembers.userId,
        count: sql<number>`count(*)::int`,
      })
        .from(projectMembers)
        .where(inArray(projectMembers.userId, clientUserIds))
        .groupBy(projectMembers.userId),

      db.select({
        authorId: comments.authorId,
        lastAt: sql<Date>`max(${comments.createdAt})`,
      })
        .from(comments)
        .where(inArray(comments.authorId, clientUserIds))
        .groupBy(comments.authorId),

      db.select({
        uploadedById: files.uploadedById,
        lastAt: sql<Date>`max(${files.createdAt})`,
      })
        .from(files)
        .where(inArray(files.uploadedById, clientUserIds))
        .groupBy(files.uploadedById),
    ]);

    const projectCountMap = new Map(clientProjectCounts.map((r) => [r.userId, r.count]));
    const lastCommentMap = new Map(clientLastComments.map((r) => [r.authorId, r.lastAt]));
    const lastFileMap = new Map(clientLastFiles.map((r) => [r.uploadedById, r.lastAt]));

    clientData = clientUsers.map((c) => {
      const lastCommentAt = lastCommentMap.get(c.userId) ?? null;
      const lastFileUploadAt = lastFileMap.get(c.userId) ?? null;
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
        projectCount: projectCountMap.get(c.userId) ?? 0,
        lastCommentAt,
        lastFileUploadAt,
        lastActiveAt,
      };
    });
  }

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
      newContacts,
      openReports,
      newFeedback,
    },
    projects: projectData,
    clients: clientData,
  });
}
