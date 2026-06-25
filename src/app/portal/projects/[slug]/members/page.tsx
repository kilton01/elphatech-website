import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import MembersList from '@/components/portal/members-list';

export default async function MembersPage({
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

  const members = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .leftJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));

  const serializedMembers = members.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <MembersList
      projectId={projectId}
      members={serializedMembers}
      isAdmin={isAdmin}
    />
  );
}
