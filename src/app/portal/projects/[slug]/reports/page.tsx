import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers, files } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import ReportsView from '@/components/portal/reports-view';

export default async function ReportsPage({
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
    .then((r) => r[0]);
  if (!project) notFound();

  const isAdmin = session.user.role === 'admin';
  let canReport = false;

  if (!isAdmin) {
    const member = await db
      .select({ role: projectMembers.role, canTest: projectMembers.canTest })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, session.user.id)))
      .then((r) => r[0]);

    if (!member) notFound();
    if (member.role === 'client' && !member.canTest) redirect(`/portal/projects/${slug}`);
    canReport = member.role === 'tester' || member.canTest;
  }

  const projectFiles = await db
    .select({ id: files.id, name: files.name })
    .from(files)
    .where(eq(files.projectId, project.id));

  return (
    <ReportsView
      projectId={project.id}
      isAdmin={isAdmin}
      canReport={canReport}
      files={projectFiles}
    />
  );
}
