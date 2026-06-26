'use client';

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import MobileNav from './mobile-nav';
import NotificationBell from './notification-bell';

export default function PortalHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-brand bg-navy/80 px-4 backdrop-blur-md md:justify-end md:px-6">
      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-3 md:hidden">
        <MobileNav />
        <Image src="/logo.png" alt="ElphaTech Solutions" width={100} height={34} className="h-7 w-auto" />
      </div>

      {/* User section */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="h-5 w-px bg-white/10" />
        <div className="hidden text-right text-xs sm:block">
          <p className="font-medium text-white">{user?.name ?? 'User'}</p>
          <p className="text-slate">{user?.email}</p>
        </div>
        <Avatar size="sm">
          <AvatarFallback className="bg-red text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="ml-1 h-5 w-px bg-white/10" />
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
