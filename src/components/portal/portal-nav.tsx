'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/projects', label: 'Projects', icon: FolderKanban },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
];

export default function PortalNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col bg-navy2">
      <div className="flex h-14 items-center gap-2 border-b border-brand px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-red text-sm font-bold text-white">
          ET
        </div>
        <span className="text-sm font-semibold text-white">ElphaTech</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/portal' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
    </aside>
  );
}
