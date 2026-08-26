import type { DataStore, WorkerTitleInfo } from '@/types';

export interface TitleTier {
  id: string;
  minPoints: number;
  icon: string;
  labelKey: string;
  descKey: string;
  frame?: 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'champion';
}

export const LIFETIME_TITLE_TIERS: TitleTier[] = [
  { id: 'iron', minPoints: 0, icon: 'iron', labelKey: 'gamification.title.iron', descKey: 'gamification.title.ironDesc', frame: 'iron' },
  { id: 'bronze', minPoints: 50, icon: 'bronze', labelKey: 'gamification.title.bronze', descKey: 'gamification.title.bronzeDesc', frame: 'bronze' },
  { id: 'silver', minPoints: 150, icon: 'silver', labelKey: 'gamification.title.silver', descKey: 'gamification.title.silverDesc', frame: 'silver' },
  { id: 'gold', minPoints: 300, icon: 'gold', labelKey: 'gamification.title.gold', descKey: 'gamification.title.goldDesc', frame: 'gold' },
  { id: 'platinum', minPoints: 500, icon: 'platinum', labelKey: 'gamification.title.platinum', descKey: 'gamification.title.platinumDesc', frame: 'platinum' },
  { id: 'diamond', minPoints: 800, icon: 'diamond', labelKey: 'gamification.title.diamond', descKey: 'gamification.title.diamondDesc', frame: 'diamond' },
  { id: 'master', minPoints: 1200, icon: 'master', labelKey: 'gamification.title.master', descKey: 'gamification.title.masterDesc', frame: 'diamond' },
  { id: 'grandmaster', minPoints: 1800, icon: 'grandmaster', labelKey: 'gamification.title.grandmaster', descKey: 'gamification.title.grandmasterDesc', frame: 'champion' },
  { id: 'epic', minPoints: 2500, icon: 'epic', labelKey: 'gamification.title.epic', descKey: 'gamification.title.epicDesc', frame: 'legend' },
  { id: 'legend', minPoints: 3500, icon: 'legend', labelKey: 'gamification.title.rankLegend', descKey: 'gamification.title.rankLegendDesc', frame: 'legend' },
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
  id: string;
  labelKey: string;
  icon: string;
  minPoints: number;
} | null {
  const next = LIFETIME_TITLE_TIERS.find((tier) => lifetimePoints < tier.minPoints);
  if (!next) return null;
  return { id: next.id, labelKey: next.labelKey, icon: next.icon, minPoints: next.minPoints };
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
      icon: 'points_king',
      labelKey: 'gamification.title.pointsKing',
      kind: 'special',
    });
  }

  if (opts.isCurrentMonthChampion) {
    titles.push({
      id: 'month_champion',
      icon: 'month_champion',
      labelKey: 'gamification.title.monthChampion',
      kind: 'special',
    });
  }

  if (opts.isLegend && opts.firstPlaceCount >= 2) {
    titles.push({
      id: 'hof_legend',
      icon: 'hof_legend',
      labelKey: 'gamification.title.legend',
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
): 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'champion' | 'default' {
  if (specialTitles.some((title) => title.id === 'points_king')) return 'diamond';
  if (isLegend || specialTitles.some((title) => title.id === 'hof_legend')) return 'legend';
  if (isCurrentMonthChampion || specialTitles.some((title) => title.id === 'month_champion')) {
    return 'champion';
  }

  let tierFrame: TitleTier['frame'] | undefined;
  for (const tier of LIFETIME_TITLE_TIERS) {
    if (lifetimePoints >= tier.minPoints) tierFrame = tier.frame;
  }

  if (tierFrame) return tierFrame;
  return 'iron';
}

export function resolveAvatarBadge(
  title: WorkerTitleInfo,
  specialTitles: WorkerTitleInfo[],
): string {
  if (specialTitles.some((item) => item.id === 'points_king')) return 'points_king';
  if (specialTitles.some((item) => item.id === 'month_champion')) return 'month_champion';
  if (specialTitles.some((item) => item.id === 'hof_legend')) return 'hof_legend';
  return title.id;
}
