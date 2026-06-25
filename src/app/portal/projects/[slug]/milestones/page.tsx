import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { projects, projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import MilestonesList from '@/components/portal/milestones-list';

export default async function MilestonesPage({
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

  return <MilestonesList projectId={projectId} isAdmin={isAdmin} />;
}
