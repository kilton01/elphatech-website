'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { BadgeCheck, RotateCcw } from 'lucide-react';
import CommentList from './comment-list';

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeName: string | null;
  dueDate: string | null;
  signedOffAt: string | null;
  signedOffByName: string | null;
};

function SignOffActions({
  projectId,
  taskId,
  taskStatus,
  signedOffAt,
  userRole,
}: {
  projectId: string;
  taskId: string;
  taskStatus: string;
  signedOffAt: string | null;
  userRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canSignOff = userRole === 'client' && taskStatus === 'review' && !signedOffAt;
  const canRevoke = userRole === 'admin' && !!signedOffAt;

  async function handleSignOff() {
    const confirmed = window.confirm(
      'Are you sure you want to sign off on this task? This confirms the work is complete and accepted.',
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/signoff`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sign off');
      }
      toast.success('Task signed off successfully');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign off');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    const confirmed = window.confirm(
      "Revoke this sign-off? The task will return to 'review' status.",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/signoff`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke sign-off');
      }
      toast.success('Sign-off revoked');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setLoading(false);
    }
  }

  if (canSignOff) {
    return (
      <Button
        size="sm"
        onClick={handleSignOff}
        disabled={loading}
        className="gap-1 bg-success/10 text-success border border-success/20 hover:bg-success/20"
      >
        <BadgeCheck className="size-3.5" />
        {loading ? 'Signing off…' : 'Sign Off'}
      </Button>
    );
  }

  if (canRevoke) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={handleRevoke}
        disabled={loading}
        className="gap-1 text-warning hover:text-warning hover:bg-warning/10"
      >
        <RotateCcw className="size-3.5" />
        {loading ? 'Revoking…' : 'Revoke Sign-off'}
      </Button>
    );
  }

  return null;
}

export default function TaskDetailDialog({
  open,
  onOpenChange,
  projectId,
  userRole,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userRole: string;
  task: TaskDetail | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [status, setStatus] = useState('todo');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setStatus(task.status);
    setEditing(true);
  }

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            status,
          }),
        },
      );
      if (!res.ok) throw new Error('Failed to update task');
      toast.success('Task updated');
      setEditing(false);
      router.refresh();
    } catch {
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  }

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8">
            {editing ? 'Edit Task' : task.title}
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => v && setPriority(v as typeof priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {task.description && (
              <p className="text-sm text-muted-foreground">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
              <Badge variant="outline">{task.priority}</Badge>
              {task.assigneeName && (
                <Badge variant="secondary">{task.assigneeName}</Badge>
              )}
              {task.dueDate && (
                <Badge variant="secondary">
                  Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Badge>
              )}
              {task.signedOffAt && (
                <Badge variant="secondary" className="gap-1 text-success border-success/20">
                  <BadgeCheck className="size-3" />
                  Signed off by {task.signedOffByName}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={startEdit}>
                Edit
              </Button>
              <SignOffActions
                projectId={projectId}
                taskId={task.id}
                taskStatus={task.status}
                signedOffAt={task.signedOffAt}
                userRole={userRole}
              />
            </div>
          </div>
        )}

        <Separator />

        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">Comments</h4>
          <CommentList projectId={projectId} taskId={task.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
