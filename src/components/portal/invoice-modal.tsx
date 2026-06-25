'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type LineItem = {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type Milestone = {
  id: string;
  title: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid';
  currency: string;
  notes: string | null;
  milestoneId: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: { id: string; description: string; quantity: string; unitPrice: string; amount: string; position: number }[];
  total: number;
};

export default function InvoiceModal({
  projectId,
  invoice,
  onClose,
  onSaved,
}: {
  projectId: string;
  invoice: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!invoice;
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneId, setMilestoneId] = useState(invoice?.milestoneId || '');
  const [currency, setCurrency] = useState(invoice?.currency || 'USD');
  const [dueAt, setDueAt] = useState(invoice?.dueAt?.split('T')[0] || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [items, setItems] = useState<LineItem[]>(
    invoice?.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) || [{ description: '', quantity: '1', unitPrice: '' }],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/milestones`)
      .then((r) => r.json())
      .then((data) => setMilestones(Array.isArray(data) ? data : data.milestones || []))
      .catch(() => {});
  }, [projectId]);

  function addItem() {
    setItems([...items, { description: '', quantity: '1', unitPrice: '' }]);
  }

  function removeItem(idx: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function getLineTotal(item: LineItem): number {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  }

  function getTotal(): number {
    return items.reduce((sum, item) => sum + getLineTotal(item), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      milestoneId: milestoneId || null,
      currency,
      notes: notes.trim() || null,
      dueAt: dueAt || null,
      items: items.map((item) => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
      })),
    };

    try {
      const url = isEditing
        ? `/api/projects/${projectId}/invoices/${invoice.id}`
        : `/api/projects/${projectId}/invoices`;

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...payload, items: payload.items } : payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(isEditing ? 'Invoice updated' : 'Invoice created');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand bg-surface-2 p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-slate hover:bg-white/5 hover:text-white"
        >
          <X className="size-4" />
        </button>

        <h2 className="mb-6 text-lg font-semibold text-white">
          {isEditing ? `Edit ${invoice.invoiceNumber}` : 'New Invoice'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate">Milestone (optional)</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="h-9 w-full rounded-md border border-brand bg-surface-0 px-3 text-sm text-white"
              >
                <option value="">None</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-full rounded-md border border-brand bg-surface-0 px-3 text-sm text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate">Due Date (optional)</label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="border-brand bg-surface-0 text-white"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate">Line Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-info hover:bg-info/10"
              >
                <Plus className="size-3" /> Add item
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 text-[10px] font-medium uppercase text-slate">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Amount</span>
                <span />
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Description"
                    required
                    className="border-brand bg-surface-0 text-white text-sm"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    min="0.01"
                    step="0.01"
                    required
                    className="border-brand bg-surface-0 text-white text-sm"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="border-brand bg-surface-0 text-white text-sm"
                  />
                  <div className="flex h-9 items-center rounded-md border border-brand bg-surface-0 px-3 text-sm text-white">
                    {getLineTotal(item).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="flex size-9 items-center justify-center rounded-md text-slate hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-brand pt-3">
              <div className="text-sm font-medium text-white">
                Total: {currency} {getTotal().toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, etc."
              rows={3}
              className="border-brand bg-surface-0 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-red text-white hover:bg-red2"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Invoice' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
