import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files, projectMembers, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import FileUpload from '@/components/portal/file-upload';
import FileList from '@/components/portal/file-list';

export default async function FilesPage({
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
  const isMember = isAdmin
    ? true
    : !!(await db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, session.user.id),
          ),
        )
        .then((rows) => rows[0]));

  if (!isMember) notFound();

  const fileList = await db
    .select({
      id: files.id,
      name: files.name,
      key: files.key,
      size: files.size,
      mimeType: files.mimeType,
      createdAt: files.createdAt,
      uploaderName: users.name,
      uploaderEmail: users.email,
    })
    .from(files)
    .leftJoin(users, eq(users.id, files.uploadedById))
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.createdAt));

  const serializedFiles = fileList.map((file) => ({
    id: file.id,
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
    createdAt: file.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    uploaderName: file.uploaderName,
  }));

  return (
    <div className="space-y-6">
      <FileUpload projectId={projectId} />

      {fileList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand bg-navy2 py-16">
          <FileText className="mb-2 size-8 text-slate" />
          <p className="text-sm text-slate">No files uploaded yet.</p>
        </div>
      ) : (
        <FileList files={serializedFiles} projectId={projectId} />
      )}
    </div>
  );
}
