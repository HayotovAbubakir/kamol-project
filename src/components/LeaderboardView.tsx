'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { formatMonthLabel, monthName, parseMonthKey } from '@/lib/monthKey';
import { cn } from '@/lib/utils';
import { useAppSettings } from '@/context/AppSettingsContext';
import type { MonthlyLeaderboardEntry } from '@/types';

interface LeaderboardViewProps {
  month: string;
  months: string[];
  entries: MonthlyLeaderboardEntry[];
  loading?: boolean;
  onMonthChange: (month: string) => void;
  onSelectWorker: (workerId: string) => void;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MONTH_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function LeaderboardView({
  month,
  months,
  entries,
  loading,
  onMonthChange,
  onSelectWorker,
}: LeaderboardViewProps) {
  const { t, locale } = useAppSettings();
  const parsed = parseMonthKey(month);
  const monthLabel = useMemo(() => formatMonthLabel(month, locale), [month, locale]);

  const years = useMemo(() => {
    const set = new Set<number>();
    const nowYear = new Date().getFullYear();
    set.add(nowYear);
    set.add(nowYear - 1);
    for (const key of months) {
      const p = parseMonthKey(key);
      if (p) set.add(p.year);
    }
    if (parsed) set.add(parsed.year);
    return [...set].sort((a, b) => b - a);
  }, [months, parsed]);

  function setYear(year: number) {
    const m = parsed?.month ?? 1;
    onMonthChange(`${year}-${String(m).padStart(2, '0')}`);
  }

  function setMonthNum(monthNum: number) {
    const y = parsed?.year ?? new Date().getFullYear();
    onMonthChange(`${y}-${String(monthNum).padStart(2, '0')}`);
  }

  return (
    <>
      <PageHeader
        title={t('leaderboard.title')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-app-muted">{t('leaderboard.month')}</span>
            <select
              value={parsed?.month ?? 1}
              onChange={(e) => setMonthNum(Number(e.target.value))}
              className="rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-text"
              aria-label={t('leaderboard.month')}
            >
              {MONTH_INDEXES.map((n) => (
                <option key={n} value={n}>
                  {monthName(n, locale)}
                </option>
              ))}
            </select>
            <select
              value={parsed?.year ?? new Date().getFullYear()}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-text"
              aria-label={t('leaderboard.year')}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {loading ? (
        <SkeletonTable rows={6} />
      ) : entries.length === 0 ? (
        <EmptyState title={t('leaderboard.empty')} description={t('leaderboard.emptyDesc')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm dark:ring-1 dark:ring-metallic-green/15">
          <div className="hidden grid-cols-12 border-b border-app-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted sm:grid">
            <div className="col-span-2">{t('leaderboard.rank')}</div>
            <div className="col-span-7">{t('dashboard.nameCol')}</div>
            <div className="col-span-3 text-right">{t('leaderboard.points')} · {monthLabel}</div>
          </div>
          {entries.map((entry) => {
            const podium = entry.rank <= 3 && entry.monthlyPoints > 0;
            return (
              <button
                key={entry.workerId}
                type="button"
                onClick={() => onSelectWorker(entry.workerId)}
                className={cn(
                  'grid w-full grid-cols-12 items-center gap-2 border-b border-app-border px-5 py-4 text-left last:border-0 transition hover:bg-app-bg/60',
                  entry.rank === 1 && entry.monthlyPoints > 0 && 'bg-amber-50/80 dark:bg-amber-900/10',
                  entry.rank === 2 && entry.monthlyPoints > 0 && 'bg-slate-50/80 dark:bg-slate-800/20',
                  entry.rank === 3 && entry.monthlyPoints > 0 && 'bg-orange-50/70 dark:bg-orange-900/10',
                )}
              >
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-lg">{podium ? RANK_MEDAL[entry.rank] : null}</span>
                  <span className="text-sm font-semibold tabular-nums text-app-text">{entry.rank}</span>
                </div>
                <div className="col-span-7 flex min-w-0 items-center gap-3">
                  <UserAvatar name={entry.workerName} seed={entry.workerId} size="lg" />
                  <p className="truncate font-medium text-app-text">{entry.workerName}</p>
                </div>
                <p className="col-span-3 min-w-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-app-text">
                  {entry.monthlyPoints} {t('rating.pointsUnit')}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

