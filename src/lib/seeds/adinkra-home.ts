import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, projects, milestones, tasks } from '../db/schema';
import crypto from 'crypto';

async function seed() {
  console.log('Starting Adinkra Home seed...\n');

  // 1. Get admin user
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'admin@elphatechsolutions.com'));

  if (!admin) {
    console.error('Admin user (admin@elphatechsolutions.com) not found.');
    process.exit(1);
  }
  console.log(`Found admin user: ${admin.id}`);

  // 2. Check if project already exists
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, 'adinkra-home'));

  let projectId: string;

  // 3. Run all inserts in a transaction
  await db.transaction(async (tx) => {
    if (existing) {
      // Check if milestones already seeded
      const existingMilestones = await tx
        .select({ id: milestones.id })
        .from(milestones)
        .where(eq(milestones.projectId, existing.id));

      if (existingMilestones.length > 0) {
        console.log('Project already exists with milestones. Updating task phases...');

        // Define phase updates by title
        const phaseUpdates = [
          // Milestone 1 - Phase 1: Foundation (data model + permissions)
          { title: 'Define funeral case data model', phase: 1 },
          { title: 'Implement role-based permissions', phase: 1 },

          // Milestone 1 - Phase 2: Core APIs (depend on data model)
          { title: 'Build funeral case creation API', phase: 2 },
          { title: 'Build contribution infrastructure', phase: 2 },
          { title: 'Build budget and expense tracking', phase: 2 },
          { title: 'Build audit trail system', phase: 2 },

          // Milestone 1 - Phase 3: Workflows (depend on APIs)
          { title: 'Build approval engine', phase: 3 },
          { title: 'Build vendor assignment system', phase: 3 },
          { title: 'Build payment request and disbursement workflow', phase: 3 },

          // Milestone 1 - Phase 4: Integrations (depend on workflows)
          { title: 'WhatsApp integration', phase: 4 },
          { title: 'MoMo integration', phase: 4 },
          { title: 'International payment integration', phase: 4 },
          { title: 'Define monetisation model — Phase 1', phase: 4 },

          // Milestone 2 - Phase 1: Vetting + scoring
          { title: 'Build vendor vetting system', phase: 1 },
          { title: 'Build vendor reliability scoring', phase: 1 },
          { title: 'Build preferred vendor program', phase: 1 },

          // Milestone 2 - Phase 2: Packages + portal + tracking
          { title: 'Build structured service packages', phase: 2 },
          { title: 'Vendor portal — scoped access', phase: 2 },
          { title: 'Milestone tracking for vendors', phase: 2 },

          // Milestone 3 - Phase 1: Coordinator assignment + package
          { title: 'Human coordinator assignment', phase: 1 },
          { title: 'Premium coordination package', phase: 1 },

          // Milestone 3 - Phase 2: Dashboard + church
          { title: 'Coordinator dashboard', phase: 2 },
          { title: 'Church integration layer', phase: 2 },

          // Milestone 4 - Phase 1: Savings + memorial + insurance
          { title: 'Funeral savings product', phase: 1 },
          { title: 'Memorial vault', phase: 1 },
          { title: 'Insurance coordination', phase: 1 },

          // Milestone 4 - Phase 2: Wills + repatriation
          { title: 'Wills and estate coordination', phase: 2 },
          { title: 'Repatriation support', phase: 2 },
        ];

        // Update phases for existing tasks by title match
        for (const update of phaseUpdates) {
          await tx.update(tasks)
            .set({ phase: update.phase })
            .where(and(eq(tasks.projectId, existing.id), eq(tasks.title, update.title)));
        }

        console.log(`✓ Updated ${phaseUpdates.length} task phases`);
        process.exit(0);
      }

      projectId = existing.id;
      console.log(`Using existing project: ${projectId}`);
    } else {
      console.log('Creating project...');
      projectId = crypto.randomUUID();
      await tx.insert(projects).values({
        id: projectId,
        name: 'Adinkra Home',
        slug: 'adinkra-home',
        description: 'Funeral financial coordination and trust infrastructure platform for Ghana and the West African diaspora. Digitises contribution tracking, budget governance, approval workflows, and vendor coordination for structured funeral management.',
        ownerId: admin.id,
      });
    }

    // Create milestones
    console.log('Creating milestones...');
    const milestoneData = [
      {
        id: crypto.randomUUID(),
        position: 1,
        title: 'Phase 1 — Trust Infrastructure',
        description: 'Core funeral case management, contribution tracking, budget management, approval engine, payout workflows, and audit trail. MoMo + WhatsApp integration.',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-09-30'),
      },
      {
        id: crypto.randomUUID(),
        position: 2,
        title: 'Phase 2 — Curated Vendor Coordination',
        description: 'Vendor assignment system, milestone tracking, reliability scoring, and structured service packages. No open marketplace.',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-12-31'),
      },
      {
        id: crypto.randomUUID(),
        position: 3,
        title: 'Phase 3 — Managed Coordination Layer',
        description: 'Human coordinator workflows, premium coordination packages, and concierge support tooling.',
        startDate: new Date('2027-01-01'),
        endDate: new Date('2027-03-31'),
      },
      {
        id: crypto.randomUUID(),
        position: 4,
        title: 'Phase 4 — Ecosystem Expansion',
        description: 'Funeral savings, memorial vaults, insurance coordination, wills, estate coordination, and repatriation support.',
        startDate: new Date('2027-04-01'),
        endDate: new Date('2027-06-30'),
      },
    ];

    for (const m of milestoneData) {
      await tx.insert(milestones).values({ ...m, projectId });
    }

    // Create tasks for Milestone 1
    console.log('Creating tasks for Milestone 1 — Trust Infrastructure...');
    const m1Tasks = [
      // Phase 1: Foundation (data model + permissions)
      { position: 1, title: 'Define funeral case data model', description: 'Design the core funeralCases schema — deceased info, funeral dates, assigned family roles, budget, contribution status, vendor assignments, task timelines.', priority: 'urgent' as const, phase: 1 },
      { position: 6, title: 'Implement role-based permissions', description: 'Define and enforce 6 roles: Super Admin, Funeral Coordinator, Family Admin, Family Contributor, Diaspora Sponsor, Vendor. Each role has scoped access to finances, tasks, and vendor data.', priority: 'urgent' as const, phase: 1 },

      // Phase 2: Core APIs (depend on data model)
      { position: 2, title: 'Build funeral case creation API', description: 'POST /api/cases — create a structured funeral case with all required fields. Include validation and role-based access.', priority: 'urgent' as const, phase: 2 },
      { position: 3, title: 'Build contribution infrastructure', description: 'Support MoMo contributions, international payments, contribution confirmations, total tracking, and allocation categories. Integrate MTN MoMo and Paystack/Flutterwave for diaspora.', priority: 'urgent' as const, phase: 2 },
      { position: 4, title: 'Build budget and expense tracking', description: 'Categorised expenses, receipt uploads, pending approvals, allocated vs spent funds, real-time balances per case.', priority: 'high' as const, phase: 2 },
      { position: 9, title: 'Build audit trail system', description: 'Log every action — approvals, uploads, budget changes, payout requests — with user ID, timestamp, and metadata. Immutable log.', priority: 'high' as const, phase: 2 },

      // Phase 3: Workflows (depend on APIs)
      { position: 5, title: 'Build approval engine', description: 'Configurable approval workflows — expense thresholds trigger elder/diaspora/committee approval. Support multi-level approval chains.', priority: 'urgent' as const, phase: 3 },
      { position: 7, title: 'Build vendor assignment system', description: 'Coordinators assign vendors to cases. Vendors accept assignments, track milestones, submit completion evidence, and request payouts. No open marketplace at this stage.', priority: 'high' as const, phase: 3 },
      { position: 8, title: 'Build payment request and disbursement workflow', description: 'Full vendor payout flow: assignment → deposit request → family approval → funds released → completion evidence → final payout approval.', priority: 'urgent' as const, phase: 3 },

      // Phase 4: Integrations (depend on workflows)
      { position: 10, title: 'WhatsApp integration', description: 'Share contribution links, milestone notifications, approval requests, reminders, and payment confirmations via WhatsApp. Platform as coordination layer, WhatsApp as communication layer.', priority: 'high' as const, phase: 4 },
      { position: 11, title: 'MoMo integration', description: 'Integrate MTN MoMo as primary payment rail. Platform sits above MoMo handling governance, tracking, allocation, and transparency.', priority: 'urgent' as const, phase: 4 },
      { position: 12, title: 'International payment integration', description: 'Support diaspora contributions via Paystack, Flutterwave, LemFi, or Stripe. Diaspora trust is core to monetisation.', priority: 'high' as const, phase: 4 },
      { position: 13, title: 'Define monetisation model — Phase 1', description: 'Implement funeral coordination fee (fixed), payment processing margin, and diaspora premium services. Do not build vendor commission or marketplace placement yet.', priority: 'medium' as const, phase: 4 },
    ];

    for (const t of m1Tasks) {
      await tx.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId,
        milestoneId: milestoneData[0].id,
        title: t.title,
        description: t.description,
        status: 'todo',
        priority: t.priority,
        position: t.position,
        phase: t.phase,
        reporterId: admin.id,
        assigneeId: null,
      });
    }

    // Create tasks for Milestone 2
    console.log('Creating tasks for Milestone 2 — Curated Vendor Coordination...');
    const m2Tasks = [
      // Phase 1: Vetting + scoring
      { position: 1, title: 'Build vendor vetting system', description: 'Collect vendor ID, business info, references, service category, geographic area, payout account. Internal vetting flow before activation.', priority: 'high' as const, phase: 1 },
      { position: 2, title: 'Build vendor reliability scoring', description: 'Track punctuality, complaints, cancellations, dispute frequency, completion quality. Internal score — not visible to vendors.', priority: 'medium' as const, phase: 1 },
      { position: 3, title: 'Build preferred vendor program', description: 'Only preferred vendors receive high-trust referrals. Creates quality control and ecosystem discipline.', priority: 'medium' as const, phase: 1 },

      // Phase 2: Packages + portal + tracking
      { position: 4, title: 'Build structured service packages', description: 'Curated funeral packages composed of vetted vendors. Coordinator assigns package to case. Not open marketplace browsing.', priority: 'high' as const, phase: 2 },
      { position: 5, title: 'Vendor portal — scoped access', description: 'Vendors see only: assigned jobs, payout status, task requirements, milestone submissions. No access to case finances or other vendors.', priority: 'high' as const, phase: 2 },
      { position: 6, title: 'Milestone tracking for vendors', description: 'Vendors submit milestone completion evidence. Coordinator reviews. Triggers payout approval workflow.', priority: 'high' as const, phase: 2 },
    ];

    for (const t of m2Tasks) {
      await tx.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId,
        milestoneId: milestoneData[1].id,
        title: t.title,
        description: t.description,
        status: 'todo',
        priority: t.priority,
        position: t.position,
        phase: t.phase,
        reporterId: admin.id,
        assigneeId: null,
      });
    }

    // Create tasks for Milestone 3
    console.log('Creating tasks for Milestone 3 — Managed Coordination Layer...');
    const m3Tasks = [
      // Phase 1: Coordinator assignment + package
      { position: 1, title: 'Human coordinator assignment', description: 'Assign a platform coordinator to each funeral case. Coordinator manages vendor workflow, approvals, and family communication.', priority: 'medium' as const, phase: 1 },
      { position: 2, title: 'Premium coordination package', description: 'Define and sell premium coordination tier — dedicated coordinator, enhanced reporting, priority vendor access, concierge support.', priority: 'medium' as const, phase: 1 },

      // Phase 2: Dashboard + church
      { position: 3, title: 'Coordinator dashboard', description: 'Dashboard for coordinators — active cases, pending approvals, vendor milestones, payout requests, task timelines.', priority: 'high' as const, phase: 2 },
      { position: 4, title: 'Church integration layer', description: 'Church contribution portals, accounting exports, committee access, funeral dashboards. Churches as trust accelerators and distribution channel.', priority: 'medium' as const, phase: 2 },
    ];

    for (const t of m3Tasks) {
      await tx.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId,
        milestoneId: milestoneData[2].id,
        title: t.title,
        description: t.description,
        status: 'todo',
        priority: t.priority,
        position: t.position,
        phase: t.phase,
        reporterId: admin.id,
        assigneeId: null,
      });
    }

    // Create tasks for Milestone 4
    console.log('Creating tasks for Milestone 4 — Ecosystem Expansion...');
    const m4Tasks = [
      // Phase 1: Savings + memorial + insurance
      { position: 1, title: 'Funeral savings product', description: 'Allow families to save toward future funeral costs. Structured savings with contribution tracking and goal targets.', priority: 'low' as const, phase: 1 },
      { position: 2, title: 'Memorial vault', description: 'Digital memorial — photos, tributes, life story, contribution history. Accessible to family and diaspora.', priority: 'low' as const, phase: 1 },
      { position: 3, title: 'Insurance coordination', description: 'Partner with insurance providers for funeral cover. Platform handles coordination and claims tracking, not underwriting.', priority: 'medium' as const, phase: 1 },

      // Phase 2: Wills + repatriation
      { position: 4, title: 'Wills and estate coordination', description: 'Basic will registration and estate coordination tooling. Partner with legal advisors for compliance.', priority: 'low' as const, phase: 2 },
      { position: 5, title: 'Repatriation support', description: 'Coordinate repatriation of remains for diaspora — vendor assignment, document tracking, payout workflow.', priority: 'medium' as const, phase: 2 },
    ];

    for (const t of m4Tasks) {
      await tx.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId,
        milestoneId: milestoneData[3].id,
        title: t.title,
        description: t.description,
        status: 'todo',
        priority: t.priority,
        position: t.position,
        phase: t.phase,
        reporterId: admin.id,
        assigneeId: null,
      });
    }

    const totalTasks = m1Tasks.length + m2Tasks.length + m3Tasks.length + m4Tasks.length;
    console.log(`\n✓ Seed complete!`);
    console.log(`  Project: adinkra-home`);
    console.log(`  Milestones: ${milestoneData.length}`);
    console.log(`  Tasks: ${totalTasks}`);
  });

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
