'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Activity,
  Users,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Plus,
  UserCog,
  Eye,
  Receipt,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Summary = {
  totalProjects: number;
  activeProjects: number;
  totalClients: number;
  overdueTasks: number;
  pendingSignoffs: number;
  unreadNotifications: number;
  outstandingInvoices: number;
  outstandingInvoiceTotal: number;
  newContacts: number;
};

type Project = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  clientCount: number;
  taskTotal: number;
  taskDone: number;
  overdueCount: number;
  milestoneCount: number;
  milestonesComplete: number;
  lastActivityAt: string | null;
  lastClientActivityAt: string | null;
  health: 'on_track' | 'at_risk' | 'overdue';
};

type Client = {
  userId: string;
  name: string | null;
  email: string;
  projectCount: number;
  lastCommentAt: string | null;
  lastFileUploadAt: string | null;
  lastActiveAt: string | null;
};

type DashboardData = {
  summary: Summary;
  projects: Project[];
  clients: Client[];
};

type PendingSignoff = {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  projectName: string;
  projectSlug: string;
};

function timeAgo(date: string | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('health');
  const [sortAsc, setSortAsc] = useState(true);
  const [signoffDialogOpen, setSignoffDialogOpen] = useState(false);
  const [signoffs, setSignoffs] = useState<PendingSignoff[]>([]);
  const [signoffsLoading, setSignoffsLoading] = useState(false);

  function openSignoffDialog() {
    setSignoffDialogOpen(true);
    setSignoffsLoading(true);
    fetch('/api/admin/signoffs')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setSignoffs)
      .catch(() => setSignoffs([]))
      .finally(() => setSignoffsLoading(false));
  }

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate">Failed to load dashboard data.</p>;
  }

  const { summary, projects, clients } = data;
  const firstName = userName.split(' ')[0];

  const healthOrder = { overdue: 0, at_risk: 1, on_track: 2 };
  const sortedProjects = [...projects].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'health':
        cmp = healthOrder[a.health] - healthOrder[b.health];
        break;
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'progress':
        cmp = (a.taskTotal ? a.taskDone / a.taskTotal : 0) - (b.taskTotal ? b.taskDone / b.taskTotal : 0);
        break;
      case 'overdue':
        cmp = a.overdueCount - b.overdueCount;
        break;
      case 'clients':
        cmp = a.clientCount - b.clientCount;
        break;
      case 'lastActivity':
        cmp = (a.lastActivityAt || '').localeCompare(b.lastActivityAt || '');
        break;
      default:
        cmp = 0;
    }
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate">Here&apos;s your portfolio overview.</p>
      </div>

      {/* Step 3: Summary Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SummaryCard icon={<FolderKanban className="size-4" />} label="Total Projects" value={summary.totalProjects} />
        <SummaryCard icon={<Activity className="size-4 text-info" />} label="Active Projects" value={summary.activeProjects} color="text-info" />
        <SummaryCard icon={<Users className="size-4" />} label="Total Clients" value={summary.totalClients} />
        <SummaryCard icon={<AlertTriangle className="size-4 text-danger" />} label="Overdue Tasks" value={summary.overdueTasks} elevated={summary.overdueTasks > 0} color="text-danger" />
        <button onClick={openSignoffDialog} className="text-left">
          <SummaryCard icon={<BadgeCheck className="size-4 text-warning" />} label="Pending Sign-offs" value={summary.pendingSignoffs} elevated={summary.pendingSignoffs > 0} color="text-warning" />
        </button>
        <SummaryCard icon={<Bell className="size-4 text-red" />} label="Unread Notifications" value={summary.unreadNotifications} color="text-red" />
        <SummaryCard icon={<Receipt className="size-4 text-warning" />} label="Outstanding Invoices" value={summary.outstandingInvoices} elevated={summary.outstandingInvoices > 0} color="text-warning" subtitle={`$${summary.outstandingInvoiceTotal.toFixed(2)}`} />
        <Link href="/portal/admin/contacts?status=new">
          <SummaryCard icon={<Inbox className="size-4" />} label="New Enquiries" value={summary.newContacts} elevated={summary.newContacts > 0} color={summary.newContacts > 0 ? 'text-[var(--brand-primary)]' : 'text-slate'} />
        </Link>
      </div>

      {/* Step 6: Quick Actions */}
      <div className="flex items-center gap-3">
        <Link href="/portal/projects/new">
          <Button size="sm" className="gap-1.5 text-xs bg-brand-primary hover:bg-brand-hover text-white">
            <Plus className="size-3.5" />New Project
          </Button>
        </Link>
        <Link href="/portal/admin/users">
          <Button size="sm" className="gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/30">
            <UserCog className="size-3.5" />Manage Users
          </Button>
        </Link>
        <Link href="/portal/projects">
          <Button size="sm" className="gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/30">
            <Eye className="size-3.5" />View All Projects
          </Button>
        </Link>
      </div>

      {/* Step 4: Project Health Table */}
      <div className="rounded-xl border border-brand bg-surface-2 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Project Portfolio</h2>
        {projects.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate mb-3">No projects yet.</p>
            <Link href="/portal/projects/new">
              <Button size="sm" className="bg-red text-white hover:bg-red2">
                <Plus className="size-4" />New Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand text-left text-xs text-slate">
                  <SortHeader label="Project" sortKey="name" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                  <SortHeader label="Health" sortKey="health" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                  <SortHeader label="Progress" sortKey="progress" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                  <th className="px-3 py-2 font-medium">Milestones</th>
                  <SortHeader label="Overdue" sortKey="overdue" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                  <SortHeader label="Clients" sortKey="clients" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                  <SortHeader label="Last Activity" sortKey="lastActivity" currentKey={sortKey} asc={sortAsc} onSort={toggleSort} />
                  <th className="px-3 py-2 font-medium">Client Activity</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Step 5: Client Activity */}
      <div className="rounded-xl border border-brand bg-surface-2 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Client Activity</h2>
        {clients.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">
            No clients yet. Invite clients to your projects to see their activity here.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <ClientCard key={c.userId} client={c} />
            ))}
          </div>
        )}
      </div>

      {/* Pending Sign-offs Dialog */}
      <Dialog open={signoffDialogOpen} onOpenChange={setSignoffDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pending Sign-offs</DialogTitle>
          </DialogHeader>
          {signoffsLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
              ))}
            </div>
          ) : signoffs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate">
              No tasks pending sign-off.
            </p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {Object.entries(
                signoffs.reduce<Record<string, PendingSignoff[]>>((acc, s) => {
                  const key = s.projectSlug;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(s);
                  return acc;
                }, {}),
              ).map(([slug, tasks]) => (
                <div key={slug} className="mb-3">
                  <p className="mb-1 text-xs font-medium text-slate">
                    {tasks[0].projectName}
                  </p>
                  {tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/portal/projects/${slug}/tasks`}
                      onClick={() => setSignoffDialogOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
                    >
                      <span className="text-sm text-white">{task.title}</span>
                      <span className="text-xs text-slate capitalize">{task.priority}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  elevated,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  elevated?: boolean;
  color?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface-2 p-4',
        elevated ? 'border-danger/30' : 'border-brand',
      )}
    >
      <div className="flex items-center gap-2 text-slate">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn('mt-2 text-2xl font-semibold', color || 'text-white')}>
        {value}
      </p>
      {subtitle && <p className="mt-0.5 text-xs text-slate">{subtitle}</p>}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  asc,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  asc: boolean;
  onSort: (key: string) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th className="px-3 py-2 font-medium">
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-white transition-colors',
          isActive && 'text-white',
        )}
      >
        {label}
        {isActive && <span className="text-[10px]">{asc ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function ProjectRow({ project: p }: { project: Project }) {
  const router = useRouter();
  const progress = p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : -1;

  const healthConfig = {
    on_track: { label: 'On Track', className: 'bg-success/10 text-success border-success/20' },
    at_risk: { label: 'At Risk', className: 'bg-warning/10 text-warning border-warning/20' },
    overdue: { label: 'Overdue', className: 'bg-danger/10 text-danger border-danger/20' },
  };
  const health = healthConfig[p.health];

  return (
    <tr
      onClick={() => router.push(`/portal/projects/${p.slug}`)}
      className="border-b border-brand/50 cursor-pointer transition-colors hover:bg-white/[0.02]"
    >
      <td className="px-3 py-3 font-medium text-white">{p.name}</td>
      <td className="px-3 py-3">
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', health.className)}>
          {health.label}
        </span>
      </td>
      <td className="px-3 py-3">
        {progress >= 0 ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-slate">{p.taskDone}/{p.taskTotal}</span>
          </div>
        ) : (
          <span className="text-xs text-slate">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-slate">
        {p.milestoneCount > 0 ? `${p.milestonesComplete}/${p.milestoneCount}` : '—'}
      </td>
      <td className={cn('px-3 py-3 text-xs', p.overdueCount > 0 ? 'text-danger font-medium' : 'text-slate')}>
        {p.overdueCount}
      </td>
      <td className="px-3 py-3 text-xs text-slate">{p.clientCount}</td>
      <td className="px-3 py-3 text-xs text-slate">{timeAgo(p.lastActivityAt)}</td>
      <td className="px-3 py-3 text-xs text-slate">{timeAgo(p.lastClientActivityAt)}</td>
    </tr>
  );
}

function ClientCard({ client: c }: { client: Client }) {
  const router = useRouter();
  const daysSinceActive = c.lastActiveAt
    ? Math.floor((Date.now() - new Date(c.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  let dotColor = 'bg-slate/50';
  if (daysSinceActive <= 7) dotColor = 'bg-success';
  else if (daysSinceActive <= 30) dotColor = 'bg-warning';

  return (
    <button
      onClick={() => router.push('/portal/admin/users')}
      className="w-full rounded-xl border border-subtle bg-surface-1 p-4 text-left transition-colors hover:border-strong"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('size-2 rounded-full', dotColor)} />
        <p className="font-medium text-white text-sm truncate">{c.name || c.email}</p>
      </div>
      {c.name && <p className="text-xs text-slate mb-2 truncate">{c.email}</p>}
      <div className="space-y-1 text-xs text-slate">
        <p>On {c.projectCount} project{c.projectCount !== 1 ? 's' : ''}</p>
        <p>Last comment: {timeAgo(c.lastCommentAt)}</p>
        <p>Last upload: {timeAgo(c.lastFileUploadAt)}</p>
        <p className="font-medium text-white">Active: {timeAgo(c.lastActiveAt)}</p>
      </div>
    </button>
  );
}
