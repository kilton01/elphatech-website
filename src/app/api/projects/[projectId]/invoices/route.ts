import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { invoices, invoiceItems, projectMembers, activities, milestones, users } from '@/lib/db/schema';
import { eq, and, desc, ne, sql, inArray } from 'drizzle-orm';
import { generateInvoiceNumber } from '@/lib/invoice-number';

async function checkMembership(projectId: string, userId: string, role: string) {
  if (role === 'admin') return true;
  const member = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .then((rows) => rows[0]);
  return !!member;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id, session.user.role);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isAdmin = session.user.role === 'admin';

  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(
      isAdmin
        ? eq(invoices.projectId, projectId)
        : and(eq(invoices.projectId, projectId), ne(invoices.status, 'draft')),
    )
    .orderBy(desc(invoices.createdAt));

  if (invoiceRows.length === 0) {
    return NextResponse.json([]);
  }

  const invoiceIds = invoiceRows.map((i) => i.id);
  const milestoneIds = invoiceRows
    .map((i) => i.milestoneId)
    .filter((id): id is string => id !== null);

  const [allItems, milestoneRows] = await Promise.all([
    db.select()
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, invoiceIds))
      .orderBy(invoiceItems.position),
    milestoneIds.length > 0
      ? db.select({ id: milestones.id, title: milestones.title })
          .from(milestones)
          .where(inArray(milestones.id, milestoneIds))
      : Promise.resolve([]),
  ]);

  const itemsByInvoice = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const existing = itemsByInvoice.get(item.invoiceId);
    if (existing) {
      existing.push(item);
    } else {
      itemsByInvoice.set(item.invoiceId, [item]);
    }
  }

  const milestoneMap = new Map(milestoneRows.map((m) => [m.id, m.title]));

  const result = invoiceRows.map((inv) => {
    const items = itemsByInvoice.get(inv.id) ?? [];
    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const milestoneTitle = inv.milestoneId ? (milestoneMap.get(inv.milestoneId) ?? null) : null;
    return { ...inv, items, total, milestoneTitle };
  });

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = await request.json();
  const { milestoneId, currency, notes, dueAt, items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
  }

  for (const item of items) {
    if (!item.description || typeof item.description !== 'string' || !item.description.trim()) {
      return NextResponse.json({ error: 'All items must have a description' }, { status: 400 });
    }
    if (!item.quantity || item.quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }
    if (!item.unitPrice || item.unitPrice <= 0) {
      return NextResponse.json({ error: 'Unit price must be greater than 0' }, { status: 400 });
    }
  }

  const invoiceNumber = await generateInvoiceNumber();

  const result = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values({
        projectId,
        milestoneId: milestoneId || null,
        invoiceNumber,
        status: 'draft',
        currency: currency || 'USD',
        notes: notes?.trim() || null,
        dueAt: dueAt ? new Date(dueAt) : null,
      })
      .returning();

    const insertedItems = await tx
      .insert(invoiceItems)
      .values(
        items.map((item: any, idx: number) => ({
          invoiceId: invoice.id,
          description: item.description.trim(),
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          amount: (item.quantity * item.unitPrice).toFixed(2),
          position: idx,
        })),
      )
      .returning();

    const total = insertedItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    await tx.insert(activities).values({
      projectId,
      userId: session.user.id,
      action: 'invoice_created',
      metadata: { invoiceNumber, total: total.toFixed(2) },
    });

    return { ...invoice, items: insertedItems, total };
  });

  return NextResponse.json(result, { status: 201 });
}
