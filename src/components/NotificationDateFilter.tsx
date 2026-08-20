'use client';

import { useAppSettings } from '@/context/AppSettingsContext';
import { uiSelectClass } from '@/components/ui';
import type { NotificationDatePreset } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NotificationDateFilterProps {
  value: NotificationDatePreset;
  onChange: (value: NotificationDatePreset) => void;
  className?: string;
}

const PRESETS: NotificationDatePreset[] = [
  'this_week',
  'today',
  'yesterday',
  'day_before_yesterday',
];

export function NotificationDateFilter({
  value,
  onChange,
  className,
}: NotificationDateFilterProps) {
  const { t } = useAppSettings();

  const labels: Record<NotificationDatePreset, string> = {
    this_week: t('notifications.filterThisWeek'),
    today: t('notifications.filterToday'),
    yesterday: t('notifications.filterYesterday'),
    day_before_yesterday: t('notifications.filterDayBeforeYesterday'),
  };

  return (
    <label className={cn('inline-flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">
        {t('notifications.dateFilter')}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as NotificationDatePreset)}
        className={cn(uiSelectClass, 'min-w-[11.5rem]')}
      >
        {PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {labels[preset]}
          </option>
        ))}
      </select>
    </label>
  );
}
