import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}

export function PageHeader({ title, description, subtitle, actions, compact = false }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4', compact ? 'mb-2 sm:mb-3 tv:mb-4' : 'mb-4 sm:mb-6 md:mb-8')}>
      <div className="min-w-0">
        <div className={cn('rounded-full bg-app-accent', compact ? 'mb-1 h-0.5 w-8 tv:mb-2 tv:h-1 tv:w-12' : 'mb-2 h-1 w-10 sm:mb-3 sm:w-12')} />
        <h1
          className={cn(
            'break-words font-display font-bold tracking-tight text-app-text',
            compact
              ? 'text-lg sm:text-xl md:text-2xl tv:text-3xl tv:md:text-4xl'
              : 'text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] tv:text-5xl',
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm font-medium text-app-muted sm:text-base">
            {subtitle}
          </p>
        )}
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-app-muted sm:text-base tv:max-w-3xl tv:text-lg">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end [&>*]:w-full sm:[&>*]:w-auto [&>a>button]:w-full sm:[&>a>button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
