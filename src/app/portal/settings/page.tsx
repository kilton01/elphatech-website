import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .then((rows) => rows[0]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate">Your account information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal details and role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate uppercase tracking-wider">Name</p>
            <p className="mt-0.5 text-white">{user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate uppercase tracking-wider">Email</p>
            <p className="mt-0.5 text-white">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate uppercase tracking-wider">Role</p>
            <p className="mt-0.5 text-white capitalize">{user?.role}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
