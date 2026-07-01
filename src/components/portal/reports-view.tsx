'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Bug, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Report = {
  id: string;
  type: 'bug' | 'enhancement';
  title: string;
  description: string;
  severity: string;
  status: string;
  reporterName: string | null;
  convertedTaskId: string | null;
  createdAt: string;
};

type FileOption = { id: string; name: string };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-warning/15 text-warning border-warning/30' },
  acknowledged: { label: 'Acknowledged', className: 'bg-info/15 text-info border-info/30' },
  converted: { label: 'Converted', className: 'bg-success/15 text-success border-success/30' },
  dismissed: { label: 'Dismissed', className: 'bg-white/5 text-slate border-white/10' },
};

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-white/5 text-slate border-white/10' },
  medium: { label: 'Medium', className: 'bg-warning/15 text-warning border-warning/30' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  critical: { label: 'Critical', className: 'bg-danger/15 text-danger border-danger/30' },
};

export default function ReportsView({
  projectId,
  isAdmin,
  canReport,
  files,
}: {
  projectId: string;
  isAdmin: boolean;
  canReport: boolean;
  files: FileOption[];
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [convertReport, setConvertReport] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/projects/${projectId}/reports?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data.reports);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, typeFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleStatusChange(reportId: string, status: string) {
    const res = await fetch(`/api/projects/${projectId}/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update'); return; }
    toast.success(`Report ${status}`);
    fetchReports();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Reports</h2>
        {canReport && (
          <Button size="sm" onClick={() => setShowNewReport(true)}>
            <Plus className="size-4 mr-1.5" />
            New Report
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          {['', 'open', 'acknowledged', 'converted', 'dismissed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                statusFilter === s
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/10'
                  : 'border-brand text-slate hover:text-white',
              )}
            >
              {s || 'All'}
            </button>
          ))}
          <span className="w-px bg-brand mx-1" />
          {['', 'bug', 'enhancement'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                typeFilter === t
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/10'
                  : 'border-brand text-slate hover:text-white',
              )}
            >
              {t || 'All types'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-slate">
          {canReport ? 'No reports yet. Submit your first report.' : 'No reports yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-lg border border-brand bg-surface-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {report.type === 'bug' ? (
                    <Bug className="size-4 text-danger shrink-0" />
                  ) : (
                    <Lightbulb className="size-4 text-info shrink-0" />
                  )}
                  <h3 className="text-sm font-medium text-white truncate">{report.title}</h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={cn('text-[10px]', SEVERITY_CONFIG[report.severity]?.className)}>
                    {report.severity}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[report.status]?.className)}>
                    {STATUS_CONFIG[report.status]?.label || report.status}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-slate mt-2 line-clamp-2">{report.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-tertiary">
                  {report.reporterName} · {new Date(report.createdAt).toLocaleDateString()}
                </span>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    {report.status === 'open' && (
                      <button
                        onClick={() => handleStatusChange(report.id, 'acknowledged')}
                        className="text-[10px] px-2 py-0.5 rounded border border-info/30 text-info hover:bg-info/10 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {(report.status === 'open' || report.status === 'acknowledged') && (
                      <>
                        <button
                          onClick={() => setConvertReport(report)}
                          className="text-[10px] px-2 py-0.5 rounded border border-success/30 text-success hover:bg-success/10 transition-colors"
                        >
                          Convert to Task
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Dismiss this report?')) handleStatusChange(report.id, 'dismissed');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded border border-brand text-tertiary hover:text-danger hover:border-danger/30 transition-colors"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {report.status === 'converted' && report.convertedTaskId && (
                      <span className="flex items-center gap-1 text-[10px] text-success">
                        <ArrowRight className="size-3" /> Task created
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewReport && (
        <NewReportModal
          projectId={projectId}
          files={files}
          onClose={() => setShowNewReport(false)}
          onCreated={() => { setShowNewReport(false); fetchReports(); }}
        />
      )}

      {convertReport && (
        <ConvertModal
          projectId={projectId}
          report={convertReport}
          onClose={() => setConvertReport(null)}
          onConverted={() => { setConvertReport(null); fetchReports(); }}
        />
      )}
    </div>
  );
}

function NewReportModal({ projectId, files, onClose, onCreated }: {
  projectId: string;
  files: FileOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'bug' | 'enhancement'>('bug');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: formData.get('title'),
          description: formData.get('description'),
          severity: formData.get('severity'),
          fileId: formData.get('fileId') || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit');
      }
      toast.success('Report submitted');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-md border border-brand bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('bug')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                type === 'bug' ? 'border-danger text-danger bg-danger/10' : 'border-brand text-slate hover:text-white',
              )}
            >
              <Bug className="size-4" /> Bug
            </button>
            <button
              type="button"
              onClick={() => setType('enhancement')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                type === 'enhancement' ? 'border-info text-info bg-info/10' : 'border-brand text-slate hover:text-white',
              )}
            >
              <Lightbulb className="size-4" /> Enhancement
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Severity</label>
            <select name="severity" defaultValue="medium" className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Title</label>
            <input name="title" required className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Description</label>
            <textarea
              name="description"
              required
              rows={4}
              className={cn(inputCls, 'resize-y')}
              placeholder={type === 'bug' ? 'Steps to reproduce, expected behaviour, actual behaviour.' : 'Describe the improvement and why it would help.'}
            />
          </div>

          {files.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Related file (optional)</label>
              <select name="fileId" className={inputCls}>
                <option value="">None</option>
                {files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConvertModal({ projectId, report, onClose, onConverted }: {
  projectId: string;
  report: Report;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const SEVERITY_TO_PRIORITY: Record<string, string> = {
    critical: 'urgent', high: 'high', medium: 'medium', low: 'low',
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/${report.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          priority: formData.get('priority'),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to convert');
      }
      toast.success('Task created from report');
      onConverted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-md border border-brand bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task from Report</DialogTitle>
          <DialogDescription>
            Convert this {report.type} report into a task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Title</label>
            <input name="title" required defaultValue={report.title} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Description</label>
            <textarea name="description" required rows={3} defaultValue={report.description} className={cn(inputCls, 'resize-y')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Priority</label>
            <select name="priority" defaultValue={SEVERITY_TO_PRIORITY[report.severity] || 'medium'} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Creating...' : 'Create Task from Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
