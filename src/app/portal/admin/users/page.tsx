import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, projects, tasks } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import UserManagement from '@/components/portal/user-management';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/portal');

  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      ownedProjects: sql<number>`(
        SELECT COUNT(*) FROM ${projects}
        WHERE ${projects.ownerId} = ${users.id}
      )`,
      reportedTasks: sql<number>`(
        SELECT COUNT(*) FROM ${tasks}
        WHERE ${tasks.reporterId} = ${users.id}
      )`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const adminUsers = userList.filter((u) => u.role === 'admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">User Management</h1>
        <p className="text-sm text-slate">Manage users, reassign ownership, and deactivate accounts.</p>
      </div>
      <UserManagement
        users={userList.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        adminUsers={adminUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
