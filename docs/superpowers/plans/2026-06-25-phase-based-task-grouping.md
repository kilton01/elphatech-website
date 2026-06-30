# Phase-Based Task Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `phase` integer column to tasks so that within a milestone, tasks are grouped into execution phases. A task is "ready" (actionable) only when all tasks in lower-numbered phases within the same milestone are done. The UI surfaces this grouping with lock/unlock indicators and an "Up Next" view.

**Architecture:** Tasks gain an integer `phase` column (default 1). Readiness is derived at query time — no separate state to keep in sync. The existing Kanban board's "Group by Milestone" mode is enhanced to sub-group by phase. A new "Up Next" view filters to only ready tasks across all milestones. Admin can set phase via task detail dialog or a bulk assignment UI on the milestone page.

**Tech Stack:** Drizzle ORM (schema + migration), Next.js App Router API routes, React client components (existing patterns), Tailwind v4 utility classes.

## Global Constraints

- Next.js 16 with App Router — all route params are `Promise<{...}>`, must await.
- Drizzle ORM with postgres-js driver. Migrations via `npm run db:generate` then `npm run db:push`.
- Auth via NextAuth v5 JWT. API routes use `const session = await auth()` pattern.
- No test suite — verify with `npm run typecheck` and `npm run build`.
- Tailwind v4 with CSS custom properties defined in `globals.css`. Dark mode via `.dark` class.
- shadcn/ui components in `src/components/ui/`.

---

### Task 1: Add `phase` column to schema and migrate

**Files:**
- Modify: `src/lib/db/schema.ts:66-89` (tasks table definition)
- Generated: `drizzle/0005_*.sql` (auto-generated migration)

**Interfaces:**
- Consumes: Nothing new
- Produces: `tasks.phase` — integer column, default 1, not null. Available to all queries selecting from `tasks`.

- [ ] **Step 1: Add phase column to tasks table schema**

In `src/lib/db/schema.ts`, add `phase` to the `tasks` table definition, after the `position` field:

```typescript
phase: integer('phase').default(1).notNull(),
```

- [ ] **Step 2: Run typecheck to confirm schema compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: A new migration file appears in `drizzle/` with `ALTER TABLE "tasks" ADD COLUMN "phase" integer DEFAULT 1 NOT NULL`

- [ ] **Step 4: Push schema to dev database**

Run: `npm run db:push`
Expected: Success. All existing tasks now have `phase = 1`.

- [ ] **Step 5: Update the Adinkra Home seed to set phases**

In `src/lib/seeds/adinkra-home.ts`, update Milestone 1 tasks with meaningful phase groupings:

```typescript
// Phase 1: Foundation (data model + permissions)
{ position: 1, title: 'Define funeral case data model', ..., phase: 1 },
{ position: 6, title: 'Implement role-based permissions', ..., phase: 1 },

// Phase 2: Core APIs (depend on data model)
{ position: 2, title: 'Build funeral case creation API', ..., phase: 2 },
{ position: 3, title: 'Build contribution infrastructure', ..., phase: 2 },
{ position: 4, title: 'Build budget and expense tracking', ..., phase: 2 },
{ position: 9, title: 'Build audit trail system', ..., phase: 2 },

// Phase 3: Workflows (depend on APIs)
{ position: 5, title: 'Build approval engine', ..., phase: 3 },
{ position: 7, title: 'Build vendor assignment system', ..., phase: 3 },
{ position: 8, title: 'Build payment request and disbursement workflow', ..., phase: 3 },

// Phase 4: Integrations (depend on workflows)
{ position: 10, title: 'WhatsApp integration', ..., phase: 4 },
{ position: 11, title: 'MoMo integration', ..., phase: 4 },
{ position: 12, title: 'International payment integration', ..., phase: 4 },
{ position: 13, title: 'Define monetisation model — Phase 1', ..., phase: 4 },
```

