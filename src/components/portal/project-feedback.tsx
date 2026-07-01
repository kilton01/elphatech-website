'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FeedbackItem = {
  id: string;
  rating: number | null;
  comment: string;
  authorName: string | null;
  createdAt: string;
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          className={cn(
            'text-sm transition-colors',
            i <= rating ? 'text-warning' : 'text-brand',
            interactive && 'cursor-pointer hover:text-warning',
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProjectFeedback({
  projectId,
  canSubmit,
  isAdmin,
  fileId,
}: {
  projectId: string;
  canSubmit: boolean;
  isAdmin: boolean;
  fileId?: string;
}) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fileId) params.set('fileId', fileId);
      else params.set('fileId', '');
      const url = fileId
        ? `/api/projects/${projectId}/feedback?fileId=${fileId}`
        : `/api/projects/${projectId}/feedback`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const filtered = fileId
        ? data.feedback.filter((f: FeedbackItem & { fileId?: string | null }) => f.fileId === fileId)
        : data.feedback.filter((f: FeedbackItem & { fileId?: string | null }) => !f.fileId);
      setItems(filtered);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId, fileId]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!fileId && rating === 0) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment.trim(),
          rating: rating > 0 ? rating : undefined,
          fileId: fileId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit');
      }
      toast.success('Feedback submitted');
      setComment('');
      setRating(0);
      setShowForm(false);
      fetchFeedback();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = items.filter((i) => i.rating).length > 0
    ? (items.reduce((s, i) => s + (i.rating || 0), 0) / items.filter((i) => i.rating).length).toFixed(1)
    : null;

  return (
    <div className="rounded-xl border border-brand bg-surface-1 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-slate" />
          <h3 className="text-sm font-medium text-white">
            {fileId ? 'File Feedback' : 'Project Feedback'}
          </h3>
          {isAdmin && avgRating && (
            <span className="text-xs text-warning">★ {avgRating} / 5</span>
          )}
        </div>
        {canSubmit && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="text-xs">
            {fileId ? 'Leave Feedback' : 'Leave Overall Feedback'}
          </Button>
        )}
      </div>

      {showForm && canSubmit && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-brand bg-surface-0 p-4">
          {!fileId && (
            <p className="text-xs text-slate">Share your overall experience with this project.</p>
          )}
          <div>
            <label className="block text-xs text-slate mb-1">Rating{!fileId && ' (required)'}</label>
            <Stars rating={rating} interactive onChange={setRating} />
          </div>
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={3}
              placeholder="Your feedback..."
              className="w-full rounded-md border border-brand bg-surface-0 px-3 py-2 text-sm text-white placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-y"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-slate">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate">
          {canSubmit ? 'No feedback yet. Share your thoughts on how the project is going.' : 'No feedback yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border-t border-brand pt-3 first:border-0 first:pt-0">
              {item.rating && <Stars rating={item.rating} />}
              <p className="text-sm text-white/85 mt-1">{item.comment}</p>
              <p className="text-[10px] text-tertiary mt-1">
                {item.authorName} · {timeAgo(item.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
