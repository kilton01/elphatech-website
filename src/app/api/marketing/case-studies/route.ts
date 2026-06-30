import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { caseStudies } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
  const rows = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.status, 'published'))
    .orderBy(asc(caseStudies.position));

  return NextResponse.json({ caseStudies: rows }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
