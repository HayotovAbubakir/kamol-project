'use client';

import { useMemo } from 'react';
import { useAppSettings } from '@/context/AppSettingsContext';
import { uiInputClass, uiSelectClass } from '@/components/ui';
import {
  buildMonthPresetOptions,
  type CompletedDateSelection,
  selectValueFromSelection,
  selectionFromSelectValue,
} from '@/lib/completedDateFilter';
import { cn } from '@/lib/utils';

interface CompletedDateFilterProps {
  selection: CompletedDateSelection;
  onChange: (selection: CompletedDateSelection) => void;
  className?: string;
}

export function CompletedDateFilter({
  selection,
  onChange,
  className,
}: CompletedDateFilterProps) {
  const { t, locale } = useAppSettings();

  const monthOptions = useMemo(
    () => buildMonthPresetOptions(locale),
    [locale],
  );

  const selectValue = selectValueFromSelection(selection);

  function handleSelectChange(value: string) {
    const next = selectionFromSelectValue(value);
    if (next.kind === 'custom') {
      onChange({
        kind: 'custom',
        start: selection.kind === 'custom' ? selection.start : '',
        end: selection.kind === 'custom' ? selection.end : '',
      });
      return;
    }
    onChange(next);
  }

  return (
    <div className={cn('flex flex-col gap-2 sm:items-end', className)}>
      <label className="inline-flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[12rem]">
        <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">
          {t('worker.completedPeriodFilter')}
        </span>
        <select
          value={selectValue}
          onChange={(e) => handleSelectChange(e.target.value)}
          className={cn(uiSelectClass, 'w-full sm:min-w-[12rem]')}
        >
          <option value="this_week">{t('worker.completedThisWeek')}</option>
          <option value="this_month">{t('worker.completedThisMonth')}</option>
          <option value="last_month">{t('worker.completedLastMonth')}</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={`month:${month.value}`}>
              {month.label}
            </option>
          ))}
          <option value="custom">{t('worker.completedCustomRange')}</option>
        </select>
      </label>

      {selection.kind === 'custom' && (
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-app-muted">
            {t('worker.completedRangeStart')}
            <input
              type="date"
              value={selection.start}
              onChange={(e) =>
                onChange({ kind: 'custom', start: e.target.value, end: selection.end })
              }
              className={uiInputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-app-muted">
            {t('worker.completedRangeEnd')}
            <input
              type="date"
              value={selection.end}
              onChange={(e) =>
                onChange({ kind: 'custom', start: selection.start, end: e.target.value })
              }
              className={uiInputClass}
            />
          </label>
        </div>
      )}
    </div>
  );
}
