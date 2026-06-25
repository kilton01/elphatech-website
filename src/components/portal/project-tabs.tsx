'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const tabs = [
  { href: '', label: 'Overview' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/files', label: 'Files' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/members', label: 'Members' },
  { href: '/activity', label: 'Activity' },
];

export default function ProjectTabs({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/portal/projects/${projectId}`;

  return (
    <div className="space-y-6">
      <nav className="inline-flex h-8 items-center gap-1 rounded-lg bg-muted p-[3px]">
        {tabs.map((tab) => {
          const href = `${base}${tab.href}`;
          const isActive = pathname === href || (tab.href !== '' && pathname.startsWith(href));
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-0.5 text-sm font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm dark:bg-input/30'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
