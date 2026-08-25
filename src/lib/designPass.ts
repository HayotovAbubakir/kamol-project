import { formatMonthLabel } from '@/lib/monthKey';
import { generateSeasonTemplate, locText } from '@/lib/rewardCatalog';
import type { LocalizedText, RatingEntry, WorkerTitleInfo } from '@/types';

/** 10 tier thresholds — season points required to unlock each level. */
export const DESIGN_PASS_TIER_THRESHOLDS = [15, 40, 70, 105, 145, 190, 240, 295, 355, 420] as const;

export type DesignPassRewardType = 'title' | 'badge' | 'frame' | 'feature';

export interface DesignPassTierDefinition {
  id: string;
  tier: number;
  pointsRequired: number;
  type: DesignPassRewardType;
  rewardId: string;
  icon: string;
  labelKey: string;
  descKey: string;
  label?: LocalizedText;
  description?: LocalizedText;
  feature?: string;
  frameClass?: string;
  frameColor?: string;
}

export interface DesignPassSeasonTemplate {
  id: string;
  nameKey: string;
  themeKey: string;
  name?: LocalizedText;
  theme?: LocalizedText;
  accent: string;
  tiers: DesignPassTierDefinition[];
}

export interface DesignPassTierState extends DesignPassTierDefinition {
  unlocked: boolean;
  progress: number;
}

export interface DesignPassMonthlyPoints {
  month: string;
  points: number;
}

export interface DesignPassProfile {
  seasonId: string;
  seasonNameKey: string;
  seasonThemeKey: string;
  seasonName?: LocalizedText;
  seasonTheme?: LocalizedText;
  seasonAccent: string;
  seasonStart: string;
  seasonEnd: string;
  daysRemaining: number;
  seasonPoints: number;
  lifetimePoints: number;
  currentTier: number;
  maxTier: number;
  nextTier: number | null;
  nextTierPoints: number | null;
  progressToNextTier: number;
  tiers: DesignPassTierState[];
  monthlyBreakdown: DesignPassMonthlyPoints[];
  activeSeasonTitle: WorkerTitleInfo | null;
  activeSeasonBadge: string | null;
  activeSeasonFrameClass: string | null;
  activeSeasonFrameColor: string | null;
  activeSeasonFeatures: string[];
  accountFeatures: string[];
  accountTitles: WorkerTitleInfo[];
  accountFrameClass: string | null;
  accountFrameColor: string | null;
  accountBadge: string | null;
  catalogCycleYears: number;
}

export const DESIGN_PASS_CLAIMS_KEY = 'kamol_design_pass_claims_v1';

export function getSeasonId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getSeasonBounds(seasonId: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(seasonId);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getSeasonTemplate(seasonId: string): DesignPassSeasonTemplate {
  const match = /^(\d{4})-(\d{2})$/.exec(seasonId);
  const id = match ? seasonId : '2026-01';
  return generateSeasonTemplate(id, DESIGN_PASS_TIER_THRESHOLDS);
}

export function getSeasonPoints(workerId: string, entries: RatingEntry[], seasonId: string): number {
  const bounds = getSeasonBounds(seasonId);
  if (!bounds) return 0;
  return (entries ?? [])
    .filter((entry) => {
      if (entry.workerId !== workerId) return false;
      const d = new Date(entry.createdAt);
      return d >= bounds.start && d <= bounds.end;
    })
    .reduce((sum, entry) => entry.points + sum, 0);
}

export function getSeasonMonthlyBreakdown(
  workerId: string,
  entries: RatingEntry[],
  seasonId: string,
): DesignPassMonthlyPoints[] {
  const bounds = getSeasonBounds(seasonId);
  if (!bounds) return [];

  const months: string[] = [];
  const cursor = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), 1);
  while (cursor <= bounds.end) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const pointsByMonth = new Map<string, number>();
  for (const month of months) pointsByMonth.set(month, 0);

  for (const entry of entries ?? []) {
    if (entry.workerId !== workerId) continue;
    const d = new Date(entry.createdAt);
    if (d < bounds.start || d > bounds.end) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!pointsByMonth.has(key)) continue;
    pointsByMonth.set(key, (pointsByMonth.get(key) ?? 0) + entry.points);
  }

  return months.map((month) => ({ month, points: pointsByMonth.get(month) ?? 0 }));
}

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function collectWorkerSeasonIds(workerId: string, entries: RatingEntry[], asOf: Date): string[] {
  const asOfId = getSeasonId(asOf);
  const months = new Set<string>([asOfId]);
  for (const entry of entries ?? []) {
    if (entry.workerId !== workerId) continue;
    const key = monthKeyFromDate(new Date(entry.createdAt));
    if (key <= asOfId) months.add(key);
  }
  return [...months].sort();
}

function titleFromTier(tier: DesignPassTierDefinition): WorkerTitleInfo {
  return {
    id: tier.rewardId,
    icon: tier.icon,
    labelKey: tier.labelKey,
    label: tier.label,
    kind: 'special',
  };
}

function resolveCurrentRewards(tiers: DesignPassTierState[]): {
  title: WorkerTitleInfo | null;
  badge: string | null;
  frameClass: string | null;
  frameColor: string | null;
  features: string[];
} {
  const unlocked = tiers.filter((tier) => tier.unlocked);
  const titles = unlocked.filter((tier) => tier.type === 'title');
  const badges = unlocked.filter((tier) => tier.type === 'badge');
  const frames = unlocked.filter((tier) => tier.frameClass);
  const features = unlocked.filter((tier) => tier.feature).map((tier) => tier.feature!);
  const bestTitle = titles.at(-1);
  const bestBadge = badges.at(-1);
  const bestFrame = frames.at(-1);

  return {
    title: bestTitle ? titleFromTier(bestTitle) : null,
    badge: bestBadge?.icon ?? null,
    frameClass: bestFrame?.frameClass ?? null,
    frameColor: bestFrame?.frameColor ?? null,
    features: [...new Set(features)],
  };
}

