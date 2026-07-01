'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, EyeOff, GripVertical, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TabKey = 'testimonials' | 'case-studies' | 'technologies';

const TABS: { label: string; value: TabKey }[] = [
  { label: 'Testimonials', value: 'testimonials' },
  { label: 'Case Studies', value: 'case-studies' },
  { label: 'Technologies', value: 'technologies' },
];

type Testimonial = {
  id: string;
  quote: string;
  clientLabel: string;
  industry: string | null;
  clientSince: string | null;
  rating: number;
  position: number;
  status: 'draft' | 'published';
};

type CaseStudy = {
  id: string;
  category: string;
  title: string;
  description: string;
  outcome: string;
  position: number;
  status: 'draft' | 'published';
};

type Technology = {
  id: string;
  name: string;
  position: number;
  status: 'draft' | 'published';
};

export default function MarketingView() {
  const [activeTab, setActiveTab] = useState<TabKey>('testimonials');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing/${activeTab}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (activeTab === 'testimonials') setTestimonials(data.testimonials);
      else if (activeTab === 'case-studies') setCaseStudies(data.caseStudies);
      else setTechnologies(data.technologies);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handlePublish(id: string, action: 'publish' | 'unpublish') {
    const collection = activeTab === 'case-studies' ? 'case-studies' : activeTab;
    const res = await fetch(`/api/admin/marketing/${collection}/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { toast.error('Failed to update status'); return; }
    toast.success(action === 'publish' ? 'Published' : 'Unpublished');
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/api/admin/marketing/${activeTab}/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    fetchData();
  }

  async function handleRevalidate() {
    setRevalidating(true);
    try {
      const res = await fetch('/api/admin/marketing/revalidate', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Marketing site cache cleared');
    } catch {
      toast.error('Revalidation failed');
    } finally {
      setRevalidating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Marketing Content</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/30 hover:bg-white/10"
            onClick={handleRevalidate}
            disabled={revalidating}
          >
            <RefreshCw className={cn('size-4 mr-1.5', revalidating && 'animate-spin')} />
            Revalidate
          </Button>
          <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); }}>
            <Plus className="size-4 mr-1.5" />
            Add New
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setShowForm(false); setEditingId(null); }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.value
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <FormPanel
          tab={activeTab}
          editingId={editingId}
          testimonials={testimonials}
          caseStudies={caseStudies}
          technologies={technologies}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { setShowForm(false); setEditingId(null); fetchData(); }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'testimonials' && testimonials.map((t) => (
            <ItemCard key={t.id} status={t.status} position={t.position}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] font-medium truncate">{t.clientLabel}</p>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">{t.quote}</p>
              </div>
              <ItemActions
                status={t.status}
                onPublish={() => handlePublish(t.id, t.status === 'published' ? 'unpublish' : 'publish')}
                onEdit={() => { setEditingId(t.id); setShowForm(true); }}
                onDelete={() => handleDelete(t.id)}
              />
            </ItemCard>
          ))}
          {activeTab === 'case-studies' && caseStudies.map((cs) => (
            <ItemCard key={cs.id} status={cs.status} position={cs.position}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1.5 py-0.5 rounded">
                    {cs.category}
                  </span>
                  <p className="text-sm text-[var(--text-primary)] font-medium truncate">{cs.title}</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5">{cs.description}</p>
              </div>
              <ItemActions
                status={cs.status}
                onPublish={() => handlePublish(cs.id, cs.status === 'published' ? 'unpublish' : 'publish')}
                onEdit={() => { setEditingId(cs.id); setShowForm(true); }}
                onDelete={() => handleDelete(cs.id)}
              />
            </ItemCard>
          ))}
          {activeTab === 'technologies' && technologies.map((tech) => (
            <ItemCard key={tech.id} status={tech.status} position={tech.position}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] font-medium">{tech.name}</p>
              </div>
              <ItemActions
                status={tech.status}
                onPublish={() => handlePublish(tech.id, tech.status === 'published' ? 'unpublish' : 'publish')}
                onEdit={() => { setEditingId(tech.id); setShowForm(true); }}
                onDelete={() => handleDelete(tech.id)}
              />
            </ItemCard>
          ))}
          {!loading && getItems().length === 0 && (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              No items yet. Click &quot;Add New&quot; to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );

  function getItems() {
    if (activeTab === 'testimonials') return testimonials;
    if (activeTab === 'case-studies') return caseStudies;
    return technologies;
  }
}

function ItemCard({ children, status, position }: { children: React.ReactNode; status: string; position: number }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-lg border transition-colors',
      status === 'published'
        ? 'border-[var(--border)] bg-[var(--surface-1)]'
        : 'border-dashed border-[var(--border)] bg-[var(--surface-0)]/50 opacity-75',
    )}>
      <div className="flex items-center gap-2 text-slate">
        <GripVertical className="size-4" />
        <span className="text-xs font-mono w-5 text-center">{position}</span>
      </div>
      {children}
    </div>
  );
}

function ItemActions({ status, onPublish, onEdit, onDelete }: {
  status: string;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={onPublish}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          status === 'published'
            ? 'text-green-400 hover:bg-green-500/10'
            : 'text-slate hover:bg-white/10',
        )}
        title={status === 'published' ? 'Unpublish' : 'Publish'}
      >
        {status === 'published' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
      <button onClick={onEdit} className="p-1.5 rounded-md text-slate hover:bg-white/10 hover:text-white transition-colors" title="Edit">
        <Pencil className="size-4" />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-md text-slate hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function FormPanel({ tab, editingId, testimonials, caseStudies, technologies, onClose, onSaved }: {
  tab: TabKey;
  editingId: string | null;
  testimonials: Testimonial[];
  caseStudies: CaseStudy[];
  technologies: Technology[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const existing = editingId
    ? tab === 'testimonials' ? testimonials.find((t) => t.id === editingId)
      : tab === 'case-studies' ? caseStudies.find((cs) => cs.id === editingId)
        : technologies.find((t) => t.id === editingId)
    : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};

    if (tab === 'testimonials') {
      body.quote = formData.get('quote');
      body.clientLabel = formData.get('clientLabel');
      body.industry = formData.get('industry') || null;
      body.clientSince = formData.get('clientSince') || null;
      body.rating = Number(formData.get('rating')) || 5;
    } else if (tab === 'case-studies') {
      body.category = formData.get('category');
      body.title = formData.get('title');
      body.description = formData.get('description');
      body.outcome = formData.get('outcome');
    } else {
      body.name = formData.get('name');
    }

    try {
      const url = editingId
        ? `/api/admin/marketing/${tab}/${editingId}`
        : `/api/admin/marketing/${tab}`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      toast.success(editingId ? 'Updated' : 'Created');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {editingId ? 'Edit' : 'New'} {tab === 'case-studies' ? 'Case Study' : tab === 'testimonials' ? 'Testimonial' : 'Technology'}
        </h3>
        <button type="button" onClick={onClose} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Cancel
        </button>
      </div>

      {tab === 'testimonials' && (
        <>
          <Field label="Quote" name="quote" required multiline defaultValue={(existing as Testimonial | undefined)?.quote} />
          <Field label="Client Label" name="clientLabel" required defaultValue={(existing as Testimonial | undefined)?.clientLabel} placeholder="e.g. Confidential — Logistics & Storage" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry" name="industry" defaultValue={(existing as Testimonial | undefined)?.industry ?? ''} />
            <Field label="Client Since" name="clientSince" defaultValue={(existing as Testimonial | undefined)?.clientSince ?? ''} placeholder="e.g. 2026" />
          </div>
          <Field label="Rating (1-5)" name="rating" type="number" defaultValue={String((existing as Testimonial | undefined)?.rating ?? 5)} />
        </>
      )}

      {tab === 'case-studies' && (
        <>
          <Field label="Category" name="category" required defaultValue={(existing as CaseStudy | undefined)?.category} placeholder="e.g. Website Security" />
          <Field label="Title" name="title" required defaultValue={(existing as CaseStudy | undefined)?.title} />
          <Field label="Description" name="description" required multiline defaultValue={(existing as CaseStudy | undefined)?.description} />
          <Field label="Outcome" name="outcome" required defaultValue={(existing as CaseStudy | undefined)?.outcome} />
        </>
      )}

      {tab === 'technologies' && (
        <Field label="Name" name="name" required defaultValue={(existing as Technology | undefined)?.name} placeholder="e.g. TypeScript" />
      )}

      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
      </Button>
    </form>
  );
}

function Field({ label, name, required, multiline, defaultValue, placeholder, type }: {
  label: string;
  name: string;
  required?: boolean;
  multiline?: boolean;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  const cls = 'w-full rounded-md border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]';
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      {multiline ? (
        <textarea name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} rows={3} className={cn(cls, 'resize-y')} />
      ) : (
        <input name={name} type={type || 'text'} required={required} defaultValue={defaultValue} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
