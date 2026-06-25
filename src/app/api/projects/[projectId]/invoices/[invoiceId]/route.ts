import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { invoices, invoiceItems, projectMembers, activities, projects, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createBulkNotifications } from '@/lib/notifications';

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
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, invoiceId } = await context.params;
  const isMember = await checkMembership(projectId, session.user.id, session.user.role);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const invoice = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (session.user.role !== 'admin' && invoice.status === 'draft') {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(invoiceItems.position);

  const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  return NextResponse.json({ ...invoice, items, total });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, invoiceId } = await context.params;

  const invoice = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.status === 'paid') {
    return NextResponse.json({ error: 'Paid invoices cannot be modified.' }, { status: 400 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  // Status transitions
  if (body.status !== undefined && body.status !== invoice.status) {
    if (invoice.status === 'sent' && body.status === 'draft') {
      return NextResponse.json({ error: 'Sent invoices cannot be reverted to draft.' }, { status: 400 });
    }

    if (body.status === 'sent' && invoice.status === 'draft') {
      updateData.status = 'sent';
      updateData.issuedAt = new Date();
    } else if (body.status === 'paid' && invoice.status === 'sent') {
      updateData.status = 'paid';
      updateData.paidAt = new Date();
    } else {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }
  }

  if (body.milestoneId !== undefined) updateData.milestoneId = body.milestoneId || null;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
  if (body.dueAt !== undefined) updateData.dueAt = body.dueAt ? new Date(body.dueAt) : null;

  // Update items if provided and invoice is draft
  if (body.items && Array.isArray(body.items)) {
    if (invoice.status !== 'draft' && !updateData.status) {
      return NextResponse.json({ error: 'Cannot edit items on sent or paid invoices.' }, { status: 400 });
    }

    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const amount = (item.quantity * item.unitPrice).toFixed(2);
      await db.insert(invoiceItems).values({
        invoiceId,
        description: item.description.trim(),
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        amount,
        position: i,
      });
    }
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(invoices).set(updateData).where(eq(invoices.id, invoiceId));
  }

  // Post-transition effects
  if (updateData.status === 'sent') {
    // Notify clients
    try {
      const members = await db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .where(and(eq(projectMembers.projectId, projectId), eq(users.role, 'client')));
      const clientIds = members.map((m) => m.userId);

      const project = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .then((rows) => rows[0]);

      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));
      const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      await createBulkNotifications(clientIds, {
        projectId,
        type: 'invoice_sent',
        title: 'New invoice from ElphaTech Solutions',
        body: `Invoice ${invoice.invoiceNumber} for ${project?.name || 'your project'} has been issued. Total: ${invoice.currency} ${total.toFixed(2)}.`,
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  if (updateData.status === 'paid') {
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));
    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    await db.insert(activities).values({
      projectId,
      userId: session.user.id,
      action: 'invoice_paid',
      metadata: { invoiceNumber: invoice.invoiceNumber, total: total.toFixed(2) },
    });
  }

  // Return updated invoice
  const updated = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((rows) => rows[0]);

  const finalItems = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(invoiceItems.position);

  const total = finalItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  return NextResponse.json({ ...updated, items: finalItems, total });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, invoiceId } = await context.params;

  const invoice = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.projectId, projectId)))
    .then((rows) => rows[0]);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft invoices can be deleted.' }, { status: 400 });
  }

  await db.delete(invoices).where(eq(invoices.id, invoiceId));

  return NextResponse.json({ success: true });
}
