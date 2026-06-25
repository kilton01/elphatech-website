'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, X, LayoutDashboard, FolderKanban, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/projects', label: 'Projects', icon: FolderKanban },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/portal/admin/users', label: 'Users', icon: Users },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-9 items-center justify-center rounded-lg text-slate transition-colors hover:bg-white/5 hover:text-white md:hidden"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-surface-2 border-r border-brand transition-transform duration-300 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-brand px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red text-sm font-bold text-white">
            ET
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">ElphaTech</span>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/portal' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red/10 text-red'
                    : 'text-slate hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
