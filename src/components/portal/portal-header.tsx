'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function PortalHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="flex h-14 items-center justify-end gap-3 border-b border-brand bg-navy px-6">
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <p className="font-medium text-white">{user?.name ?? 'User'}</p>
          <p className="text-slate">{user?.email}</p>
        </div>
        <Avatar size="sm">
          <AvatarFallback className="bg-red text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-slate hover:text-white"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
