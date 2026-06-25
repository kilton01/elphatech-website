'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Flag, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  position: number;
  taskCount: number;
  completedTaskCount: number;
};

type UnassignedTask = {
  id: string;
  title: string;
  status: string;
};

function getStatus(m: Milestone): { label: string; className: string } {
  if (m.taskCount > 0 && m.completedTaskCount === m.taskCount) {
    return { label: 'Completed', className: 'bg-success/10 text-success border-success/20' };
  }
  const now = new Date();
  const end = new Date(m.endDate);
  const start = new Date(m.startDate);
  if (end < now) {
    return { label: 'Overdue', className: 'bg-danger/10 text-danger border-danger/20' };
  }
  if (start > now) {
    return { label: 'Upcoming', className: 'bg-info/10 text-info border-info/20' };
  }
  return { label: 'In Progress', className: 'bg-warning/10 text-warning border-warning/20' };
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MilestonesList({
  projectId,
  isAdmin,
}: {
  projectId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignDialogMilestone, setAssignDialogMilestone] = useState<Milestone | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      if (!res.ok) return;
      const data = await res.json();
      setMilestones(data.milestones);
    } catch {} finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  function openCreate() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setDialogOpen(true);
  }

  function openEdit(m: Milestone) {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description ?? '');
    setStartDate(new Date(m.startDate).toISOString().slice(0, 10));
    setEndDate(new Date(m.endDate).toISOString().slice(0, 10));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    setSaving(true);

    try {
      const url = editingId
        ? `/api/projects/${projectId}/milestones/${editingId}`
        : `/api/projects/${projectId}/milestones`;
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startDate,
          endDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save milestone');
      }
      toast.success(editingId ? 'Milestone updated' : 'Milestone created');
      setDialogOpen(false);
      fetchMilestones();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Milestone) {
    const confirmed = window.confirm(
      'Delete this milestone? Tasks will not be deleted but will become unassigned.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${m.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Milestone deleted');
      fetchMilestones();
      router.refresh();
    } catch {
      toast.error('Failed to delete milestone');
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-slate">Loading milestones...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate">
          {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
        </p>
        {isAdmin && (
          <Button size="sm" onClick={openCreate} className="bg-red text-white hover:bg-red2">
            <Plus className="size-4" />New Milestone
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand bg-navy2 py-16">
          <Flag className="mb-2 size-8 text-slate" />
          <p className="text-sm text-slate">No milestones yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m) => {
            const status = getStatus(m);
            const progress = m.taskCount > 0 ? (m.completedTaskCount / m.taskCount) * 100 : 0;

            return (
              <div
                key={m.id}
                className="rounded-xl border border-subtle bg-surface-2 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{m.title}</h3>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0', status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    {m.description && (
                      <p className="mt-1 text-sm text-slate line-clamp-2">{m.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(m)}
                        className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-white/5 hover:text-white"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="flex size-7 items-center justify-center rounded-md text-slate hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate">
                  {formatDate(m.startDate)} → {formatDate(m.endDate)}
                </p>

                <div className="space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate">
                    {m.completedTaskCount} of {m.taskCount} tasks complete
                  </p>
                </div>

                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignDialogMilestone(m)}
                    className="text-xs"
                  >
                    Assign Tasks
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Milestone' : 'New Milestone'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update milestone details.' : 'Create a new project milestone.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ms-title">Title</Label>
                <Input
                  id="ms-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Milestone title"
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ms-desc">Description</Label>
                <Textarea
                  id="ms-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ms-start">Start Date</Label>
                  <Input
                    id="ms-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ms-end">End Date</Label>
                  <Input
                    id="ms-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !title.trim()} className="bg-red text-white hover:bg-red2">
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Tasks Dialog */}
      {assignDialogMilestone && (
        <AssignTasksDialog
          projectId={projectId}
          milestone={assignDialogMilestone}
          onClose={() => {
            setAssignDialogMilestone(null);
            fetchMilestones();
          }}
        />
      )}
    </div>
  );
}

function AssignTasksDialog({
  projectId,
  milestone,
  onClose,
}: {
  projectId: string;
  milestone: Milestone;
  onClose: () => void;
}) {
  const [unassigned, setUnassigned] = useState<UnassignedTask[]>([]);
  const [assigned, setAssigned] = useState<UnassignedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`);
        if (!res.ok) return;
        const tasks = await res.json();
        setUnassigned(tasks.filter((t: any) => !t.milestoneId));
        setAssigned(tasks.filter((t: any) => t.milestoneId === milestone.id));
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, milestone.id]);

  async function assign(taskId: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/milestones/${milestone.id}/tasks`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, assign: true }),
        },
      );
      if (!res.ok) throw new Error();
      const task = unassigned.find((t) => t.id === taskId);
      if (task) {
        setUnassigned((prev) => prev.filter((t) => t.id !== taskId));
        setAssigned((prev) => [...prev, task]);
      }
    } catch {
      toast.error('Failed to assign task');
    }
  }

  async function unassign(taskId: string) {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/milestones/${milestone.id}/tasks`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, assign: false }),
        },
      );
      if (!res.ok) throw new Error();
      const task = assigned.find((t) => t.id === taskId);
      if (task) {
        setAssigned((prev) => prev.filter((t) => t.id !== taskId));
        setUnassigned((prev) => [...prev, task]);
      }
    } catch {
      toast.error('Failed to unassign task');
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Tasks — {milestone.title}</DialogTitle>
          <DialogDescription>
            Click a task to assign it. Use × to remove.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-4 text-sm text-slate">Loading tasks...</p>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {assigned.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate uppercase tracking-wider">Assigned</p>
                {assigned.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-success/20 bg-success/5 px-3 py-2">
                    <span className="text-sm text-white truncate">{t.title}</span>
                    <button
                      onClick={() => unassign(t.id)}
                      className="shrink-0 ml-2 text-slate hover:text-danger"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate uppercase tracking-wider">Unassigned</p>
                {unassigned.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => assign(t.id)}
                    className="flex w-full items-center gap-2 rounded-md border border-subtle px-3 py-2 text-left hover:bg-white/5"
                  >
                    <span className="text-sm text-white truncate flex-1">{t.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {unassigned.length === 0 && assigned.length === 0 && (
              <p className="py-4 text-center text-sm text-slate">No tasks in this project.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
