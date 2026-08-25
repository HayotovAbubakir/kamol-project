import { isCustomBackgroundId, readCustomBackgrounds } from '@/lib/customBackgrounds';

export const BACKGROUND_KEY = 'kamol_background';

export type StaticBackgroundId = 'none' | 'blueprint';

export type PremiumLiveDarkId = 'aurora' | 'nebula' | 'golddust' | 'ocean' | 'prism';

export type PremiumLiveLightId = 'daybreak' | 'mist' | 'bloom' | 'cloud' | 'silk';

export type PremiumLiveId = PremiumLiveDarkId | PremiumLiveLightId;

export type BackgroundId = StaticBackgroundId | PremiumLiveId | `custom:${string}`;

export type BackgroundGroup = 'static' | 'live' | 'custom';

export interface BackgroundOption {
  id: BackgroundId;
  group: BackgroundGroup;
  labelKey: string;
  preview: string;
  premium?: boolean;
}

export const STATIC_BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'none',
    group: 'static',
    labelKey: 'settings.backgroundNone',
    preview: 'linear-gradient(135deg, #e8e4dc 0%, #f3f0e8 100%)',
  },
  {
    id: 'blueprint',
    group: 'static',
    labelKey: 'settings.backgroundBlueprint',
    preview:
      'linear-gradient(135deg, #dfe8e1 0%, #eef4ef 100%), repeating-linear-gradient(0deg, rgba(88,113,95,0.12) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(88,113,95,0.12) 0 1px, transparent 1px 24px)',
  },
];

export const PREMIUM_LIVE_BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'aurora',
    group: 'live',
    labelKey: 'settings.backgroundAurora',
    premium: true,
    preview:
      'linear-gradient(120deg, rgba(16,185,129,0.55), rgba(59,130,246,0.45), rgba(168,85,247,0.35)), linear-gradient(180deg, #020617, #0f172a)',
  },
  {
    id: 'nebula',
    group: 'live',
    labelKey: 'settings.backgroundNebula',
    premium: true,
    preview:
      'radial-gradient(circle at 30% 40%, rgba(147,51,234,0.55), transparent 50%), radial-gradient(circle at 70% 60%, rgba(59,130,246,0.45), transparent 45%), #070712',
  },
  {
    id: 'golddust',
    group: 'live',
    labelKey: 'settings.backgroundGolddust',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 20%, rgba(251,191,36,0.35), transparent 40%), linear-gradient(160deg, #1c1408, #0a0906)',
  },
  {
    id: 'ocean',
    group: 'live',
    labelKey: 'settings.backgroundOcean',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.35), transparent 55%), linear-gradient(180deg, #031525, #062a44 55%, #021018)',
  },
  {
    id: 'prism',
    group: 'live',
    labelKey: 'settings.backgroundPrism',
    premium: true,
    preview:
      'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(99,102,241,0.35), rgba(34,211,238,0.35)), linear-gradient(180deg, #111827, #020617)',
  },
];

export const PREMIUM_LIVE_LIGHT_BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'daybreak',
    group: 'live',
    labelKey: 'settings.backgroundDaybreak',
    premium: true,
    preview:
      'linear-gradient(135deg, rgba(255,237,213,0.9), rgba(186,230,253,0.75), rgba(254,249,195,0.8)), linear-gradient(180deg, #f8f4ec, #eef6fb)',
  },
  {
    id: 'mist',
    group: 'live',
    labelKey: 'settings.backgroundMist',
    premium: true,
    preview:
      'radial-gradient(circle at 35% 45%, rgba(255,255,255,0.95), transparent 55%), radial-gradient(circle at 68% 62%, rgba(226,232,240,0.7), transparent 50%), #eef2f6',
  },
  {
    id: 'bloom',
    group: 'live',
    labelKey: 'settings.backgroundBloom',
    premium: true,
    preview:
      'radial-gradient(circle at 30% 35%, rgba(251,207,232,0.55), transparent 45%), radial-gradient(circle at 70% 55%, rgba(167,243,208,0.45), transparent 42%), #f9f5f2',
  },
  {
    id: 'cloud',
    group: 'live',
    labelKey: 'settings.backgroundCloud',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.95), transparent 48%), linear-gradient(180deg, #eef6ff, #f8fbff 55%, #f3f0e8)',
  },
  {
    id: 'silk',
    group: 'live',
    labelKey: 'settings.backgroundSilk',
    premium: true,
    preview:
      'linear-gradient(120deg, rgba(255,255,255,0.85), rgba(243,232,255,0.55), rgba(255,251,235,0.65)), linear-gradient(180deg, #faf7f2, #f3f0e8)',
  },
];

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  ...STATIC_BACKGROUNDS,
  ...PREMIUM_LIVE_BACKGROUNDS,
  ...PREMIUM_LIVE_LIGHT_BACKGROUNDS,
];

const PREMIUM_DARK_IDS = new Set<string>(PREMIUM_LIVE_BACKGROUNDS.map((option) => option.id));
const PREMIUM_LIGHT_IDS = new Set<string>(PREMIUM_LIVE_LIGHT_BACKGROUNDS.map((option) => option.id));
const PREMIUM_IDS = new Set<string>([...PREMIUM_DARK_IDS, ...PREMIUM_LIGHT_IDS]);
const STATIC_IDS = new Set<string>(STATIC_BACKGROUNDS.map((option) => option.id));
const LEGACY_LIVE_IDS = new Set(['dust', 'paper', 'ember', 'gear', 'grass']);

export function normalizeBackgroundId(
  value: string | null | undefined,
  customIds: string[] = readCustomBackgrounds().map((item) => item.id),
): BackgroundId {
  if (!value) return 'blueprint';
  if (STATIC_IDS.has(value)) return value as StaticBackgroundId;
  if (PREMIUM_IDS.has(value)) return value as PremiumLiveId;
  if (LEGACY_LIVE_IDS.has(value)) return 'blueprint';
  if (isCustomBackgroundId(value)) {
    const storageId = value.slice('custom:'.length);
    if (customIds.includes(storageId)) return value as `custom:${string}`;
  }
  return 'blueprint';
}

export function readBackgroundId(): BackgroundId {
  if (typeof window === 'undefined') return 'blueprint';
  return normalizeBackgroundId(localStorage.getItem(BACKGROUND_KEY));
}

export function isLiveBackground(id: BackgroundId): boolean {
  if (isCustomBackgroundId(id)) return true;
  return PREMIUM_IDS.has(id);
}

export function isPremiumLiveDarkBackground(id: BackgroundId): id is PremiumLiveDarkId {
  return PREMIUM_DARK_IDS.has(id);
}

export function isPremiumLiveLightBackground(id: BackgroundId): id is PremiumLiveLightId {
  return PREMIUM_LIGHT_IDS.has(id);
}

export function isBackgroundCompatibleWithTheme(id: BackgroundId, theme: 'light' | 'dark'): boolean {
  if (isPremiumLiveDarkBackground(id)) return theme === 'dark';
  if (isPremiumLiveLightBackground(id)) return theme === 'light';
  return true;
}

export function getDefaultLiveBackgroundForTheme(theme: 'light' | 'dark'): PremiumLiveId {
  return theme === 'light' ? 'daybreak' : 'aurora';
}

export function isPremiumLiveBackground(id: BackgroundId): id is PremiumLiveId {
  return PREMIUM_IDS.has(id);
}
