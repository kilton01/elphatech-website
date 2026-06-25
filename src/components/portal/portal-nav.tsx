'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, FolderKanban, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/projects', label: 'Projects', icon: FolderKanban },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/portal/admin/users', label: 'Users', icon: Users },
];

export default function PortalNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-brand bg-navy2 md:flex">
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
