'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Send, Check, Download, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import InvoiceModal from './invoice-modal';

type InvoiceItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  position: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid';
  currency: string;
  notes: string | null;
  milestoneId: string | null;
  milestoneTitle: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: InvoiceItem[];
  total: number;
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-slate/10 text-slate border-slate/20' },
  sent: { label: 'Sent', className: 'bg-info/10 text-info border-info/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
};

export default function InvoicesList({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/invoices`);
      if (!res.ok) return;
      const data = await res.json();
      setInvoices(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function handleSend(inv: Invoice) {
    if (!window.confirm(`Send invoice ${inv.invoiceNumber} to the client? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
      toast.success('Invoice sent to client');
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invoice');
    }
  }

  async function handleMarkPaid(inv: Invoice) {
    if (!window.confirm(`Mark invoice ${inv.invoiceNumber} as paid?`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast.success('Invoice marked as paid');
      fetchInvoices();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as paid');
    }
  }

  async function handleDelete(inv: Invoice) {
    if (!window.confirm(`Delete draft invoice ${inv.invoiceNumber}?`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/invoices/${inv.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function handleDownload(inv: Invoice) {
    window.open(`/api/projects/${projectId}/invoices/${inv.id}/pdf`, '_blank');
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate">Loading invoices...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate">
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </p>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => { setEditingInvoice(null); setModalOpen(true); }}
            className="bg-red text-white hover:bg-red2"
          >
            <Plus className="size-4" />New Invoice
          </Button>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand bg-navy2 py-16">
          <Receipt className="mb-2 size-8 text-slate" />
          <p className="text-sm text-slate">
            {isAdmin ? 'No invoices yet.' : 'No invoices have been issued for this project yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand bg-surface-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand text-left text-xs text-slate">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Milestone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const status = statusConfig[inv.status];
                return (
                  <tr key={inv.id} className="border-b border-brand/50">
                    <td className="px-4 py-3 font-medium text-white">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate">{inv.milestoneTitle || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-[10px]', status.className)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="px-4 py-3 text-slate">{formatDate(inv.issuedAt)}</td>
                    <td className="px-4 py-3 text-slate">{formatDate(inv.dueAt)}</td>
                    <td className="px-4 py-3 text-slate">{formatDate(inv.paidAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isAdmin && inv.status === 'draft' && (
                          <>
                            <button
                              onClick={() => { setEditingInvoice(inv); setModalOpen(true); }}
                              className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-white/5 hover:text-white"
                              title="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleSend(inv)}
                              className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-info/10 hover:text-info"
                              title="Send"
                            >
                              <Send className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(inv)}
                              className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-danger/10 hover:text-danger"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                        {isAdmin && inv.status === 'sent' && (
                          <button
                            onClick={() => handleMarkPaid(inv)}
                            className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-success/10 hover:text-success"
                            title="Mark as Paid"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                        {inv.status !== 'draft' && (
                          <button
                            onClick={() => handleDownload(inv)}
                            className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-white/5 hover:text-white"
                            title="Download PDF"
                          >
                            <Download className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <InvoiceModal
          projectId={projectId}
          invoice={editingInvoice}
          onClose={() => { setModalOpen(false); setEditingInvoice(null); }}
          onSaved={() => { setModalOpen(false); setEditingInvoice(null); fetchInvoices(); }}
        />
      )}
    </div>
  );
}
