import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { testimonials, caseStudies, technologies } from '../db/schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  await db.transaction(async (tx) => {
    // Testimonials
    const [{ count: tCount }] = await tx.select({ count: sql<number>`count(*)::int` }).from(testimonials);
    if (tCount === 0) {
      await tx.insert(testimonials).values([
        {
          quote: 'He took our hacked, broken website and turned it into something better than we ever had. Not only did he fix the security mess, he rebuilt the entire thing with a modern stack and added a mobile app feature we did not even ask for. We can finally run our business without worrying about getting hacked again.',
          clientLabel: 'Confidential — Logistics & Storage',
          industry: 'Logistics & Storage',
          clientSince: '2026',
          rating: 5,
          position: 1,
          status: 'published',
        },
      ]);
      console.log('✓ Testimonials seeded');
    } else {
      console.log('→ Testimonials already exist, skipping');
    }

    // Case Studies
    const [{ count: csCount }] = await tx.select({ count: sql<number>`count(*)::int` }).from(caseStudies);
    if (csCount === 0) {
      await tx.insert(caseStudies).values([
        {
          category: 'WEBSITE SECURITY & MODERNIZATION',
          title: 'Logistics & Storage Company — Full Website Rescue',
          description: "A client's WordPress site was compromised — hackers had injected a betting platform into the database. I identified the breach, cleaned every backdoor, rebuilt the site as a headless WordPress + Next.js application, and created a custom security plugin to replace the vulnerable one.",
          outcome: 'Client reclaimed their business — zero security issues since launch. Added PWA with push notifications for mobile customers.',
          position: 1,
          status: 'published',
        },
        {
          category: 'AWS COST OPTIMIZATION',
          title: 'Enterprise Client — Cloud Bill Cut by 75%',
          description: 'Audited a sprawling multi-service AWS environment. Identified idle compute, over-provisioned databases, untagged resources, and misconfigured storage tiers. Implemented right-sizing, reserved instances, and automated scaling policies.',
          outcome: 'Monthly bill dropped from $24,000 to $6,000 — saving $216,000 per year.',
          position: 2,
          status: 'published',
        },
      ]);
      console.log('✓ Case studies seeded');
    } else {
      console.log('→ Case studies already exist, skipping');
    }

    // Technologies
    const [{ count: techCount }] = await tx.select({ count: sql<number>`count(*)::int` }).from(technologies);
    if (techCount === 0) {
      const techNames = ['AWS', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'Terraform', 'Redis'];
      await tx.insert(technologies).values(
        techNames.map((name, i) => ({ name, position: i + 1, status: 'published' as const })),
      );
      console.log('✓ Technologies seeded');
    } else {
      console.log('→ Technologies already exist, skipping');
    }
  });

  console.log('\nDone!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
