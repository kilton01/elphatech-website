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
import CommentList from './comment-list';

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeName: string | null;
  dueDate: string | null;
};

export default function TaskDetailDialog({
  open,
  onOpenChange,
  projectId,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
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
      <DialogContent className="max-w-lg">
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
            </div>
            <Button variant="outline" size="sm" onClick={startEdit}>
              Edit
            </Button>
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
