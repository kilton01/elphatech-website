'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardCheck, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ClientAction = {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedByName: string | null;
  position: number;
  createdAt: string;
};

export default function ClientActions({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [actions, setActions] = useState<ClientAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/client-actions`)
      .then((res) => res.json())
      .then((data) => setActions(data))
      .catch(() => toast.error('Failed to load client actions'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const completedCount = actions.filter((a) => a.isCompleted).length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/client-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const action = await res.json();
      setActions((prev) => [...prev, action]);
      setNewTitle('');
      router.refresh();
    } catch {
      toast.error('Failed to add action');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(action: ClientAction) {
    const newCompleted = !action.isCompleted;
    setActions((prev) =>
      prev.map((a) =>
        a.id === action.id
          ? { ...a, isCompleted: newCompleted, completedAt: newCompleted ? new Date().toISOString() : null }
          : a,
      ),
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/client-actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newCompleted }),
      });
      if (!res.ok) throw new Error('Failed to update');
      router.refresh();
    } catch {
      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id ? { ...a, isCompleted: !newCompleted, completedAt: action.completedAt } : a,
        ),
      );
      toast.error('Failed to update action');
    }
  }

  async function handleDelete(actionId: string) {
    setActions((prev) => prev.filter((a) => a.id !== actionId));
    try {
      const res = await fetch(`/api/projects/${projectId}/client-actions/${actionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
    } catch {
      toast.error('Failed to delete action');
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-brand bg-surface-1 p-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-slate" />
          <h3 className="text-sm font-medium text-white">Client Actions</h3>
        </div>
        <p className="mt-3 text-xs text-slate">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-slate" />
          <h3 className="text-sm font-medium text-white">Client Actions</h3>
          {actions.length > 0 && (
            <span className="text-xs text-slate">
              ({completedCount}/{actions.length} completed)
            </span>
          )}
        </div>
        {actions.length > 0 && (
          <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / actions.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a client action (e.g. Register business)"
            className="flex-1 border-brand bg-surface-0 text-white placeholder:text-tertiary text-sm"
            maxLength={200}
          />
          <Button
            type="submit"
            size="sm"
            disabled={adding || !newTitle.trim()}
            className="gap-1 bg-brand-primary text-white hover:bg-brand-hover"
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </form>
      )}

      {actions.length === 0 ? (
        <p className="text-xs text-slate py-4 text-center">
          {isAdmin
            ? 'Add client actions like "Register business" or "Submit brand assets".'
            : 'No actions required yet.'}
        </p>
      ) : (
        <div className="space-y-1">
          {actions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                action.isCompleted ? 'bg-green-500/5' : 'hover:bg-white/[0.03]',
              )}
            >
              <button
                onClick={() => handleToggle(action)}
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded border transition-all',
                  action.isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-white/30 hover:border-white/50',
                )}
              >
                {action.isCompleted && <Check className="size-3" />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm transition-colors',
                    action.isCompleted ? 'text-slate line-through' : 'text-white',
                  )}
                >
                  {action.title}
                </p>
                {action.isCompleted && action.completedAt && (
                  <p className="text-[10px] text-slate mt-0.5">
                    Completed{action.completedByName ? ` by ${action.completedByName}` : ''}{' '}
                    {new Date(action.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {isAdmin && (
                <button
                  onClick={() => handleDelete(action.id)}
                  className="flex size-6 items-center justify-center rounded text-transparent group-hover:text-slate hover:!text-danger transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
