'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Contact = {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
};

export default function ContactReplyModal({
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
  const defaultSubject = contact.service
    ? `Re: Your enquiry about ${contact.service}`
    : 'Re: Your message to ElphaTech Solutions';

  const defaultMessage = `Hi ${contact.name},

Thank you for reaching out to ElphaTech Solutions.



Best regards,
Stephen
ElphaTech Solutions`;

  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reply');
      }
      toast.success(`Reply sent to ${contact.email}`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reply to {contact.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate mb-1 block">To:</label>
            <Input value={contact.email} disabled className="bg-white/[0.03] text-slate" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate mb-1 block">Subject:</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white/[0.03]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate mb-1 block">Message:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-brand bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate/50 outline-none focus:border-[var(--brand-primary)] resize-y min-h-[150px]"
            />
          </div>

          {/* Original message quoted */}
          <div className="rounded-lg border-l-2 border-slate/30 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] font-medium text-slate/60 uppercase tracking-wider mb-1">
              Original message:
            </p>
            <p className="text-xs text-slate/80 whitespace-pre-wrap">{contact.message}</p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={sending} className="bg-brand-primary hover:bg-brand-hover text-white">
              {sending ? 'Sending...' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
