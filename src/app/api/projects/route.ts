import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, projectMembers, tasks } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = session.user.role === 'admin';

  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      slug: projects.slug,
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM ${projectMembers}
        WHERE ${projectMembers.projectId} = ${projects.id}
      )`,
      taskCount: sql<number>`(
        SELECT COUNT(*) FROM ${tasks}
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

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, description } = await request.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let slug = slugify(name);
  if (!slug) slug = 'project';

  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .then((rows) => rows[0]);

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const [project] = await db
    .insert(projects)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      slug,
      ownerId: session.user.id,
    })
    .returning();

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: session.user.id,
    role: 'admin',
  });

  return NextResponse.json(project, { status: 201 });
}
