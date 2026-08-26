'use client';

import { Crown, Trophy } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { HallOfFameMonths } from '@/components/WorkerGamificationPanel';
import { WorkerTitleBadge } from '@/components/WorkerTitleBadge';
import { useAppSettings } from '@/context/AppSettingsContext';
import { cn } from '@/lib/utils';
import type { HallOfFameEntry } from '@/types';

interface LeaderboardHallOfFameProps {
  entries: HallOfFameEntry[];
  onSelectWorker: (workerId: string) => void;
}

export function LeaderboardHallOfFame({ entries, onSelectWorker }: LeaderboardHallOfFameProps) {
  const { t, locale } = useAppSettings();
  const champions = entries.filter((entry) => entry.firstPlaceWins > 0).slice(0, 6);

  if (champions.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-50/80 to-app-card p-4 shadow-sm dark:from-amber-950/20 dark:to-app-card sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-400" strokeWidth={1.9} />
        <div>
          <h2 className="font-display text-base font-semibold text-app-text sm:text-lg">
            {t('gamification.hallOfFame')}
          </h2>
          <p className="text-xs text-app-muted sm:text-sm">{t('gamification.hallOfFameDesc')}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {champions.map((entry, index) => (
          <button
            key={entry.workerId}
            type="button"
            onClick={() => onSelectWorker(entry.workerId)}
            className={cn(
              'rounded-xl border p-4 text-left transition hover:scale-[1.01] active:scale-[0.99]',
              entry.isLegend
                ? 'border-amber-400/50 bg-amber-100/50 dark:bg-amber-900/15'
                : 'border-app-border bg-app-card/80',
            )}
          >
            <div className="flex items-start gap-3">
              <UserAvatar
                name={entry.workerName}
                seed={entry.workerId}
                size="lg"
                frame={entry.avatarFrame}
                badge={entry.avatarBadge}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-app-text">{entry.workerName}</p>
                  {entry.isPointsKing && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-300">
                      <Crown className="h-3 w-3" strokeWidth={2} />
                      {t('gamification.title.pointsKing')}
                    </span>
                  )}
                  {entry.isLegend && (
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                      {t('gamification.legendBadge')}
                    </span>
                  )}
                </div>
                <WorkerTitleBadge
                  title={entry.title}
                  specialTitles={entry.specialTitles}
                  size="sm"
                  className="mt-1"
                />
                <p className="mt-1 text-sm font-bold tabular-nums text-amber-600 dark:text-amber-300">
                  {entry.firstPlaceWins}× {t('gamification.firstPlaceShort')}
                </p>
                <HallOfFameMonths months={entry.winMonths} locale={locale} />
                <p className="mt-1 text-xs text-app-muted">
                  {t('gamification.lifetimeShort')}: {entry.lifetimePoints} {t('rating.pointsUnit')}
                </p>
              </div>
              {index === 0 && entry.isLegend && (
                <Crown className="h-6 w-6 shrink-0 text-amber-400" strokeWidth={1.9} />
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
