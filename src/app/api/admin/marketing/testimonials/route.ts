import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { testimonials } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.position));
  return NextResponse.json({ testimonials: rows });
}

const createSchema = z.object({
  quote: z.string().min(1, 'Quote is required'),
  clientLabel: z.string().min(1, 'Client label is required'),
  industry: z.string().optional(),
  clientSince: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
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
    const [{ max }] = await db.select({ max: sql<number>`COALESCE(max(${testimonials.position}), 0)::int` }).from(testimonials);
    position = max + 1;
  }

  const [created] = await db.insert(testimonials).values({
    quote: parsed.data.quote,
    clientLabel: parsed.data.clientLabel,
    industry: parsed.data.industry || null,
    clientSince: parsed.data.clientSince || null,
    rating: parsed.data.rating ?? 5,
    position,
    status: 'draft',
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
