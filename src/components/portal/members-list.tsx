'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, X, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  canTest: boolean;
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
  const [inviteRole, setInviteRole] = useState<'client' | 'tester' | 'admin'>('client');
  const [inviteCanTest, setInviteCanTest] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role: inviteRole,
          canTest: inviteRole === 'client' ? inviteCanTest : false,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to invite');
      }
      toast.success(`Invited ${email}`);
      setEmail('');
      setInviteRole('client');
      setInviteCanTest(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove() {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${memberToRemove.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove');
      }
      toast.success('Member removed');
      setMemberToRemove(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setRemoving(false);
    }
  }

  async function toggleCanTest(member: Member) {
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canTest: !member.canTest }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(member.canTest ? 'Tester access removed' : 'Tester access granted');
      router.refresh();
    } catch {
      toast.error('Failed to update member');
    }
  }

  const roleConfig: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-brand-muted text-red border-red/20' },
    client: { label: 'Client', className: 'bg-info/10 text-info border-info/20' },
    tester: { label: 'Tester', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  };

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
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="flex-1 border-brand bg-surface-0 text-white placeholder:text-tertiary focus:border-brand-primary focus:ring-brand-primary/20"
              />
              <select
                value={inviteRole}
                onChange={(e) => {
                  setInviteRole(e.target.value as typeof inviteRole);
                  if (e.target.value !== 'client') setInviteCanTest(false);
                }}
                className="rounded-md border border-brand bg-surface-0 px-3 py-2 text-sm text-white focus:border-brand-primary focus:ring-brand-primary/20"
              >
                <option value="client">Client</option>
                <option value="tester">Tester</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                type="submit"
                disabled={inviting || !email.trim()}
                size="sm"
                className="gap-1.5 bg-brand-primary text-white hover:bg-brand-hover disabled:opacity-50"
              >
                <UserPlus className="size-3.5" />
                {inviting ? 'Sending...' : 'Invite'}
              </Button>
            </div>
            {inviteRole === 'client' && (
              <label className="flex items-center gap-2 text-xs text-slate cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteCanTest}
                  onChange={(e) => setInviteCanTest(e.target.checked)}
                  className="rounded border-brand bg-surface-0 text-purple-500 focus:ring-purple-500/20"
                />
                Can submit bug and enhancement reports
              </label>
            )}
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
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] capitalize', role.className)}
                    >
                      {role.label}
                    </Badge>
                    {member.role === 'client' && member.canTest && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20"
                      >
                        + Tester
                      </Badge>
                    )}
                  </div>
                  {isAdmin && member.role === 'client' && (
                    <button
                      onClick={() => toggleCanTest(member)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded border transition-colors',
                        member.canTest
                          ? 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                          : 'border-brand text-tertiary hover:text-white hover:border-slate/30',
                      )}
                      title={member.canTest ? 'Remove tester access' : 'Grant tester access'}
                    >
                      {member.canTest ? '✓ Can test' : 'Enable testing'}
                    </button>
                  )}
                  {isAdmin && member.role !== 'admin' && (
                    <button
                      onClick={() => setMemberToRemove(member)}
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
      <Dialog open={!!memberToRemove} onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-white">
                {memberToRemove?.name ?? memberToRemove?.email}
              </span>{' '}
              from this project? They will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemberToRemove(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-danger text-white hover:bg-danger/90"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
