'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
import { Plus, BadgeCheck, Layers, Lock, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const KanbanDndView = dynamic(() => import('./kanban-dnd-view'), { ssr: false });

type MilestoneInfo = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
};

const COLUMNS = [
  { id: 'todo', label: 'Todo', accent: 'bg-info' },
  { id: 'in_progress', label: 'In Progress', accent: 'bg-warning' },
  { id: 'review', label: 'Review', accent: 'bg-purple-500' },
  { id: 'done', label: 'Done', accent: 'bg-success' },
] as const;

type ColumnId = (typeof COLUMNS)[number]['id'];

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeName?: string | null;
  status: string;
  position: number;
  phase: number;
  isReady: boolean;
  dueDate: string | null;
  signedOffAt: string | null;
  signedOffByName: string | null;
  milestoneId: string | null;
};

type ColumnState = Record<ColumnId, Task[]>;

function buildColumns(tasks: Task[]): ColumnState {
  const state: ColumnState = { todo: [], in_progress: [], review: [], done: [] };
  for (const task of tasks) {
    const col = state[task.status as ColumnId];
    if (col) col.push(task);
  }
  for (const col of Object.values(state)) {
    col.sort((a, b) => a.position - b.position);
  }
  return state;
}

const priorityConfig = {
  low: { label: 'Low', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const;

export default function KanbanBoard({
  projectId,
  tasks: serverTasks,
  milestones = [],
  userRole,
}: {
  projectId: string;
  tasks: Task[];
  milestones?: MilestoneInfo[];
  userRole: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<ColumnState>(() => buildColumns(serverTasks));
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [phase, setPhase] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [inlineColumn, setInlineColumn] = useState<string | null>(null);
  type ViewMode = 'kanban' | 'milestone' | 'upnext';
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const prevServerRef = useRef(serverTasks);

  // Sync from server only when server data actually changes (for non-DnD views)
  useEffect(() => {
    if (prevServerRef.current !== serverTasks) {
      prevServerRef.current = serverTasks;
      if (viewMode !== 'kanban') {
        setColumns(buildColumns(serverTasks));
      }
    }
  }, [serverTasks, viewMode]);

  const totalTasks = Object.values(columns).flat().length;

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
          phase,
        }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      toast.success('Task created');
      setOpen(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setPhase(1);
      router.refresh();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate">
          {totalTasks} task{totalTasks !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          {milestones.length > 0 && (
            <>
              <Button
                size="sm"
                variant={viewMode === 'milestone' ? 'default' : 'outline'}
                onClick={() => setViewMode(viewMode === 'milestone' ? 'kanban' : 'milestone')}
                className={cn(
                  'gap-1.5 text-xs',
                  viewMode === 'milestone' && 'bg-brand-muted text-red border-red/20',
                )}
              >
                <Layers className="size-3.5" />
                Milestones
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'upnext' ? 'default' : 'outline'}
                onClick={() => setViewMode(viewMode === 'upnext' ? 'kanban' : 'upnext')}
                className={cn(
                  'gap-1.5 text-xs',
                  viewMode === 'upnext' && 'bg-brand-muted text-red border-red/20',
                )}
              >
                <CircleDot className="size-3.5" />
                Up Next
              </Button>
            </>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-red text-white hover:bg-red2" />}>
              <Plus className="size-4" />Add Task
            </DialogTrigger>
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
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    maxLength={5000}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="phase">Phase</Label>
                  <Input
                    id="phase"
                    type="number"
                    min={1}
                    max={10}
                    value={phase}
                    onChange={(e) => setPhase(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving || !title.trim()} className="bg-red text-white hover:bg-red2">
                  {saving ? 'Creating...' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {viewMode === 'upnext' ? (
        <div className="space-y-4">
          <p className="text-xs text-slate px-1">Tasks ready to start — all prerequisites complete.</p>
          {milestones.map((m) => {
            const readyTasks = serverTasks.filter(
              (t) => t.milestoneId === m.id && t.isReady && t.status !== 'done'
            );
            if (readyTasks.length === 0) return null;

            return (
              <div key={m.id} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    Phase {Math.min(...readyTasks.map(t => t.phase))}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {readyTasks.sort((a, b) => a.phase - b.phase || a.position - b.position).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                      className="rounded-lg border border-subtle bg-surface-2 p-3 text-left hover:border-strong transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-[10px]', priorityConfig[task.priority].className)}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                        <span className="text-[10px] text-tertiary">Phase {task.phase}</span>
                        {task.assigneeName && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-brand-muted text-[9px] font-medium text-red">
                            {task.assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {serverTasks.filter(t => t.isReady && t.status !== 'done' && !t.milestoneId).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate px-1">Unassigned</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {serverTasks.filter(t => t.isReady && t.status !== 'done' && !t.milestoneId).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                    className="rounded-lg border border-subtle bg-surface-2 p-3 text-left hover:border-strong transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px]', priorityConfig[task.priority].className)}>
                        {priorityConfig[task.priority].label}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {serverTasks.filter(t => t.isReady && t.status !== 'done').length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-brand bg-surface-1 py-16">
              <BadgeCheck className="mb-2 size-8 text-success" />
              <p className="text-sm text-slate">All current phase tasks are complete. Next phase unlocked!</p>
            </div>
          )}
        </div>
      ) : viewMode === 'milestone' ? (
        <div className="space-y-8">
          {milestones.map((m) => {
            const milestoneTasks = serverTasks.filter((t) => t.milestoneId === m.id);
            if (milestoneTasks.length === 0) return null;

            const phases = [...new Set(milestoneTasks.map(t => t.phase))].sort((a, b) => a - b);

            return (
              <div key={m.id} className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                  <span className="text-xs text-slate">
                    {new Date(m.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {phases.map((phase) => {
                  const phaseTasks = milestoneTasks.filter(t => t.phase === phase);
                  const isPhaseReady = phaseTasks.some(t => t.isReady);
                  const isPhaseComplete = phaseTasks.every(t => t.status === 'done');

                  return (
                    <div key={phase} className={cn('rounded-lg border p-3', isPhaseReady ? 'border-subtle bg-surface-1' : 'border-subtle/50 bg-surface-0/50')}>
                      <div className="mb-2 flex items-center gap-2">
                        {isPhaseComplete ? (
                          <BadgeCheck className="size-4 text-success" />
                        ) : isPhaseReady ? (
                          <div className="size-4 rounded-full border-2 border-brand-primary" />
                        ) : (
                          <Lock className="size-4 text-tertiary" />
                        )}
                        <span className="text-xs font-medium text-slate">
                          Phase {phase}
                        </span>
                        <span className="text-xs text-tertiary">
                          ({phaseTasks.filter(t => t.status === 'done').length}/{phaseTasks.length} done)
                        </span>
                      </div>

                      <div className={cn('grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4', !isPhaseReady && 'opacity-50')}>
                        {COLUMNS.map((col) => {
                          const colTasks = phaseTasks.filter((t) => t.status === col.id);
                          if (colTasks.length === 0) return null;
                          return (
                            <div key={col.id} className="space-y-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className={`h-2 w-0.5 rounded-full ${col.accent}`} />
                                <span className="text-[10px] font-medium text-tertiary">{col.label}</span>
                              </div>
                              {colTasks.map((task) => (
                                <button
                                  key={task.id}
                                  onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                                  className="w-full rounded-md border border-subtle bg-surface-2 p-2 text-left text-xs hover:border-strong"
                                >
                                  <p className="font-medium text-white truncate">{task.title}</p>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <Badge variant="outline" className={cn('text-[9px]', priorityConfig[task.priority].className)}>
                                      {priorityConfig[task.priority].label}
                                    </Badge>
                                    {!task.isReady && <Lock className="size-3 text-tertiary" />}
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Unassigned tasks */}
          {(() => {
            const unassigned = serverTasks.filter((t) => !t.milestoneId);
            if (unassigned.length === 0) return null;
            return (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate px-1">Unassigned</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {COLUMNS.map((col) => {
                    const colTasks = unassigned.filter((t) => t.status === col.id);
                    return (
                      <div key={col.id} className="rounded-lg bg-surface-1 p-2">
                        <div className="mb-2 flex items-center gap-1.5">
                          <div className={`h-3 w-0.5 rounded-full ${col.accent}`} />
                          <span className="text-xs font-medium text-slate">{col.label} ({colTasks.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {colTasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                              className="w-full rounded-md border border-subtle bg-surface-2 p-2 text-left text-xs hover:border-strong"
                            >
                              <p className="font-medium text-white truncate">{task.title}</p>
                              <Badge variant="outline" className={cn('mt-1 text-[9px]', priorityConfig[task.priority].className)}>
                                {priorityConfig[task.priority].label}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <KanbanDndView
          projectId={projectId}
          tasks={serverTasks}
          milestones={milestones}
          columns={columns}
          setColumns={setColumns}
          inlineColumn={inlineColumn}
          setInlineColumn={setInlineColumn}
          onTaskClick={(task) => {
            setSelectedTask(task);
            setDetailOpen(true);
          }}
        />
      )}

      <TaskDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        projectId={projectId}
        userRole={userRole}
        task={selectedTask ? {
          id: selectedTask.id,
          title: selectedTask.title,
          description: selectedTask.description,
          status: selectedTask.status,
          priority: selectedTask.priority,
          phase: selectedTask.phase,
          assigneeName: selectedTask.assigneeName ?? null,
          dueDate: selectedTask.dueDate,
          signedOffAt: selectedTask.signedOffAt,
          signedOffByName: selectedTask.signedOffByName,
        } : null}
      />
    </div>
  );
}
