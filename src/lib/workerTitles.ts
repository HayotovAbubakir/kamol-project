import type { DataStore, WorkerTitleInfo } from '@/types';

export interface TitleTier {
  id: string;
  minPoints: number;
  icon: string;
  labelKey: string;
  frame?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'champion';
}

export const LIFETIME_TITLE_TIERS: TitleTier[] = [
  { id: 'newcomer', minPoints: 0, icon: '🌱', labelKey: 'gamification.title.newcomer' },
  { id: 'active', minPoints: 50, icon: '⚡', labelKey: 'gamification.title.active' },
  { id: 'skilled', minPoints: 150, icon: '🔧', labelKey: 'gamification.title.skilled' },
  { id: 'pro', minPoints: 300, icon: '⭐', labelKey: 'gamification.title.pro', frame: 'bronze' },
  { id: 'master', minPoints: 500, icon: '🛠️', labelKey: 'gamification.title.master', frame: 'silver' },
  { id: 'expert', minPoints: 800, icon: '💎', labelKey: 'gamification.title.expert', frame: 'gold' },
  { id: 'champion', minPoints: 1200, icon: '🏆', labelKey: 'gamification.title.champion', frame: 'platinum' },
  { id: 'grandmaster', minPoints: 1800, icon: '👑', labelKey: 'gamification.title.grandmaster', frame: 'diamond' },
  { id: 'immortal', minPoints: 2500, icon: '🔥', labelKey: 'gamification.title.immortal', frame: 'diamond' },
];

export function resolveLifetimeTitle(lifetimePoints: number): WorkerTitleInfo {
  let current = LIFETIME_TITLE_TIERS[0];
  for (const tier of LIFETIME_TITLE_TIERS) {
    if (lifetimePoints >= tier.minPoints) current = tier;
  }
  return {
    id: current.id,
    icon: current.icon,
    labelKey: current.labelKey,
    kind: 'rank',
  };
}

export function resolveNextTitle(lifetimePoints: number): {
  labelKey: string;
  icon: string;
  minPoints: number;
} | null {
  const next = LIFETIME_TITLE_TIERS.find((tier) => lifetimePoints < tier.minPoints);
  if (!next) return null;
  return { labelKey: next.labelKey, icon: next.icon, minPoints: next.minPoints };
}

export function getLifetimePointsRanking(store: DataStore): { workerId: string; points: number }[] {
  const workers = store.users.filter((user) => user.role === 'worker');
  return workers
    .map((worker) => ({
      workerId: worker.id,
      points: (store.ratingEntries ?? [])
        .filter((entry) => entry.workerId === worker.id)
        .reduce((sum, entry) => sum + entry.points, 0),
    }))
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points);
}

export function getLifetimeRank(store: DataStore, workerId: string): number | null {
  const ranking = getLifetimePointsRanking(store);
  const index = ranking.findIndex((entry) => entry.workerId === workerId);
  return index >= 0 ? index + 1 : null;
}

export function getPointsKingId(store: DataStore): string | null {
  const ranking = getLifetimePointsRanking(store);
  return ranking[0]?.workerId ?? null;
}

export function resolveSpecialTitles(
  store: DataStore,
  workerId: string,
  opts: {
    isLegend: boolean;
    isCurrentMonthChampion: boolean;
    firstPlaceCount: number;
  },
): WorkerTitleInfo[] {
  const titles: WorkerTitleInfo[] = [];
  const pointsKingId = getPointsKingId(store);

  if (pointsKingId === workerId) {
    titles.push({
      id: 'points_king',
      icon: '👑',
      labelKey: 'gamification.title.pointsKing',
      kind: 'special',
    });
  }

  if (opts.isCurrentMonthChampion) {
    titles.push({
      id: 'month_champion',
      icon: '🥇',
      labelKey: 'gamification.title.monthChampion',
      kind: 'special',
    });
  }

  if (opts.isLegend && opts.firstPlaceCount >= 2) {
    titles.push({
      id: 'legend',
      icon: '🏆',
      labelKey: 'gamification.title.legend',
      kind: 'special',
    });
  }

  const rank = getLifetimeRank(store, workerId);
  if (rank === 2) {
    titles.push({
      id: 'silver_elite',
      icon: '🥈',
      labelKey: 'gamification.title.silverElite',
      kind: 'special',
    });
  } else if (rank === 3) {
    titles.push({
      id: 'bronze_elite',
      icon: '🥉',
      labelKey: 'gamification.title.bronzeElite',
      kind: 'special',
    });
  }

  return titles;
}

export function resolveTitleAvatarFrame(
  lifetimePoints: number,
  specialTitles: WorkerTitleInfo[],
  isCurrentMonthChampion: boolean,
  isLegend: boolean,
): 'default' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'champion' {
  if (specialTitles.some((title) => title.id === 'points_king')) return 'diamond';
  if (isLegend || specialTitles.some((title) => title.id === 'legend')) return 'legend';
  if (isCurrentMonthChampion || specialTitles.some((title) => title.id === 'month_champion')) {
    return 'champion';
  }

  let tierFrame: TitleTier['frame'] | undefined;
  for (const tier of LIFETIME_TITLE_TIERS) {
    if (lifetimePoints >= tier.minPoints) tierFrame = tier.frame;
  }

  if (tierFrame) return tierFrame;
  return 'default';
}

export function resolveAvatarBadge(
  title: WorkerTitleInfo,
  specialTitles: WorkerTitleInfo[],
): string {
  if (specialTitles.some((item) => item.id === 'points_king')) return '👑';
  if (specialTitles.some((item) => item.id === 'month_champion')) return '🥇';
  if (specialTitles.some((item) => item.id === 'legend')) return '🏆';
  return title.icon;
}
