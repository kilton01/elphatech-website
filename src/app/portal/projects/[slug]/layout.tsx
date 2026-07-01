import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProjectTabs from '@/components/portal/project-tabs';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const project = await db
    .select({ id: projects.id, name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.slug, slug))
    .then((rows) => rows[0]);

  if (!project) notFound();

  const isAdmin = session.user.role === 'admin';
  let showReports = isAdmin;

  if (!isAdmin) {
    const member = await db
      .select({ id: projectMembers.id, role: projectMembers.role, canTest: projectMembers.canTest })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, project.id),
          eq(projectMembers.userId, session.user.id),
        ),
      )
      .then((rows) => rows[0]);
    if (!member) notFound();
    showReports = member.role === 'tester' || member.canTest;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/portal/projects"
          className="flex size-8 items-center justify-center rounded-lg text-slate transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">{project.name}</h1>
        </div>
      </div>
      <ProjectTabs projectSlug={project.slug} showReports={showReports}>{children}</ProjectTabs>
    </div>
  );
}
