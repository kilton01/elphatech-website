'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  ownedProjects: number;
  reportedTasks: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

export default function UserManagement({
  users,
  adminUsers,
  currentUserId,
}: {
  users: User[];
  adminUsers: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  const needsReassign = deleteTarget && (deleteTarget.ownedProjects > 0 || deleteTarget.reportedTasks > 0);
  const availableAdmins = adminUsers.filter((a) => a.id !== deleteTarget?.id);

  async function handleDelete() {
    if (!deleteTarget) return;
    if (needsReassign && !reassignTo) {
      toast.error('Select a user to reassign ownership to');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignTo: reassignTo || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      toast.success('User deleted successfully');
      setDeleteTarget(null);
      setReassignTo('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-4 rounded-xl border border-brand bg-surface-2 p-4"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-medium text-red">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user.name || user.email}
              </p>
              <p className="text-xs text-tertiary">{user.email}</p>
            </div>
            <Badge variant="outline" className="capitalize">{user.role}</Badge>
            {user.ownedProjects > 0 && (
              <span className="text-xs text-tertiary">{user.ownedProjects} project{user.ownedProjects !== 1 ? 's' : ''}</span>
            )}
            {user.id !== currentUserId && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteTarget(user)}
                className="text-slate hover:text-danger"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-danger" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {needsReassign && (
            <div className="space-y-3 rounded-lg border border-brand bg-surface-1 p-4">
              <p className="text-sm text-warning">
                This user owns {deleteTarget.ownedProjects} project(s) and reported{' '}
                {deleteTarget.reportedTasks} task(s). You must reassign ownership before deletion.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate">Reassign to</label>
                <Select value={reassignTo} onValueChange={(v) => setReassignTo(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an admin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAdmins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name || admin.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting || (!!needsReassign && !reassignTo)}
              className="bg-red text-white hover:bg-red2"
            >
              {deleting ? 'Deleting…' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
