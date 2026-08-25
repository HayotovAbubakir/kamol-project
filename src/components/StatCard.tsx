import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  href?: string;
  hint?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export function StatCard({ label, value, href, hint, icon, compact = false }: StatCardProps) {
  const content = (
    <div
      className={cn(
        'ui-glass-card group relative overflow-hidden rounded-2xl border shadow-[0_12px_32px_rgba(29,39,32,0.07)] dark:ring-1 dark:ring-metallic-green/15',
        compact ? 'p-2.5 tv:p-5' : 'p-5',
        href && 'transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(29,39,32,0.12)] dark:hover:ring-metallic-green/35',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('break-words font-semibold uppercase leading-tight text-app-muted', compact ? 'text-[11px] tracking-wide tv:text-xs tv:tracking-[0.16em]' : 'text-xs tracking-[0.16em]')}>
          {label}
        </p>
        {icon && (
          <span className={cn('flex items-center justify-center rounded-xl bg-app-accent/10 text-app-accent', compact ? 'h-7 w-7 tv:h-10 tv:w-10' : 'h-9 w-9')}>
            {icon}
          </span>
        )}
      </div>
      <p className={cn('font-display font-bold text-app-accent', compact ? 'mt-1 text-xl sm:text-2xl tv:mt-3 tv:text-5xl tv:sm:text-6xl' : 'mt-3 text-3xl sm:mt-4 sm:text-4xl tv:text-5xl')}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-app-muted">{hint}</p>}
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-app-accent/10" />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
