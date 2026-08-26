'use client';

import { Crown, Flame, Trophy } from 'lucide-react';
import { PlaceMedal, RankIcon, TitleIcon } from '@/components/icons/RankIcons';
import { UserAvatar } from '@/components/UserAvatar';
import { WorkerRankBanner, WorkerTitleBadge } from '@/components/WorkerTitleBadge';
import { formatMonthLabel } from '@/lib/monthKey';
import { locText } from '@/lib/rewardCatalog';
import { formatWinMonthList, hasWorkerFeature } from '@/lib/workerGamification';
import { LIFETIME_TITLE_TIERS } from '@/lib/workerTitles';
import { useAppSettings } from '@/context/AppSettingsContext';
import { cn } from '@/lib/utils';
import type { WorkerGamificationProfile } from '@/types';

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
    nextTitle,
    title,
    specialTitles,
    completionStreak,
    isLegend,
    isCurrentMonthChampion,
    isPointsKing,
    lifetimeRank,
    avatarFrame,
  } = gamification;

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
            designPassFrameClass={gamification.designPassFrameClass}
            designPassFrameColor={gamification.designPassFrameColor}
          />
          <div className="min-w-0">
            <WorkerTitleBadge title={title} specialTitles={specialTitles} showAll />
            {lifetimeRank ? (
              <p className="mt-2 text-xs text-app-muted">
                {t('gamification.lifetimeRankLabel').replace('{rank}', String(lifetimeRank))}
              </p>
            ) : null}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs font-bold text-cyan-500">
                <Crown className="h-3.5 w-3.5" strokeWidth={2} />
                {t('gamification.title.pointsKing')}
              </span>
            )}
            {isLegend && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                {t('gamification.legendBadge')}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-bg/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('gamification.streak')}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-3xl font-bold tabular-nums text-app-text">
            {completionStreak > 0 ? (
              <>
                {completionStreak}
                <Flame className="h-6 w-6 text-orange-400" strokeWidth={2} />
              </>
            ) : (
              '—'
            )}
          </p>
          {isCurrentMonthChampion && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-xs font-bold text-amber-400">
              <Crown className="h-3.5 w-3.5" strokeWidth={2} />
              {t('gamification.currentChampion')}
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
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-app-muted">
            <RankIcon id={nextTitle.id} />
            {t(nextTitle.labelKey)}
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
                <div className="flex min-w-0 items-center gap-2">
                  <PlaceMedal place={win.rank} />
                  <p className="text-sm font-medium text-app-text">
                    {formatMonthLabel(win.month, locale)}
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

      <div className="rounded-xl border border-app-border bg-app-bg/40 p-4">
        {!compact && (
          <>
            <h4 className="mb-3 text-sm font-semibold text-app-text">{t('gamification.titlesGuide')}</h4>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {[title, ...specialTitles].map((item) => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-app-accent/30 bg-app-accent/5 px-3 py-2 text-sm font-medium text-app-text"
                >
                  <TitleIcon id={item.icon || item.id} />
                  {locText(item.label, locale) || t(item.labelKey)}
                </div>
              ))}
            </div>
          </>
        )}
        <h4 className="mb-3 text-sm font-semibold text-app-text">{t('gamification.ranksTitle')}</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {LIFETIME_TITLE_TIERS.map((tier) => {
            const unlocked = lifetimePoints >= tier.minPoints;
            const current = title.id === tier.id;
            return (
              <div
                key={tier.id}
                className={cn(
                  'rounded-lg border px-3 py-2.5 transition',
                  current
                    ? 'border-app-accent/50 bg-app-accent/10'
                    : unlocked
                      ? 'border-app-accent/30 bg-app-accent/5'
                      : 'border-app-border/60 bg-app-bg/30 opacity-60',
                )}
              >
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-app-text">
                  <RankIcon id={tier.id} />
                  {t(tier.labelKey)}
                  <span className="text-xs font-normal text-app-muted">
                    ({tier.minPoints} {t('rating.pointsUnit')})
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-app-muted">{t(tier.descKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HallOfFameMonths({ months, locale }: { months: string[]; locale: string }) {
  if (months.length === 0) return null;
  return <p className="mt-1 text-xs text-app-muted">{formatWinMonthList(months, locale)}</p>;
}
