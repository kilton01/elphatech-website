import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers, tasks } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProjectCard from '@/components/portal/project-card';

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isAdmin = session.user.role === 'admin';

  const projectsList = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      slug: projects.slug,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${projectMembers}
        WHERE ${projectMembers.projectId} = ${projects.id}
      )`,
      taskCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${tasks}
        WHERE ${tasks.projectId} = ${projects.id}
      )`,
    })
    .from(projects)
    .where(
      isAdmin
        ? undefined
        : sql`${projects.id} IN (
            SELECT ${projectMembers.projectId} FROM ${projectMembers}
            WHERE ${projectMembers.userId} = ${session.user.id}
          )`,
    )
    .orderBy(desc(projects.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Projects</h1>
          <p className="text-sm text-slate">
            {isAdmin ? 'All projects' : 'Your assigned projects'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/portal/projects/new">
            <Button className="bg-red text-white hover:bg-red2">
              <Plus className="size-4" />
              New Project
            </Button>
          </Link>
        )}
      </div>

      {projectsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand bg-navy2 py-16">
          <p className="text-sm text-slate">No projects yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsList.map((project) => (
            <ProjectCard key={project.id} project={project} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
