import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}

export function PageHeader({ title, description, actions, compact = false }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between', compact ? 'mb-1.5' : 'mb-6')}>
      <div>
        <div className={cn('rounded-full bg-app-accent', compact ? 'mb-1 h-0.5 w-8' : 'mb-3 h-1 w-12')} />
        <h1 className={cn('font-display font-bold tracking-tight text-app-text', compact ? 'text-lg sm:text-xl' : 'text-4xl')}>
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-app-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
