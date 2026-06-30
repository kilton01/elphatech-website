import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { caseStudies } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db.select().from(caseStudies).orderBy(asc(caseStudies.position));
  return NextResponse.json({ caseStudies: rows });
}

const createSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  outcome: z.string().min(1, 'Outcome is required'),
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

  let position = parsed.data.position;
  if (position === undefined) {
    const [{ max }] = await db.select({ max: sql<number>`COALESCE(max(${caseStudies.position}), 0)::int` }).from(caseStudies);
    position = max + 1;
  }

  const [created] = await db.insert(caseStudies).values({
    category: parsed.data.category.toUpperCase(),
    title: parsed.data.title,
    description: parsed.data.description,
    outcome: parsed.data.outcome,
    position,
    status: 'draft',
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
