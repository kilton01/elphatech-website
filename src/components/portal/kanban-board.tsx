'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from '@/components/portal/task-card';
import TaskDetailDialog from '@/components/portal/task-detail-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const columns = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
] as const;

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeName?: string | null;
  status: string;
  position: number;
  dueDate: string | null;
};

export default function KanbanBoard({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: Task[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const columnTasks = columns.reduce(
    (acc, col) => {
      acc[col.id] = tasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newStatus: string;
    let newPosition: number;

    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      newStatus = overTask.status;
      newPosition = overTask.position;
    } else {
      newStatus = over.id as string;
      const targetTasks = columnTasks[newStatus] ?? [];
      newPosition = targetTasks.length;
    }

    fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, position: newPosition }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update task');
        router.refresh();
      })
      .catch(() => toast.error('Failed to move task'));
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      toast.success('Task created');
      setOpen(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      router.refresh();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="size-4" />Add Task</Button>} />
          <DialogContent>
            <form onSubmit={handleAddTask}>
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
                <DialogDescription>Add a task to this project.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => v && setPriority(v as 'low' | 'medium' | 'high' | 'urgent')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => {
            const items = columnTasks[col.id] ?? [];
            return (
              <div key={col.id} className="rounded-xl border bg-muted/30 p-3">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {col.label}
                  <span className="ml-2 text-muted-foreground font-normal">{items.length}</span>
                </h3>
                <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 min-h-20">
                    {items.map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        priority={task.priority}
                        assigneeName={task.assigneeName}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      <TaskDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        projectId={projectId}
        task={selectedTask ? {
          id: selectedTask.id,
          title: selectedTask.title,
          description: selectedTask.description,
          status: selectedTask.status,
          priority: selectedTask.priority,
          assigneeName: selectedTask.assigneeName ?? null,
          dueDate: selectedTask.dueDate,
        } : null}
      />
    </div>
  );
}
