'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="max-w-sm"
          />
          <Button type="submit" disabled={inviting} size="sm">
            <UserPlus className="mr-1 size-4" />
            {inviting ? 'Inviting...' : 'Invite'}
          </Button>
        </form>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {(member.name ?? member.email ?? '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {member.name ?? member.email}
                  </p>
                  {member.name && (
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="capitalize">
                  {member.role}
                </Badge>
                {isAdmin && member.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(member.id)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
