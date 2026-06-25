'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';

const priorityConfig = {
  low: { label: 'Low', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const;

interface TaskCardProps {
  id: string;
  title: string;
  priority: keyof typeof priorityConfig;
  assigneeName?: string | null;
  dueDate?: string | null;
  onClick?: () => void;
}

export default function TaskCard({ id, title, priority, assigneeName, dueDate, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const initials = assigneeName
    ? assigneeName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  const config = priorityConfig[priority];
  const dueDateObj = dueDate ? new Date(dueDate) : null;
  const isOverdue = dueDateObj ? dueDateObj < new Date() : false;
  const isDueSoon = dueDateObj && !isOverdue
    ? dueDateObj.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) onClick();
      }}
      className={cn(
        'group cursor-grab rounded-lg border border-subtle bg-surface-2 p-3 text-sm shadow-brand-xs transition-all',
        'hover:border-strong hover:shadow-brand-sm hover:-translate-y-0.5',
        'active:cursor-grabbing',
        isDragging && 'rotate-1 scale-[1.02] shadow-brand-md border-brand-accent opacity-95',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium leading-snug text-white">{title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {initials && (
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-muted text-[10px] font-medium text-red">
              {initials}
            </span>
          )}
          <MoreHorizontal className="size-4 text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn('text-[10px]', config.className)}>
          {config.label}
        </Badge>
        {dueDateObj && (
          <span className={cn(
            'text-[10px] font-medium',
            isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-tertiary',
          )}>
            {formatShortDate(dueDateObj)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatShortDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
