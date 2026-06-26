'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

type Contact = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  service: string | null;
};

export default function ConvertToProjectModal({
  contact,
  open,
  onOpenChange,
  onSuccess,
}: {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const defaultName = `${contact.company || contact.name}'s Project`;
  const defaultDescription = contact.service ? `Project enquiry: ${contact.service}` : '';

  const [projectName, setProjectName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectName.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to convert');
      }
      const result = await res.json();
      toast.success(
        <span>
          Project created. Invite sent to {contact.email}.{' '}
          <Link href={`/portal/projects/${result.projectSlug}`} className="underline font-medium">
            View Project →
          </Link>
        </span>,
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate mb-1 block">Project Name:</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-white/[0.03]"
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate mb-1 block">Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional project description..."
              rows={3}
              className="w-full rounded-lg border border-brand bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate/50 outline-none focus:border-[var(--brand-primary)] resize-y"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-info/5 border border-info/20 px-3 py-2.5">
            <Info className="size-4 shrink-0 text-info mt-0.5" />
            <p className="text-xs text-slate leading-relaxed">
              An account will be created for <strong className="text-white">{contact.email}</strong> and
              they&apos;ll receive a magic link to access the portal.
            </p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-brand-primary hover:bg-brand-hover text-white">
              {submitting ? 'Creating...' : 'Create Project & Invite Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
