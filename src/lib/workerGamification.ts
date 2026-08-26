import { buildDesignPassProfile } from '@/lib/designPass';
import { generateEternalPerk } from '@/lib/rewardCatalog';
import type { LocalizedText } from '@/types';
import { formatMonthLabel } from '@/lib/monthKey';
import {
  getLifetimeRank,
  getPointsKingId,
  resolveAvatarBadge,
  resolveLifetimeTitle,
  resolveNextTitle,
  resolveSpecialTitles,
  resolveTitleAvatarFrame,
} from '@/lib/workerTitles';
import { getDeadlineUrgency } from '@/lib/utils';
import { monthKey } from '@/lib/monthlyWinners';
import { getMonthlyLeaderboard } from '@/lib/rating';
import type {
  DataStore,
  HallOfFameEntry,
  MonthlyLeaderboardEntry,
  MonthlyWinRecord,
  RatingEntry,
  UnlockedPerk,
  WorkerGamificationProfile,
} from '@/types';
import type { ProjectStatus } from '@/types';

interface PerkTier {
  id: string;
  points: number;
  icon: string;
  labelKey: string;
  descKey: string;
  label?: LocalizedText;
  description?: LocalizedText;
  feature?: string;
}

export const ETERNAL_PERK_START = 2480;
export const ETERNAL_PERK_STEP = 280;
const ETERNAL_PERKS_SHOWN = 8;

export const LIFETIME_PERK_TIERS: PerkTier[] = [
  {
    id: 'starter',
    points: 50,
    icon: '🌱',
    labelKey: 'gamification.perk.starter',
    descKey: 'gamification.perk.starterDesc',
  },
  {
    id: 'quick_search',
    points: 120,
    icon: '🔍',
    labelKey: 'gamification.perk.quickSearch',
    descKey: 'gamification.perk.quickSearchDesc',
    feature: 'enhancedSearch',
  },
  {
    id: 'streak_view',
    points: 250,
    icon: '🔥',
    labelKey: 'gamification.perk.streakView',
    descKey: 'gamification.perk.streakViewDesc',
    feature: 'streakCounter',
  },
  {
    id: 'golden_frame',
    points: 400,
    icon: '✨',
    labelKey: 'gamification.perk.goldenFrame',
    descKey: 'gamification.perk.goldenFrameDesc',
    feature: 'goldenFrame',
  },
  {
    id: 'urgency_sort',
    points: 600,
    icon: '⚡',
    labelKey: 'gamification.perk.urgencySort',
    descKey: 'gamification.perk.urgencySortDesc',
    feature: 'urgencySort',
  },
  {
    id: 'champion_glow',
    points: 900,
    icon: '💫',
    labelKey: 'gamification.perk.championGlow',
    descKey: 'gamification.perk.championGlowDesc',
    feature: 'championGlow',
  },
  {
    id: 'legend_status',
    points: 1300,
    icon: '🏆',
    labelKey: 'gamification.perk.legendStatus',
    descKey: 'gamification.perk.legendStatusDesc',
    feature: 'legendFrame',
  },
  {
    id: 'rank_banner',
    points: 1600,
    icon: '📊',
    labelKey: 'gamification.perk.rankBanner',
    descKey: 'gamification.perk.rankBannerDesc',
    feature: 'rankBanner',
  },
  {
    id: 'spotlight',
    points: 2200,
    icon: '🌟',
    labelKey: 'gamification.perk.spotlight',
    descKey: 'gamification.perk.spotlightDesc',
    feature: 'hallSpotlight',
  },
];

export function getLifetimePoints(workerId: string, entries: RatingEntry[]): number {
  return (entries ?? [])
    .filter((entry) => entry.workerId === workerId)
    .reduce((sum, entry) => sum + entry.points, 0);
}

