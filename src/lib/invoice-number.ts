import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function generateInvoiceNumber(): Promise<string> {
  const result = await db
    .select({
      maxNum: sql<string>`MAX(${invoices.invoiceNumber})`,
    })
    .from(invoices)
    .then((rows) => rows[0]);

  const current = result?.maxNum;
  let next = 1;

  if (current) {
    const match = current.match(/INV-(\d+)/);
    if (match) {
      next = parseInt(match[1], 10) + 1;
    }
  }

  return `INV-${String(next).padStart(4, '0')}`;
}
