'use client';

import { useAppSettings } from '@/context/AppSettingsContext';
import type { DeadlineUrgency } from '@/types';
import { cn } from '@/lib/utils';

const styles: Record<DeadlineUrgency, string> = {
  green: 'bg-deadline-green/15 text-deadline-green border-deadline-green/30',
  yellow: 'bg-deadline-yellow/15 text-deadline-yellow border-deadline-yellow/30',
  red: 'bg-deadline-red/15 text-deadline-red border-deadline-red/30',
};

interface DeadlineBadgeProps {
  urgency: DeadlineUrgency | null;
  className?: string;
}

export function DeadlineBadge({ urgency, className }: DeadlineBadgeProps) {
  const { t } = useAppSettings();

  if (!urgency) return null;

  const label =
    urgency === 'green'
      ? t('deadline.onTime')
      : urgency === 'yellow'
        ? t('deadline.attention')
        : t('deadline.overdue');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[urgency],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function DeadlineDot({ urgency }: { urgency: DeadlineUrgency | null }) {
  if (!urgency) return null;
  const dot: Record<DeadlineUrgency, string> = {
    green: 'bg-deadline-green',
    yellow: 'bg-deadline-yellow',
    red: 'bg-deadline-red',
  };
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dot[urgency])} />;
}
