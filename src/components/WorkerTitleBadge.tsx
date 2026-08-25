'use client';

import { useAppSettings } from '@/context/AppSettingsContext';
import { locText } from '@/lib/rewardCatalog';
import { cn } from '@/lib/utils';
import type { WorkerTitleInfo } from '@/types';

interface WorkerTitleBadgeProps {
  title: WorkerTitleInfo;
  specialTitles?: WorkerTitleInfo[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showAll?: boolean;
}

const SIZE_CLASS = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function WorkerTitleBadge({
  title,
  specialTitles = [],
  size = 'md',
  className,
  showAll = false,
}: WorkerTitleBadgeProps) {
  const { t, locale } = useAppSettings();
  const items = showAll ? [title, ...specialTitles] : [specialTitles[0] ?? title];

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {items.map((item) => (
        <span
          key={item.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold',
            SIZE_CLASS[size],
            item.kind === 'special'
              ? 'bg-amber-400/15 text-amber-600 dark:text-amber-300'
              : 'bg-app-accent/10 text-app-accent',
          )}
        >
          <span aria-hidden>{item.icon}</span>
          {locText(item.label, locale) || t(item.labelKey)}
        </span>
      ))}
    </span>
  );
}

interface WorkerRankBannerProps {
  lifetimeRank: number | null;
  lifetimePoints: number;
  nextTitle: { labelKey: string; icon: string; minPoints: number } | null;
  className?: string;
}

export function WorkerRankBanner({
  lifetimeRank,
  lifetimePoints,
  nextTitle,
  className,
}: WorkerRankBannerProps) {
  const { t } = useAppSettings();

  return (
    <div
      className={cn(
        'rounded-xl border border-app-accent/25 bg-gradient-to-r from-app-accent/10 via-transparent to-app-accent/5 p-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">
            {lifetimeRank
              ? t('gamification.rankBanner').replace('{rank}', String(lifetimeRank))
              : t('gamification.rankBannerNone')}
          </p>
          {nextTitle && (
            <p className="mt-1 text-xs text-app-muted">
              {nextTitle.icon}{' '}
              {t('gamification.nextTitle')
                .replace('{title}', t(nextTitle.labelKey))
                .replace('{points}', String(nextTitle.minPoints - lifetimePoints))}
            </p>
          )}
        </div>
        {lifetimeRank === 1 && <span className="text-2xl">👑</span>}
      </div>
    </div>
  );
}
