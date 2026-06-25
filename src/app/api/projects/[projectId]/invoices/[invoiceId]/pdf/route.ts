import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { invoices, invoiceItems, projects, milestones, projectMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/invoice-pdf';

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

  const project = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .then((rows) => rows[0]);

  const milestoneTitle = invoice.milestoneId
    ? await db
        .select({ title: milestones.title })
        .from(milestones)
        .where(eq(milestones.id, invoice.milestoneId))
        .then((rows) => rows[0]?.title ?? null)
    : null;

  const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  const buffer = await renderToBuffer(
    InvoicePDF({
      data: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        currency: invoice.currency,
        notes: invoice.notes,
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        dueAt: invoice.dueAt?.toISOString() ?? null,
        projectName: project?.name || 'Project',
        milestoneTitle,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.amount,
        })),
        total,
      },
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ElphaTech-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
