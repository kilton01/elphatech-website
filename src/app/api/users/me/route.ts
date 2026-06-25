import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (name.trim().length > 100) {
    return NextResponse.json({ error: 'Name too long' }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ name: name.trim() })
    .where(eq(users.id, session.user.id))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  return NextResponse.json(updated);
}
