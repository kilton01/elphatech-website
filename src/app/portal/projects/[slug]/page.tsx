import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers, tasks } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ListTodo, Calendar } from 'lucide-react';
import ProjectEditButton from '@/components/portal/project-edit-button';
import ProjectFeedback from '@/components/portal/project-feedback';
import ClientActions from '@/components/portal/client-actions';

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const isAdmin = session.user.role === 'admin';

  const project = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      slug: projects.slug,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int FROM project_members
        WHERE project_members.project_id = projects.id
      )`,
      taskCount: sql<number>`(
        SELECT COUNT(*)::int FROM tasks
        WHERE tasks.project_id = projects.id
      )`,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .then((rows) => rows[0]);

  if (!project) notFound();

  let canSubmitFeedback = false;
  if (!isAdmin) {
    const member = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, session.user.id)))
      .then((r) => r[0]);
    if (member?.role === 'client') canSubmitFeedback = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {project.description && (
          <p className="text-sm text-slate flex-1">{project.description}</p>
        )}
        {isAdmin && (
          <div className="shrink-0 ml-4">
            <ProjectEditButton
              projectId={project.id}
              projectName={project.name}
              projectDescription={project.description}
              currentSlug={project.slug}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-slate">
              <Users className="size-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{project.memberCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-slate">
              <ListTodo className="size-4" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{project.taskCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-slate">
              <Calendar className="size-4" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">
              {project.createdAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <ClientActions projectId={project.id} isAdmin={isAdmin} />

      <ProjectFeedback
        projectId={project.id}
        canSubmit={canSubmitFeedback}
        isAdmin={isAdmin}
      />
    </div>
  );
}