export function getCompletionStreak(workerId: string, entries: RatingEntry[]): number {
  const positiveDays = new Set<string>();
  for (const entry of entries ?? []) {
    if (entry.workerId !== workerId || entry.points <= 0) continue;
    positiveDays.add(entry.createdAt.slice(0, 10));
  }
  if (positiveDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 400; i += 1) {
    const key = [
      cursor.getFullYear(),
      String(cursor.getMonth() + 1).padStart(2, '0'),
      String(cursor.getDate()).padStart(2, '0'),
    ].join('-');

    if (positiveDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }

  return streak;
}

export function getWorkerMonthlyWins(store: DataStore, workerId: string): MonthlyWinRecord[] {
  const settled: MonthlyWinRecord[] = (store.monthlyWinners ?? [])
    .filter((winner) => winner.workerId === workerId)
    .map((winner) => ({
      month: winner.month,
      rank: winner.rank,
      points: winner.totalPoints,
    }));

  const currentMonth = monthKey();
  const alreadyHasCurrent = settled.some((record) => record.month === currentMonth);
  if (!alreadyHasCurrent) {
    const board = getMonthlyLeaderboard(store, currentMonth);
    const live = board.find((entry) => entry.workerId === workerId);
    if (live && live.monthlyPoints > 0 && live.rank <= 3) {
      settled.push({
        month: currentMonth,
        rank: live.rank as 1 | 2 | 3,
        points: live.monthlyPoints,
        live: true,
      });
    }
  }

  return settled.sort((a, b) => b.month.localeCompare(a.month));
}

export function getHallOfFame(store: DataStore): HallOfFameEntry[] {
  const workers = store.users.filter((user) => user.role === 'worker');
  const pointsKingId = getPointsKingId(store);
  const entries: HallOfFameEntry[] = workers.map((worker) => {
    const firstWins = (store.monthlyWinners ?? []).filter(
      (winner) => winner.workerId === worker.id && winner.rank === 1,
    );
    const lifetimePoints = getLifetimePoints(worker.id, store.ratingEntries ?? []);
    const isPointsKing = pointsKingId === worker.id;
    const title = resolveLifetimeTitle(lifetimePoints);
    const specialTitles = resolveSpecialTitles(store, worker.id, {
      isLegend: false,
      isCurrentMonthChampion: false,
      firstPlaceCount: firstWins.length,
    });
    if (isPointsKing && !specialTitles.some((item) => item.id === 'points_king')) {
      specialTitles.unshift({
        id: 'points_king',
        icon: 'points_king',
        labelKey: 'gamification.title.pointsKing',
        kind: 'special',
      });
    }

    return {
      workerId: worker.id,
      workerName: worker.name,
      firstPlaceWins: firstWins.length,
      winMonths: firstWins.map((winner) => winner.month).sort((a, b) => b.localeCompare(a)),
      lifetimePoints,
      lifetimeRank: getLifetimeRank(store, worker.id),
      isLegend: false,
      isPointsKing,
      title,
      specialTitles,
      avatarFrame: resolveTitleAvatarFrame(lifetimePoints, specialTitles, false, false),
      avatarBadge: resolveAvatarBadge(title, specialTitles),
    };
  });

  entries.sort((a, b) => {
    if (b.firstPlaceWins !== a.firstPlaceWins) return b.firstPlaceWins - a.firstPlaceWins;
    return b.lifetimePoints - a.lifetimePoints;
  });

  const topWins = entries[0]?.firstPlaceWins ?? 0;
  if (topWins > 0) {
    for (const entry of entries) {
      if (entry.firstPlaceWins === topWins) entry.isLegend = true;
    }
  }

  for (const entry of entries) {
    if (entry.isLegend && entry.firstPlaceWins >= 2) {
      if (!entry.specialTitles.some((item) => item.id === 'hof_legend')) {
        entry.specialTitles.push({
          id: 'hof_legend',
          icon: 'hof_legend',
          labelKey: 'gamification.title.legend',
          kind: 'special',
        });
      }
    }
    entry.avatarFrame = resolveTitleAvatarFrame(
      entry.lifetimePoints,
      entry.specialTitles,
      false,
      entry.isLegend,
    );
    entry.avatarBadge = resolveAvatarBadge(entry.title, entry.specialTitles);
  }

  return entries.filter((entry) => entry.firstPlaceWins > 0 || entry.lifetimePoints > 0);
}

function toPerk(tier: PerkTier, unlocked: boolean): UnlockedPerk {
  return {
    id: tier.id,
    points: tier.points,
    icon: tier.icon,
    labelKey: tier.labelKey,
    descKey: tier.descKey,
    label: tier.label,
    description: tier.description,
    feature: tier.feature,
    unlocked,
  };
}

function eternalPerkTier(index: number): PerkTier {
  const generated = generateEternalPerk(index);
  return {
    id: `eternal_${index + 1}`,
    points: ETERNAL_PERK_START + index * ETERNAL_PERK_STEP,
    icon: generated.icon,
    labelKey: 'gamification.perk.eternal',
    descKey: 'gamification.perk.eternalDesc',
    label: generated.label,
    description: generated.description,
    feature: generated.feature,
  };
}

export function unlockedEternalPerkCount(lifetimePoints: number): number {
  if (lifetimePoints < ETERNAL_PERK_START) return 0;
  return Math.floor((lifetimePoints - ETERNAL_PERK_START) / ETERNAL_PERK_STEP) + 1;
}

function buildPerks(lifetimePoints: number): {
  perks: UnlockedPerk[];
  nextPerk: UnlockedPerk | null;
  eternalFeatures: string[];
} {
  const staticPerks = LIFETIME_PERK_TIERS.map((tier) =>
    toPerk(tier, lifetimePoints >= tier.points),
  );

  const unlockedEternal = unlockedEternalPerkCount(lifetimePoints);
  const eternalPerks: UnlockedPerk[] = [];
  for (let i = 0; i < unlockedEternal; i += 1) {
    eternalPerks.push(toPerk(eternalPerkTier(i), true));
  }

  const nextStatic = LIFETIME_PERK_TIERS.find((tier) => lifetimePoints < tier.points);
  const nextPerk = nextStatic
    ? toPerk(nextStatic, false)
    : toPerk(eternalPerkTier(unlockedEternal), false);

  const shownEternal = eternalPerks.slice(-ETERNAL_PERKS_SHOWN);
  return {
    perks: [...staticPerks, ...shownEternal],
    nextPerk,
    eternalFeatures: eternalPerks
      .map((perk) => perk.feature)
      .filter((feature): feature is string => !!feature),
  };
}

function resolveActiveFeatures(
  perks: UnlockedPerk[],
  monthlyWins: MonthlyWinRecord[],
  isLegend: boolean,
  isCurrentMonthChampion: boolean,
): string[] {
  const features = perks.filter((perk) => perk.unlocked && perk.feature).map((perk) => perk.feature!);

  const currentMonth = monthKey();
  const liveRank = monthlyWins.find((win) => win.month === currentMonth);

  if (isCurrentMonthChampion || liveRank?.rank === 1) {
    features.push('monthlyCrown', 'todayFocus');
  } else if (liveRank?.rank === 2) {
    features.push('silverBadge');
  } else if (liveRank?.rank === 3) {
    features.push('bronzeBadge');
  }

  if (isLegend) features.push('legendFrame');
  if (isCurrentMonthChampion) features.push('championFrame');
  if (features.includes('rankBanner')) features.push('motivationBanner');

  return [...new Set(features)];
}

export function getWorkerGamification(store: DataStore, workerId: string): WorkerGamificationProfile {
  const entries = store.ratingEntries ?? [];
  const lifetimePoints = getLifetimePoints(workerId, entries);
  const monthlyWins = getWorkerMonthlyWins(store, workerId);
  const firstPlaceCount = (store.monthlyWinners ?? []).filter(
    (winner) => winner.workerId === workerId && winner.rank === 1,
  ).length;

  const currentMonth = monthKey();
  const board = getMonthlyLeaderboard(store, currentMonth);
  const current = board.find((entry) => entry.workerId === workerId);
  const hall = getHallOfFame(store);
  const selfHall = hall.find((entry) => entry.workerId === workerId);
  const isLegend = !!selfHall?.isLegend;
  const isCurrentMonthChampion = current?.rank === 1 && (current?.monthlyPoints ?? 0) > 0;
  const isPointsKing = getPointsKingId(store) === workerId;
  const title = resolveLifetimeTitle(lifetimePoints);
  const specialTitles = resolveSpecialTitles(store, workerId, {
    isLegend,
    isCurrentMonthChampion,
    firstPlaceCount,
  });
  const nextTitle = resolveNextTitle(lifetimePoints);
  const lifetimeRank = getLifetimeRank(store, workerId);
  const avatarFrame = resolveTitleAvatarFrame(
    lifetimePoints,
    specialTitles,
    isCurrentMonthChampion,
    isLegend,
  );
  const avatarBadge = resolveAvatarBadge(title, specialTitles);

  const { perks, nextPerk, eternalFeatures } = buildPerks(lifetimePoints);
  const designPass = buildDesignPassProfile(workerId, entries, lifetimePoints);
  const mergedSpecialTitles = [...specialTitles];
  for (const seasonTitle of designPass.accountTitles.slice(0, 12)) {
    if (!mergedSpecialTitles.some((item) => item.id === seasonTitle.id)) {
      mergedSpecialTitles.push(seasonTitle);
    }
  }
  const mergedBadge = designPass.accountBadge ?? designPass.activeSeasonBadge ?? avatarBadge;
  const activeFeatures = resolveActiveFeatures(
    perks,
    monthlyWins,
    isLegend,
    isCurrentMonthChampion,
  );
  for (const feature of [...eternalFeatures, ...designPass.accountFeatures, ...designPass.activeSeasonFeatures]) {
    if (!activeFeatures.includes(feature)) activeFeatures.push(feature);
  }

  return {
    lifetimePoints,
    monthlyWins,
    firstPlaceCount,
    currentMonthRank: current?.monthlyPoints ? current.rank : null,
    currentMonthPoints: current?.monthlyPoints ?? 0,
    lifetimeRank,
    title,
    specialTitles: mergedSpecialTitles,
    nextTitle,
    perks,
    nextPerk,
    activeFeatures,
    completionStreak: getCompletionStreak(workerId, entries),
    isLegend,
    isCurrentMonthChampion,
    isPointsKing,
    avatarFrame,
    avatarBadge: mergedBadge,
    designPassFrameClass: designPass.accountFrameClass ?? designPass.activeSeasonFrameClass,
    designPassFrameColor: designPass.accountFrameColor ?? designPass.activeSeasonFrameColor,
    designPass,
  };
}

export function enrichLeaderboardEntries(
  store: DataStore,
  entries: MonthlyLeaderboardEntry[],
): MonthlyLeaderboardEntry[] {
  const hall = getHallOfFame(store);
  const hallByWorker = new Map(hall.map((entry) => [entry.workerId, entry]));
  const currentChampionId = entries.find((entry) => entry.rank === 1 && entry.monthlyPoints > 0)?.workerId;

  return entries.map((entry) => {
    const fame = hallByWorker.get(entry.workerId);
    const gamification = getWorkerGamification(store, entry.workerId);
    return {
      ...entry,
      firstPlaceWins: fame?.firstPlaceWins ?? gamification.firstPlaceCount,
      lifetimePoints: gamification.lifetimePoints,
      lifetimeRank: gamification.lifetimeRank,
      isLegend: fame?.isLegend ?? false,
      isPointsKing: gamification.isPointsKing,
      isCurrentMonthChampion: entry.workerId === currentChampionId && entry.monthlyPoints > 0,
      winMonths: fame?.winMonths ?? [],
      title: gamification.title,
      specialTitles: gamification.specialTitles,
      avatarFrame: gamification.avatarFrame,
      avatarBadge: gamification.avatarBadge,
    };
  });
}

export function formatWinMonthList(months: string[], locale: string): string {
  return months
    .slice(0, 6)
    .map((month) => formatMonthLabel(month, locale as 'uz' | 'ru' | 'en'))
    .join(', ');
}

export function hasWorkerFeature(
  gamification: WorkerGamificationProfile | null | undefined,
  feature: string,
): boolean {
  return !!gamification?.activeFeatures.includes(feature);
}

export function sortProjectsByUrgency<T extends { orderDate: string; status: ProjectStatus }>(
  projects: T[],
): T[] {
  const urgencyRank = { red: 0, yellow: 1, green: 2, none: 3 };
  return [...projects].sort((a, b) => {
    const ua = getDeadlineUrgency(a.orderDate, a.status);
    const ub = getDeadlineUrgency(b.orderDate, b.status);
    const ra = ua ? urgencyRank[ua] : urgencyRank.none;
    const rb = ub ? urgencyRank[ub] : urgencyRank.none;
    return ra - rb;
  });
}
