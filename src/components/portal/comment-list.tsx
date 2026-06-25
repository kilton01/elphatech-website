'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string | null;
};

export default function CommentList({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .then((res) => res.json())
      .then(setComments)
      .catch(() => toast.error('Failed to load comments'))
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        },
      );
      if (!res.ok) throw new Error('Failed to post comment');
      const comment = await res.json();
      setComments((prev) => [comment, ...prev]);
      setContent('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading comments...</p>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handlePost} className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px] resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={posting || !content.trim()}>
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">
                  {comment.authorName ?? comment.authorEmail ?? 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <p className="mt-1 text-sm text-foreground/80">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
