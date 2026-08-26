'use client';

import { useMemo } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { PlaceMedal } from '@/components/icons/RankIcons';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { LeaderboardHallOfFame } from '@/components/LeaderboardHallOfFame';
import { SkeletonTable } from '@/components/Skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { WorkerTitleBadge } from '@/components/WorkerTitleBadge';
import { formatMonthLabel, monthName, parseMonthKey } from '@/lib/monthKey';
import { cn } from '@/lib/utils';
import { useAppSettings } from '@/context/AppSettingsContext';
import type { HallOfFameEntry, MonthlyLeaderboardEntry } from '@/types';

interface LeaderboardViewProps {
  month: string;
  months: string[];
  entries: MonthlyLeaderboardEntry[];
  hallOfFame?: HallOfFameEntry[];
  loading?: boolean;
  onMonthChange: (month: string) => void;
  onSelectWorker: (workerId: string) => void;
}

const MONTH_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function LeaderboardView({
  month,
  months,
  entries,
  hallOfFame = [],
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
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <select
              value={parsed?.month ?? 1}
              onChange={(e) => setMonthNum(Number(e.target.value))}
              className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-base font-medium text-app-text sm:w-auto sm:py-2 sm:text-sm"
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
              className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-base font-medium text-app-text sm:w-auto sm:py-2 sm:text-sm"
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

      {!loading && hallOfFame.length > 0 && (
        <LeaderboardHallOfFame entries={hallOfFame} onSelectWorker={onSelectWorker} />
      )}

      {loading ? (
        <SkeletonTable rows={6} />
      ) : entries.length === 0 ? (
        <EmptyState title={t('leaderboard.empty')} description={t('leaderboard.emptyDesc')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm dark:ring-1 dark:ring-metallic-green/15">
          <div className="hidden grid-cols-12 border-b border-app-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted md:grid">
            <div className="col-span-2">{t('leaderboard.rank')}</div>
            <div className="col-span-6">{t('dashboard.nameCol')}</div>
            <div className="col-span-2 text-right">{t('gamification.lifetimeShort')}</div>
            <div className="col-span-2 text-right">{t('leaderboard.points')} · {monthLabel}</div>
          </div>
          {entries.map((entry) => {
            const podium = entry.rank <= 3 && entry.monthlyPoints > 0;
            return (
              <button
                key={entry.workerId}
                type="button"
                onClick={() => onSelectWorker(entry.workerId)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-2 border-b border-app-border px-4 py-4 text-left last:border-0 transition hover:bg-app-bg/60 md:grid md:grid-cols-12 md:gap-2 md:px-5',
                  entry.rank === 1 && entry.monthlyPoints > 0 && 'bg-amber-50/80 dark:bg-amber-900/10',
                  entry.rank === 2 && entry.monthlyPoints > 0 && 'bg-slate-50/80 dark:bg-slate-800/20',
                  entry.rank === 3 && entry.monthlyPoints > 0 && 'bg-orange-50/70 dark:bg-orange-900/10',
                  entry.isLegend && 'ring-1 ring-inset ring-amber-400/30',
                )}
              >
                <div className="flex shrink-0 items-center gap-2 md:col-span-2">
                  {podium && entry.rank <= 3 ? <PlaceMedal place={entry.rank as 1 | 2 | 3} className="h-5 w-5" /> : <span className="w-5" />}
                  <span className="text-sm font-semibold tabular-nums text-app-text">{entry.rank}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3 md:col-span-6">
                  <UserAvatar
                    name={entry.workerName}
                    seed={entry.workerId}
                    size="lg"
                    frame={entry.avatarFrame ?? 'default'}
                    badge={entry.avatarBadge}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="min-w-0 truncate font-medium text-app-text">{entry.workerName}</p>
                      {entry.isPointsKing && (
                        <span className="inline-flex rounded-full bg-cyan-400/15 p-1 text-cyan-500">
                          <Crown className="h-3 w-3" strokeWidth={2} />
                        </span>
                      )}
                      {entry.isCurrentMonthChampion && (
                        <span className="inline-flex rounded-full bg-amber-400/15 p-1 text-amber-500">
                          <PlaceMedal place={1} className="h-3 w-3" />
                        </span>
                      )}
                      {entry.isLegend && (
                        <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-500">
                          {t('gamification.legendBadge')}
                        </span>
                      )}
                      {(entry.firstPlaceWins ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-app-bg px-1.5 py-0.5 text-[10px] font-semibold text-app-muted">
                          {entry.firstPlaceWins}×
                          <Trophy className="h-3 w-3 text-amber-400" strokeWidth={2} />
                        </span>
                      )}
                    </div>
                    {entry.title && (
                      <WorkerTitleBadge
                        title={entry.title}
                        specialTitles={entry.specialTitles}
                        size="sm"
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
                <p className="hidden min-w-0 shrink-0 whitespace-nowrap text-right text-xs font-medium tabular-nums text-app-muted md:col-span-2 md:block">
                  {entry.lifetimePoints ?? 0}
                </p>
                <p className="min-w-0 shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-app-text md:col-span-2">
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
