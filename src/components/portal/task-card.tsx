'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  onClick?: () => void;
}

export default function TaskCard({ id, title, priority, assigneeName, onClick }: TaskCardProps) {
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
        'cursor-grab rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors hover:border-foreground/20 active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium leading-snug text-card-foreground">{title}</p>
        {initials && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {initials}
          </span>
        )}
      </div>
      <Badge variant="outline" className={cn('text-[10px]', config.className)}>
        {config.label}
      </Badge>
    </div>
  );
}