Apply similar phase groupings for Milestones 2-4 (most have 1-2 phases since they're smaller).

- [ ] **Step 6: Re-run seed to update existing tasks**

This requires modifying the seed script to UPDATE existing tasks with phase values if the project already has milestones. Add a section after the "already exists" check:

```typescript
if (existingMilestones.length > 0) {
  console.log('Updating task phases...');
  // Update phases for existing tasks by title match
  for (const update of phaseUpdates) {
    await tx.update(tasks)
      .set({ phase: update.phase })
      .where(and(eq(tasks.projectId, existing.id), eq(tasks.title, update.title)));
  }
  console.log('Phases updated.');
  process.exit(0);
}
```

Run: `npx tsx --env-file=.env.local src/lib/seeds/adinkra-home.ts`
Expected: Tasks updated with phase values.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts drizzle/ src/lib/seeds/adinkra-home.ts
git commit -m "feat: add phase column to tasks for execution sequencing"
```

---

### Task 2: Expose `phase` in task APIs and add readiness computation

**Files:**
- Modify: `src/app/api/projects/[projectId]/tasks/route.ts` (GET — include phase; POST — accept phase)
- Modify: `src/app/api/projects/[projectId]/tasks/[taskId]/route.ts` (PATCH — allow phase updates)
- Create: `src/lib/task-readiness.ts` (readiness computation utility)

**Interfaces:**
- Consumes: `tasks.phase` column from Task 1
- Produces:
  - GET `/api/projects/:id/tasks` now returns `phase: number` on each task
  - POST `/api/projects/:id/tasks` accepts optional `phase: number` in body
  - PATCH `/api/projects/:id/tasks/:taskId` accepts optional `phase: number` in body
  - `computeTaskReadiness(tasks: {id, milestoneId, phase, status}[]): Map<string, boolean>` — returns a map of taskId → isReady

- [ ] **Step 1: Create the readiness utility**

Create `src/lib/task-readiness.ts`:

```typescript
type TaskForReadiness = {
  id: string;
  milestoneId: string | null;
  phase: number;
  status: string;
};

export function computeTaskReadiness(tasks: TaskForReadiness[]): Map<string, boolean> {
  const readiness = new Map<string, boolean>();

  // Group tasks by milestone
  const byMilestone = new Map<string | null, TaskForReadiness[]>();
  for (const task of tasks) {
    const key = task.milestoneId;
    if (!byMilestone.has(key)) byMilestone.set(key, []);
    byMilestone.get(key)!.push(task);
  }

  for (const [_, milestoneTasks] of byMilestone) {
    // Find the highest phase where ALL tasks are done
    const phases = [...new Set(milestoneTasks.map(t => t.phase))].sort((a, b) => a - b);

    let highestCompletedPhase = 0;
    for (const phase of phases) {
      const phaseTasks = milestoneTasks.filter(t => t.phase === phase);
      const allDone = phaseTasks.every(t => t.status === 'done');
      if (allDone) {
        highestCompletedPhase = phase;
      } else {
        break;
      }
    }

    // Tasks are ready if their phase is the next one after the highest completed
    for (const task of milestoneTasks) {
      if (task.status === 'done') {
        readiness.set(task.id, true);
      } else {
        readiness.set(task.id, task.phase <= highestCompletedPhase + 1);
      }
    }
  }

  return readiness;
}
```

- [ ] **Step 2: Update GET /api/projects/[projectId]/tasks to include phase**

In `src/app/api/projects/[projectId]/tasks/route.ts`, add `phase: tasks.phase` to the select:

```typescript
const result = await db
  .select({
    id: tasks.id,
    title: tasks.title,
    description: tasks.description,
    status: tasks.status,
    priority: tasks.priority,
    position: tasks.position,
    phase: tasks.phase,
    dueDate: tasks.dueDate,
    assigneeId: tasks.assigneeId,
    reporterId: tasks.reporterId,
    milestoneId: tasks.milestoneId,
    createdAt: tasks.createdAt,
  })
  .from(tasks)
  .where(eq(tasks.projectId, projectId))
  .orderBy(tasks.status, tasks.position);
```

- [ ] **Step 3: Update POST to accept phase**

In the POST handler, extract `phase` from the body and include in insert:

```typescript
const { title, description, priority, dueDate, assigneeId, status, phase } = await request.json();

// ... existing validation ...

const [task] = await db
  .insert(tasks)
  .values({
    projectId,
    title: title.trim(),
    description: description || null,
    priority: priority || 'medium',
    reporterId: session.user.id,
    assigneeId: assigneeId || null,
    status: taskStatus,
    dueDate: dueDate ? new Date(dueDate) : null,
    position: maxPos + 1,
    phase: typeof phase === 'number' && phase >= 1 ? phase : 1,
  })
  .returning();
```

- [ ] **Step 4: Update PATCH to accept phase**

In `src/app/api/projects/[projectId]/tasks/[taskId]/route.ts`, add phase to the allowed update fields. Find the section that builds the update object and add:

```typescript
if (typeof body.phase === 'number' && body.phase >= 1) {
  updateData.phase = body.phase;
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/task-readiness.ts src/app/api/projects/[projectId]/tasks/route.ts src/app/api/projects/[projectId]/tasks/[taskId]/route.ts
git commit -m "feat: expose phase in task APIs and add readiness computation"
```

---

### Task 3: Update the Tasks page server component to pass phase + readiness data

**Files:**
- Modify: `src/app/portal/projects/[slug]/tasks/page.tsx`

**Interfaces:**
- Consumes: `tasks.phase` column, `computeTaskReadiness` from `src/lib/task-readiness.ts`
- Produces: The `KanbanBoard` component now receives tasks with `phase: number` and `isReady: boolean` fields, passed as props alongside existing data.

- [ ] **Step 1: Update the server component query and serialization**

In `src/app/portal/projects/[slug]/tasks/page.tsx`:

1. Add `phase` to the task select fields.
2. Import and call `computeTaskReadiness` on the fetched tasks.
3. Merge `isReady` into the serialized task objects.

```typescript
import { computeTaskReadiness } from '@/lib/task-readiness';

// In the query, add:
phase: tasks.phase,

// After fetching taskRows:
const readinessMap = computeTaskReadiness(
  taskRows.map(t => ({ id: t.id, milestoneId: t.milestoneId, phase: t.phase, status: t.status }))
);

const serializedTasks = taskRows.map((t) => ({
  ...t,
  dueDate: t.dueDate?.toISOString() ?? null,
  signedOffAt: t.signedOffAt?.toISOString() ?? null,
  phase: t.phase,
  isReady: readinessMap.get(t.id) ?? true,
}));
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: TypeScript errors in `kanban-board.tsx` because the `Task` type doesn't include `phase` or `isReady` yet. That's expected — Task 4 fixes it.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/projects/[slug]/tasks/page.tsx
git commit -m "feat: pass phase and readiness data to kanban board"
```

---

### Task 4: Update KanbanBoard to display phases in "Group by Milestone" mode

**Files:**
- Modify: `src/components/portal/kanban-board.tsx`

**Interfaces:**
- Consumes: `Task` now includes `phase: number` and `isReady: boolean` from Task 3
- Produces: Updated "Group by Milestone" view that sub-groups tasks by phase with visual lock/unlock indicators. Tasks in locked phases appear dimmed with a lock icon.

- [ ] **Step 1: Update the Task type to include phase and isReady**

In `src/components/portal/kanban-board.tsx`, update the `Task` type:

```typescript
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
```

- [ ] **Step 2: Rewrite the "Group by Milestone" section to sub-group by phase**

Replace the milestone grouping section (inside the `{groupByMilestone ? (...) : (...)}` ternary, the truthy branch) with a version that groups tasks by phase within each milestone:

```tsx
{groupByMilestone ? (
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

    {/* Unassigned tasks — same as before */}
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
```

- [ ] **Step 3: Add the Lock import**

Add `Lock` to the lucide-react import:

```typescript
import { Plus, MoreHorizontal, BadgeCheck, Layers, Lock } from 'lucide-react';
```

- [ ] **Step 4: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/kanban-board.tsx
git commit -m "feat: display phase groupings with lock/unlock in milestone view"
```

---

### Task 5: Add "Up Next" view — shows only ready tasks across milestones

**Files:**
- Modify: `src/components/portal/kanban-board.tsx` (add view toggle and Up Next rendering)

**Interfaces:**
- Consumes: `Task.isReady` and `Task.phase` from Task 4
- Produces: A third view mode ("Up Next") accessible via a toggle button alongside the existing "Group by Milestone" button. Shows only tasks where `isReady === true` and `status !== 'done'`, grouped by milestone.

- [ ] **Step 1: Add view state — replace boolean with enum**

Replace the `groupByMilestone` state with a view mode enum:

```typescript
type ViewMode = 'kanban' | 'milestone' | 'upnext';
const [viewMode, setViewMode] = useState<ViewMode>('kanban');
```

Update the toggle button area to support three modes:

```tsx
<div className="flex items-center gap-2">
  {milestones.length > 0 && (
    <>
      <Button
        size="sm"
        variant={viewMode === 'milestone' ? 'default' : 'outline'}
        onClick={() => setViewMode(viewMode === 'milestone' ? 'kanban' : 'milestone')}
        className={cn('gap-1.5 text-xs', viewMode === 'milestone' && 'bg-brand-muted text-red border-red/20')}
      >
        <Layers className="size-3.5" />
        Milestones
      </Button>
      <Button
        size="sm"
        variant={viewMode === 'upnext' ? 'default' : 'outline'}
        onClick={() => setViewMode(viewMode === 'upnext' ? 'kanban' : 'upnext')}
        className={cn('gap-1.5 text-xs', viewMode === 'upnext' && 'bg-brand-muted text-red border-red/20')}
      >
        <CircleDot className="size-3.5" />
        Up Next
      </Button>
    </>
  )}
  {/* ... Add Task dialog trigger ... */}
</div>
```

- [ ] **Step 2: Add the Up Next view rendering**

Add a new branch in the view conditional (make it a three-way: `viewMode === 'milestone'`, `viewMode === 'upnext'`, else kanban):

```tsx
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
  // ... existing milestone grouping from Task 4 ...
) : (
  // ... existing kanban DnD view ...
)}
```

- [ ] **Step 3: Add CircleDot to lucide-react import**

```typescript
import { Plus, MoreHorizontal, BadgeCheck, Layers, Lock, CircleDot } from 'lucide-react';
```

- [ ] **Step 4: Update conditional references**

Find all references to `groupByMilestone` and replace:
- `groupByMilestone` (in the ternary condition) → `viewMode === 'milestone'`
- Remove the old `useState(false)` for `groupByMilestone`

- [ ] **Step 5: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/portal/kanban-board.tsx
git commit -m "feat: add Up Next view showing only ready tasks"
```

---

### Task 6: Add phase selector to task detail dialog and task creation

**Files:**
- Modify: `src/components/portal/task-detail-dialog.tsx` (admin can set phase in edit mode)
- Modify: `src/components/portal/kanban-board.tsx` (add phase field to Add Task dialog)

**Interfaces:**
- Consumes: PATCH `/api/projects/:id/tasks/:taskId` with `{phase: number}` from Task 2
- Produces: Admin users can view and set phase on individual tasks via the detail dialog. New tasks can be created with a specific phase.

- [ ] **Step 1: Read the current task-detail-dialog.tsx**

Read `src/components/portal/task-detail-dialog.tsx` to understand the edit mode structure.

- [ ] **Step 2: Add phase display in view mode**

In the task detail dialog's view mode section (where status, priority, assignee, due date are displayed), add a "Phase" row:

```tsx
<div className="flex items-center justify-between py-2 border-b border-subtle">
  <span className="text-sm text-slate">Phase</span>
  <span className="text-sm text-white">Phase {task.phase}</span>
</div>
```

- [ ] **Step 3: Add phase selector in edit mode (admin only)**

In the edit mode form, add a phase number input (only visible to admins):

```tsx
{userRole === 'admin' && (
  <div className="space-y-2">
    <Label htmlFor="task-phase">Phase</Label>
    <Input
      id="task-phase"
      type="number"
      min={1}
      max={10}
      value={editPhase}
      onChange={(e) => setEditPhase(parseInt(e.target.value) || 1)}
    />
    <p className="text-xs text-tertiary">
      Tasks in lower phases must complete before higher phases unlock.
    </p>
  </div>
)}
```

Add the state: `const [editPhase, setEditPhase] = useState(task?.phase ?? 1);`

Include `phase: editPhase` in the PATCH body when saving.

- [ ] **Step 4: Add phase field to the "Add Task" dialog in kanban-board.tsx**

In the `KanbanBoard` component's Add Task dialog form, add a phase input next to priority/dueDate:

```tsx
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
```

Add state: `const [phase, setPhase] = useState(1);`
Include in POST body: `phase`
Reset on dialog close: `setPhase(1);`

- [ ] **Step 5: Update the TaskDetailDialog props to include phase**

The task object passed to `TaskDetailDialog` needs a `phase` field. Update where `selectedTask` is passed:

```typescript
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
```

- [ ] **Step 6: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/portal/task-detail-dialog.tsx src/components/portal/kanban-board.tsx
git commit -m "feat: add phase selector to task creation and editing"
```

---

### Task 7: Update milestones page to show phase progress breakdown

**Files:**
- Modify: `src/app/api/projects/[projectId]/milestones/route.ts` (GET — return per-phase counts)
- Modify: `src/components/portal/milestones-list.tsx` (show phase breakdown in milestone cards)

**Interfaces:**
- Consumes: `tasks.phase` column, milestone-task relationship
- Produces: Milestones API GET returns `phases: {phase: number, total: number, completed: number}[]` per milestone. Milestones list UI renders a stacked phase progress indicator.

- [ ] **Step 1: Update the milestones GET endpoint to include phase data**

In `src/app/api/projects/[projectId]/milestones/route.ts`, after the existing query, add a secondary query for per-phase breakdowns:

```typescript
const phaseData = await db
  .select({
    milestoneId: tasks.milestoneId,
    phase: tasks.phase,
    total: sql<number>`count(*)::int`,
    completed: sql<number>`count(case when ${tasks.status} = 'done' and ${tasks.signedOffAt} is not null then 1 end)::int`,
  })
  .from(tasks)
  .where(eq(tasks.projectId, projectId))
  .groupBy(tasks.milestoneId, tasks.phase)
  .orderBy(tasks.phase);

// Attach phase data to each milestone
const enriched = result.map(m => ({
  ...m,
  phases: phaseData
    .filter(p => p.milestoneId === m.id)
    .map(p => ({ phase: p.phase, total: p.total, completed: p.completed })),
}));

return NextResponse.json({ milestones: enriched });
```

- [ ] **Step 2: Update the Milestone type in milestones-list.tsx**

```typescript
type Milestone = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  position: number;
  taskCount: number;
  completedTaskCount: number;
  phases: { phase: number; total: number; completed: number }[];
};
```

- [ ] **Step 3: Add phase progress visualization to milestone cards**

Below the existing progress bar in each milestone card, add a phase breakdown:

```tsx
{m.phases.length > 1 && (
  <div className="flex items-center gap-1.5">
    {m.phases.map((p) => {
      const isComplete = p.completed === p.total;
      const isActive = !isComplete && m.phases
        .filter(pp => pp.phase < p.phase)
        .every(pp => pp.completed === pp.total);
      return (
        <div
          key={p.phase}
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
            isComplete && 'bg-success/10 text-success',
            isActive && 'bg-warning/10 text-warning',
            !isComplete && !isActive && 'bg-surface-3 text-tertiary',
          )}
        >
          {isComplete ? (
            <BadgeCheck className="size-3" />
          ) : isActive ? (
            <CircleDot className="size-3" />
          ) : (
            <Lock className="size-3" />
          )}
          P{p.phase}
        </div>
      );
    })}
  </div>
)}
```

Add necessary imports: `BadgeCheck`, `CircleDot`, `Lock` from `lucide-react`.

- [ ] **Step 4: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/[projectId]/milestones/route.ts src/components/portal/milestones-list.tsx
git commit -m "feat: show phase progress breakdown on milestone cards"
```

---

### Task 8: Visual verification and polish

**Files:**
- No new files — this task verifies the full feature works end-to-end

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working feature with no regressions

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to the Adinkra Home project tasks page**

Open: `http://localhost:3000/portal/projects/adinkra-home/tasks`

Verify:
- Default Kanban view still works with drag-and-drop
- Task cards still show all existing info (priority, assignee, due date, milestone badge)

- [ ] **Step 3: Test "Milestones" view mode**

Click the "Milestones" button. Verify:
- Tasks are grouped by milestone
- Within each milestone, tasks are sub-grouped by phase (Phase 1, Phase 2, etc.)
- Phase 1 shows as unlocked (open circle or check)
- Higher phases show as locked (lock icon) with dimmed opacity
- Phase completion counter shows (e.g., "0/2 done")

- [ ] **Step 4: Test "Up Next" view mode**

Click the "Up Next" button. Verify:
- Only tasks from Phase 1 (the ready phase) appear
- Tasks are grouped by milestone
- No locked tasks appear in this view
- Shows meaningful empty state when all ready tasks are done

- [ ] **Step 5: Test phase editing**

Click a task to open the detail dialog. Verify:
- Phase number is displayed in view mode
- In edit mode (admin), phase can be changed
- After changing phase from 1 to 3, the task disappears from "Up Next" if other Phase 1/2 tasks are incomplete

- [ ] **Step 6: Test milestone page phase indicators**

Navigate to: `http://localhost:3000/portal/projects/adinkra-home/milestones`

Verify:
- Each milestone card shows phase pills (P1, P2, P3, P4)
- P1 shows as active (yellow/warning), others show as locked (grey)
- When all P1 tasks are marked done, P2 becomes active

- [ ] **Step 7: Run production build**

Run: `npm run build`
Expected: Successful build with no errors

- [ ] **Step 8: Final commit if any polish needed**

```bash
git add -A
git commit -m "chore: polish phase-based task grouping UI"
```

---
