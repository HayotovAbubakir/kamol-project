import { formatMonthLabel, monthName } from '@/lib/monthKey';

export type CompletedDatePreset =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export type CompletedDateSelection =
  | { kind: 'preset'; preset: CompletedDatePreset }
  | { kind: 'month'; monthKey: string }
  | { kind: 'custom'; start: string; end: string };

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfLocalWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function startOfLocalMonth(date: Date): Date {
  const start = startOfLocalDay(date);
  start.setDate(1);
  return start;
}

function endOfLocalMonth(date: Date): Date {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateParam(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function getCompletedDateRange(
  selection: CompletedDateSelection,
  now = new Date(),
): { start: Date; end: Date } {
  if (selection.kind === 'month') {
    const [y, m] = selection.monthKey.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    return { start: startOfLocalDay(start), end: endOfLocalMonth(start) };
  }

  if (selection.kind === 'custom') {
    const startRaw = parseDateParam(selection.start);
    const endRaw = parseDateParam(selection.end);
    if (!startRaw || !endRaw) {
      return { start: startOfLocalWeek(now), end: endOfLocalDay(now) };
    }
    const start = startOfLocalDay(startRaw);
    const end = endOfLocalDay(endRaw);
    if (start.getTime() > end.getTime()) {
      return { start: startOfLocalDay(endRaw), end: endOfLocalDay(startRaw) };
    }
    return { start, end };
  }

  switch (selection.preset) {
    case 'this_month':
      return { start: startOfLocalMonth(now), end: endOfLocalDay(now) };
    case 'last_month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfLocalMonth(prev), end: endOfLocalMonth(prev) };
    }
    case 'this_week':
    default:
      return { start: startOfLocalWeek(now), end: endOfLocalDay(now) };
  }
}

export function buildMonthPresetOptions(
  locale: string,
  now = new Date(),
  monthsBack = 12,
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < monthsBack; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({
      value,
      label: formatMonthLabel(value, locale),
    });
  }
  return options;
}

export function formatCompletedPeriodLabel(start: Date, end: Date, locale: string): string {
  const month = monthName(start.getMonth() + 1, locale);
  const year = start.getFullYear();
  const sameDay = toDateParam(start) === toDateParam(end);
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

  if (sameDay) {
    return `${start.getDate()} ${month} ${year}`;
  }
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${month} ${year}`;
  }

  const endMonth = monthName(end.getMonth() + 1, locale);
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${month} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${month} ${start.getFullYear()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

export function selectionFromSelectValue(value: string): CompletedDateSelection {
  if (value === 'custom') return { kind: 'custom', start: '', end: '' };
  if (value.startsWith('month:')) {
    return { kind: 'month', monthKey: value.slice('month:'.length) };
  }
  if (value === 'this_month' || value === 'last_month' || value === 'this_week') {
    return { kind: 'preset', preset: value };
  }
  return { kind: 'preset', preset: 'this_week' };
}

export function selectValueFromSelection(selection: CompletedDateSelection): string {
  if (selection.kind === 'month') return `month:${selection.monthKey}`;
  if (selection.kind === 'custom') return 'custom';
  return selection.preset;
}

export function isOrderDateInRange(orderDate: string, start: Date, end: Date): boolean {
  const order = new Date(orderDate);
  if (Number.isNaN(order.getTime())) return false;
  return order.getTime() >= start.getTime() && order.getTime() <= end.getTime();
}

export function filterProjectsByOrderDate<T extends { orderDate: string }>(
  projects: T[],
  selection: CompletedDateSelection,
  now = new Date(),
): T[] {
  if (selection.kind === 'custom' && (!selection.start.trim() || !selection.end.trim())) {
    return [];
  }
  const { start, end } = getCompletedDateRange(selection, now);
  return projects.filter((project) => isOrderDateInRange(project.orderDate, start, end));
}
