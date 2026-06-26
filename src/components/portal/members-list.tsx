'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, X, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
};

export default function MembersList({
  projectId,
  members,
  isAdmin,
}: {
  projectId: string;
  members: Member[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to invite');
      }
      toast.success(`Invited ${email}`);
      setEmail('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    const confirmed = window.confirm('Remove this member from the project?');
    if (!confirmed) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove');
      }
      toast.success('Member removed');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  const roleConfig = {
    admin: { label: 'Admin', className: 'bg-brand-muted text-red border-red/20' },
    client: { label: 'Client', className: 'bg-info/10 text-info border-info/20' },
  } as Record<string, { label: string; className: string }>;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="rounded-xl border border-brand bg-surface-1 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="size-4 text-slate" />
            <h3 className="text-sm font-medium text-white">Invite a team member</h3>
          </div>
          <p className="mb-4 text-xs text-slate">
            Enter their email address. They&apos;ll receive an invite link to access this project.
          </p>
          <form onSubmit={handleInvite} className="flex gap-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="flex-1 border-brand bg-surface-0 text-white placeholder:text-tertiary focus:border-brand-primary focus:ring-brand-primary/20"
            />
            <Button
              type="submit"
              disabled={inviting || !email.trim()}
              size="sm"
              className="gap-1.5 bg-brand-primary text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <UserPlus className="size-3.5" />
              {inviting ? 'Sending...' : 'Invite'}
            </Button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-brand bg-surface-1 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4 text-slate" />
          <h3 className="text-sm font-medium text-white">
            Team members
          </h3>
          <span className="text-xs text-tertiary">({members.length})</span>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Users className="mb-2 size-8 text-tertiary" />
            <p className="text-sm text-slate">No members yet. Invite someone above.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand">
            {members.map((member) => {
              const initials = (member.name ?? member.email ?? '?')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              const role = roleConfig[member.role] || { label: member.role, className: 'bg-white/5 text-slate border-white/10' };

              return (
                <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex size-9 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-red">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {member.name ?? member.email}
                    </p>
                    {member.name && (
                      <p className="text-xs text-slate truncate">
                        {member.email}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] capitalize', role.className)}
                  >
                    {role.label}
                  </Badge>
                  {isAdmin && member.role !== 'admin' && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="flex size-7 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
