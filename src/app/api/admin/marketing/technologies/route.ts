import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { technologies } from '@/lib/db/schema';
import { asc, eq, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db.select().from(technologies).orderBy(asc(technologies.position));
  return NextResponse.json({ technologies: rows });
}

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.number().int().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const existing = await db.select({ id: technologies.id }).from(technologies).where(eq(technologies.name, parsed.data.name)).then((r) => r[0]);
  if (existing) {
    return NextResponse.json({ error: 'Technology already exists' }, { status: 409 });
  }

  let position = parsed.data.position;
  if (position === undefined) {
    const [{ max }] = await db.select({ max: sql<number>`COALESCE(max(${technologies.position}), 0)::int` }).from(technologies);
    position = max + 1;
  }

  const [created] = await db.insert(technologies).values({
    name: parsed.data.name,
    position,
    status: 'draft',
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
