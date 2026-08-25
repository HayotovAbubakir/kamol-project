'use client';

import { UserAvatar } from '@/components/UserAvatar';
import { WorkerRankBanner, WorkerTitleBadge } from '@/components/WorkerTitleBadge';
import { formatMonthLabel } from '@/lib/monthKey';
import { locText } from '@/lib/rewardCatalog';
import { formatWinMonthList, hasWorkerFeature } from '@/lib/workerGamification';
import { useAppSettings } from '@/context/AppSettingsContext';
import { cn } from '@/lib/utils';
import type { WorkerGamificationProfile } from '@/types';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface WorkerGamificationPanelProps {
  gamification: WorkerGamificationProfile;
  workerName?: string;
  workerId?: string;
  compact?: boolean;
}

export function WorkerGamificationPanel({
  gamification,
  workerName,
  workerId,
  compact = false,
}: WorkerGamificationPanelProps) {
  const { t, locale } = useAppSettings();
  const {
    lifetimePoints,
    monthlyWins,
    firstPlaceCount,
    perks,
    nextPerk,
    nextTitle,
    title,
    specialTitles,
    completionStreak,
    isLegend,
    isCurrentMonthChampion,
    isPointsKing,
    lifetimeRank,
    avatarFrame,
    avatarBadge,
  } = gamification;

  const progressToNext =
    nextPerk && lifetimePoints < nextPerk.points
      ? Math.min(100, Math.round((lifetimePoints / nextPerk.points) * 100))
      : 100;

  const progressToTitle =
    nextTitle && lifetimePoints < nextTitle.minPoints
      ? Math.min(100, Math.round((lifetimePoints / nextTitle.minPoints) * 100))
      : 100;

  return (
    <div className="space-y-4">
      {workerName && workerId && (
        <div className="flex items-center gap-4 rounded-xl border border-app-border bg-app-bg/50 p-4">
          <UserAvatar
            name={workerName}
            seed={workerId}
            size="xl"
            frame={avatarFrame}
            badge={avatarBadge}
            designPassFrameClass={gamification.designPassFrameClass}
            designPassFrameColor={gamification.designPassFrameColor}
          />
          <div className="min-w-0">
            <WorkerTitleBadge title={title} specialTitles={specialTitles} showAll />
            <p className="mt-2 text-xs text-app-muted">
              {lifetimeRank
                ? t('gamification.lifetimeRankLabel').replace('{rank}', String(lifetimeRank))
                : t('gamification.rankBannerNone')}
            </p>
          </div>
        </div>
      )}

      {hasWorkerFeature(gamification, 'rankBanner') && !compact && (
        <WorkerRankBanner
          lifetimeRank={lifetimeRank}
          lifetimePoints={lifetimePoints}
          nextTitle={nextTitle}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-accent/10 to-transparent p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('gamification.lifetimePoints')}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-app-text">{lifetimePoints}</p>
          <p className="mt-1 text-xs text-app-muted">{t('gamification.lifetimeHint')}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-bg/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('gamification.firstPlaceWins')}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-app-text">{firstPlaceCount}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {isPointsKing && (
              <span className="inline-flex rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs font-bold text-cyan-500">
                👑 {t('gamification.title.pointsKing')}
              </span>
            )}
            {isLegend && (
              <span className="inline-flex rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                🏆 {t('gamification.legendBadge')}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-bg/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('gamification.streak')}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-app-text">
            {completionStreak > 0 ? `${completionStreak} 🔥` : '—'}
          </p>
          {isCurrentMonthChampion && (
            <span className="mt-2 inline-flex rounded-full bg-amber-300/15 px-2 py-0.5 text-xs font-bold text-amber-400">
              👑 {t('gamification.currentChampion')}
            </span>
          )}
        </div>
      </div>

      {nextTitle && (
        <div className="rounded-xl border border-app-border bg-app-bg/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-app-text">{t('gamification.nextTitleLabel')}</span>
            <span className="tabular-nums text-app-muted">
              {lifetimePoints} / {nextTitle.minPoints}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-app-border">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${progressToTitle}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            {nextTitle.icon} {t(nextTitle.labelKey)}
          </p>
        </div>
      )}

      {nextPerk && (
        <div className="rounded-xl border border-app-border bg-app-bg/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-app-text">{t('gamification.nextPerk')}</span>
            <span className="tabular-nums text-app-muted">
              {lifetimePoints} / {nextPerk.points}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-app-border">
            <div
              className="h-full rounded-full bg-app-accent transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-app-muted">
            {nextPerk.icon} {locText(nextPerk.label, locale) || t(nextPerk.labelKey)}
          </p>
        </div>
      )}

      {monthlyWins.length > 0 && (
        <div className="rounded-xl border border-app-border bg-app-bg/40 p-4">
          <h4 className="mb-3 text-sm font-semibold text-app-text">{t('gamification.monthlyWins')}</h4>
          <ul className="space-y-2">
            {monthlyWins.map((win) => (
              <li
                key={`${win.month}-${win.rank}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-app-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-app-text">
                    {RANK_MEDAL[win.rank]} {formatMonthLabel(win.month, locale)}
                    {win.live ? ` · ${t('gamification.liveMonth')}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-app-accent">
                  {win.points} {t('rating.pointsUnit')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <div className="rounded-xl border border-app-border bg-app-bg/40 p-4">
          <h4 className="mb-3 text-sm font-semibold text-app-text">{t('gamification.titlesGuide')}</h4>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {[title, ...specialTitles].map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-app-accent/30 bg-app-accent/5 px-3 py-2 text-sm font-medium text-app-text"
              >
                {item.icon} {locText(item.label, locale) || t(item.labelKey)}
              </div>
            ))}
          </div>
          <h4 className="mb-3 text-sm font-semibold text-app-text">{t('gamification.perksTitle')}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {perks.map((perk) => (
              <div
                key={perk.id}
                className={cn(
                  'rounded-lg border px-3 py-2.5 transition',
                  perk.unlocked
                    ? 'border-app-accent/40 bg-app-accent/5'
                    : 'border-app-border/60 bg-app-bg/30 opacity-60',
                )}
              >
                <p className="text-sm font-semibold text-app-text">
                  {perk.icon} {locText(perk.label, locale) || t(perk.labelKey)}
                  {!perk.unlocked && (
                    <span className="ml-2 text-xs font-normal text-app-muted">
                      ({perk.points} {t('rating.pointsUnit')})
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-app-muted">
                  {locText(perk.description, locale) || t(perk.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function HallOfFameMonths({ months, locale }: { months: string[]; locale: string }) {
  if (months.length === 0) return null;
  return <p className="mt-1 text-xs text-app-muted">{formatWinMonthList(months, locale)}</p>;
}