export function collectEarnedSeasonRewards(
  workerId: string,
  entries: RatingEntry[],
  asOf: Date = new Date(),
): {
  features: string[];
  titles: WorkerTitleInfo[];
  frameClass: string | null;
  frameColor: string | null;
  badge: string | null;
} {
  const features: string[] = [];
  const titles: WorkerTitleInfo[] = [];
  let frameClass: string | null = null;
  let frameColor: string | null = null;
  let badge: string | null = null;

  for (const seasonId of collectWorkerSeasonIds(workerId, entries, asOf)) {
    const template = getSeasonTemplate(seasonId);
    const points = getSeasonPoints(workerId, entries, seasonId);
    for (const tier of template.tiers) {
      if (points < tier.pointsRequired) continue;
      if (tier.feature) features.push(tier.feature);
      if (tier.type === 'title') titles.push(titleFromTier(tier));
      if (tier.frameClass) {
        frameClass = tier.frameClass;
        frameColor = tier.frameColor ?? null;
      }
      if (tier.type === 'badge') badge = tier.icon;
    }
  }

  const uniqueTitles = [];
  const seen = new Set<string>();
  for (const title of titles.reverse()) {
    if (seen.has(title.id)) continue;
    seen.add(title.id);
    uniqueTitles.push(title);
  }

  return {
    features: [...new Set(features)],
    titles: uniqueTitles,
    frameClass,
    frameColor,
    badge,
  };
}

function resolveCurrentTier(seasonPoints: number): number {
  let tier = 0;
  for (let i = 0; i < DESIGN_PASS_TIER_THRESHOLDS.length; i += 1) {
    if (seasonPoints >= DESIGN_PASS_TIER_THRESHOLDS[i]) tier = i + 1;
  }
  return tier;
}

export function buildDesignPassProfile(
  workerId: string,
  entries: RatingEntry[],
  lifetimePoints: number,
  date: Date = new Date(),
): DesignPassProfile {
  const seasonId = getSeasonId(date);
  const template = getSeasonTemplate(seasonId);
  const bounds = getSeasonBounds(seasonId)!;
  const seasonPoints = getSeasonPoints(workerId, entries, seasonId);
  const currentTier = resolveCurrentTier(seasonPoints);
  const maxTier = DESIGN_PASS_TIER_THRESHOLDS.length;

  const nextTierIndex = currentTier < maxTier ? currentTier : null;
  const nextTierPoints =
    nextTierIndex !== null ? DESIGN_PASS_TIER_THRESHOLDS[nextTierIndex] : null;
  const prevThreshold = currentTier > 0 ? DESIGN_PASS_TIER_THRESHOLDS[currentTier - 1] : 0;
  const progressToNextTier =
    nextTierPoints !== null
      ? Math.min(
          100,
          Math.round(((seasonPoints - prevThreshold) / (nextTierPoints - prevThreshold)) * 100),
        )
      : 100;

  const tiers: DesignPassTierState[] = template.tiers.map((tier) => ({
    ...tier,
    unlocked: seasonPoints >= tier.pointsRequired,
    progress: Math.min(100, Math.round((seasonPoints / tier.pointsRequired) * 100)),
  }));

  const active = resolveCurrentRewards(tiers);
  const earned = collectEarnedSeasonRewards(workerId, entries, date);
  const msRemaining = bounds.end.getTime() - date.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    seasonId,
    seasonNameKey: template.nameKey,
    seasonThemeKey: template.themeKey,
    seasonName: template.name,
    seasonTheme: template.theme,
    seasonAccent: template.accent,
    seasonStart: bounds.start.toISOString(),
    seasonEnd: bounds.end.toISOString(),
    daysRemaining,
    seasonPoints,
    lifetimePoints,
    currentTier,
    maxTier,
    nextTier: nextTierIndex !== null ? nextTierIndex + 1 : null,
    nextTierPoints,
    progressToNextTier,
    tiers,
    monthlyBreakdown: getSeasonMonthlyBreakdown(workerId, entries, seasonId),
    activeSeasonTitle: active.title,
    activeSeasonBadge: active.badge,
    activeSeasonFrameClass: active.frameClass,
    activeSeasonFrameColor: active.frameColor,
    activeSeasonFeatures: active.features,
    accountFeatures: earned.features,
    accountTitles: earned.titles,
    accountFrameClass: earned.frameClass,
    accountFrameColor: earned.frameColor,
    accountBadge: earned.badge,
    catalogCycleYears: 0,
  };
}

export function readDesignPassClaims(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DESIGN_PASS_CLAIMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeDesignPassClaim(claimKey: string): void {
  const existing = readDesignPassClaims();
  if (existing.includes(claimKey)) return;
  localStorage.setItem(DESIGN_PASS_CLAIMS_KEY, JSON.stringify([...existing, claimKey]));
}

export function designPassClaimKey(seasonId: string, tierId: string): string {
  return `${seasonId}:${tierId}`;
}

export function formatDesignPassMonth(month: string, locale: string): string {
  return formatMonthLabel(month, locale as 'uz' | 'ru' | 'en');
}

export function displayPassText(
  text: LocalizedText | undefined,
  key: string,
  locale: string,
  translate: (path: string) => string,
): string {
  const localized = locText(text, locale as 'uz' | 'ru' | 'en');
  return localized || translate(key);
}
