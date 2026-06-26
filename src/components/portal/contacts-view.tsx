'use client';

import { useState, useEffect, useCallback } from 'react';
import { Inbox, Mail, Building2, Briefcase, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ContactReplyModal from './contact-reply-modal';
import ConvertToProjectModal from './convert-to-project-modal';

type ContactStatus = 'new' | 'read' | 'replied' | 'converted';

type Contact = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  service: string | null;
  message: string;
  status: ContactStatus;
  notes: string | null;
  respondedAt: string | null;
  createdAt: string;
};

type Tab = { label: string; value: ContactStatus | 'all' };

const TABS: Tab[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Replied', value: 'replied' },
  { label: 'Converted', value: 'converted' },
];

const STATUS_CONFIG: Record<ContactStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border-[var(--brand-primary)]/30' },
  read: { label: 'Read', className: 'bg-info/15 text-info border-info/30' },
  replied: { label: 'Replied', className: 'bg-success/15 text-success border-success/30' },
  converted: { label: 'Converted', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

function timeAgo(date: string): string {
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

export default function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContactStatus | 'all'>('all');
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [replyContact, setReplyContact] = useState<Contact | null>(null);
  const [convertContact, setConvertContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      params.set('page', String(page));
      const res = await fetch(`/api/admin/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContacts(data.contacts);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleTabChange(tab: ContactStatus | 'all') {
    setActiveTab(tab);
    setPage(1);
  }

  async function markAsRead(contactId: string) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, status: 'read' as ContactStatus } : c)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/admin/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      });
    } catch {}
  }

  function handleCardClick(contact: Contact) {
    if (contact.status === 'new') {
      markAsRead(contact.id);
    }
  }

  async function saveNote(contactId: string) {
    const note = noteDrafts[contactId];
    if (note === undefined) return;
    setSavingNote(contactId);
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, notes: note } : c)),
      );
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(null);
    }
  }

  function handleReplySuccess(contactId: string) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, status: 'replied' as ContactStatus } : c)),
    );
    setReplyContact(null);
  }

  function handleConvertSuccess(contactId: string) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, status: 'converted' as ContactStatus } : c)),
    );
    setConvertContact(null);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Contact Submissions</h1>
        <p className="text-sm text-slate">Enquiries from the marketing site.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-brand bg-surface-2 p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const count = tab.value === 'new' ? unreadCount : undefined;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate hover:text-white hover:bg-white/5',
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="flex min-w-4 h-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contact list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-brand bg-surface-2 py-16">
          <Inbox className="size-8 text-slate" />
          <p className="text-sm text-slate">No submissions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => handleCardClick(contact)}
              expanded={expandedMessages.has(contact.id)}
              onToggleExpand={() =>
                setExpandedMessages((s) => {
                  const next = new Set(s);
                  next.has(contact.id) ? next.delete(contact.id) : next.add(contact.id);
                  return next;
                })
              }
              notesExpanded={expandedNotes.has(contact.id)}
              onToggleNotes={() =>
                setExpandedNotes((s) => {
                  const next = new Set(s);
                  next.has(contact.id) ? next.delete(contact.id) : next.add(contact.id);
                  return next;
                })
              }
              noteDraft={noteDrafts[contact.id] ?? contact.notes ?? ''}
              onNoteChange={(v) => setNoteDrafts((d) => ({ ...d, [contact.id]: v }))}
              onSaveNote={() => saveNote(contact.id)}
              savingNote={savingNote === contact.id}
              onReply={() => setReplyContact(contact)}
              onConvert={() => setConvertContact(contact)}
              onMarkRead={() => markAsRead(contact.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      {replyContact && (
        <ContactReplyModal
          contact={replyContact}
          open={!!replyContact}
          onOpenChange={(open) => !open && setReplyContact(null)}
          onSuccess={() => handleReplySuccess(replyContact.id)}
        />
      )}
      {convertContact && (
        <ConvertToProjectModal
          contact={convertContact}
          open={!!convertContact}
          onOpenChange={(open) => !open && setConvertContact(null)}
          onSuccess={() => handleConvertSuccess(convertContact.id)}
        />
      )}
    </div>
  );
}

function ContactCard({
  contact,
  onClick,
  expanded,
  onToggleExpand,
  notesExpanded,
  onToggleNotes,
  noteDraft,
  onNoteChange,
  onSaveNote,
  savingNote,
  onReply,
  onConvert,
  onMarkRead,
}: {
  contact: Contact;
  onClick: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  notesExpanded: boolean;
  onToggleNotes: () => void;
  noteDraft: string;
  onNoteChange: (v: string) => void;
  onSaveNote: () => void;
  savingNote: boolean;
  onReply: () => void;
  onConvert: () => void;
  onMarkRead: () => void;
}) {
  const status = STATUS_CONFIG[contact.status];

  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-brand bg-surface-2 p-4 transition-colors hover:border-brand/80"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium text-white truncate">{contact.name}</p>
          {contact.company && (
            <span className="flex items-center gap-1 text-xs text-slate truncate">
              <Building2 className="size-3 shrink-0" />
              {contact.company}
            </span>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
            status.className,
          )}
        >
          {status.label}
        </span>
      </div>

      {/* Email + service row */}
      <div className="mt-1.5 flex items-center gap-3 flex-wrap">
        <a
          href={`mailto:${contact.email}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-slate hover:text-white transition-colors"
        >
          <Mail className="size-3" />
          {contact.email}
        </a>
        {contact.service && (
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate">
            <Briefcase className="size-3" />
            {contact.service}
          </span>
        )}
      </div>

      {/* Message body */}
      <div className="mt-3">
        <p
          className={cn(
            'text-sm text-slate/90 whitespace-pre-wrap',
            !expanded && 'line-clamp-3',
          )}
        >
          {contact.message}
        </p>
        {contact.message.length > 200 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="mt-1 text-xs text-slate hover:text-white transition-colors"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Footer row */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-slate/60">{timeAgo(contact.createdAt)}</span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {contact.status === 'new' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkRead}>
              Mark as Read
            </Button>
          )}
          {contact.status !== 'converted' && (
            <>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onReply}>
                Reply
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onConvert}>
                Convert to Project
              </Button>
            </>
          )}
          {contact.status === 'converted' && (
            <span className="text-xs text-purple-400 font-medium">Converted</span>
          )}
        </div>
      </div>

      {/* Notes section */}
      <div className="mt-3 border-t border-brand/50 pt-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleNotes}
          className="flex items-center gap-1 text-xs text-slate hover:text-white transition-colors"
        >
          <StickyNote className="size-3" />
          {notesExpanded ? 'Hide notes' : 'Add note'}
          {notesExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        {notesExpanded && (
          <div className="mt-2 space-y-2">
            <textarea
              value={noteDraft}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Internal notes (only visible to admins)..."
              className="w-full rounded-lg border border-brand bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-slate/50 outline-none focus:border-[var(--brand-primary)] resize-y min-h-[60px]"
              rows={3}
            />
            <Button
              size="sm"
              className="h-7 text-xs bg-brand-primary hover:bg-brand-hover text-white"
              onClick={onSaveNote}
              disabled={savingNote}
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
