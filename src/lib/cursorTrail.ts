export const CURSOR_TRAIL_ENABLED_KEY = 'kamol_cursor_trail_enabled';
export const CURSOR_TRAIL_COLOR_KEY = 'kamol_cursor_trail_color';
export const CURSOR_TRAIL_STYLE_KEY = 'kamol_cursor_trail_style';
export const CURSOR_TRAIL_STYLE_LEGACY_MIGRATION_KEY = 'kamol_cursor_trail_style_default_v2';
export const CURSOR_TRAIL_AUTO = 'auto';
export const CURSOR_TRAIL_RGB = 'rgb';

export type CursorTrailStyle = 'line' | 'snake' | 'both';

export const CURSOR_TRAIL_STYLES: CursorTrailStyle[] = ['line', 'snake', 'both'];

export const CURSOR_TRAIL_PRESETS = [
  { id: CURSOR_TRAIL_AUTO, swatch: 'linear-gradient(135deg, #5cb88a, #94e8c2)' },
  { id: CURSOR_TRAIL_RGB, swatch: 'linear-gradient(135deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)' },
  { id: '#5CB88A', swatch: '#5CB88A' },
  { id: '#3B82F6', swatch: '#3B82F6' },
  { id: '#EAB308', swatch: '#EAB308' },
  { id: '#A855F7', swatch: '#A855F7' },
  { id: '#EF4444', swatch: '#EF4444' },
] as const;

export interface CursorTrailPalette {
  glow: [number, number, number];
  wide: string;
  bright: string;
  wideBaseA: number;
  brightBaseA: number;
}

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export function isCursorTrailRgb(value: string): boolean {
  return value === CURSOR_TRAIL_RGB;
}

export function normalizeCursorTrailColor(value: string | null | undefined): string {
  if (!value || value === CURSOR_TRAIL_AUTO) return CURSOR_TRAIL_AUTO;
  if (value === CURSOR_TRAIL_RGB) return CURSOR_TRAIL_RGB;
  const rgb = parseHexColor(value.startsWith('#') ? value : `#${value}`);
  if (!rgb) return CURSOR_TRAIL_AUTO;
  const hex = value.replace('#', '').toUpperCase();
  return `#${hex}`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function trailHueAt(timeMs: number, ageMs = 0): number {
  return (timeMs * 0.09 + ageMs * 0.14) % 360;
}

export function paletteFromHue(hue: number, dark: boolean): CursorTrailPalette {
  const glow = hslToRgb(hue, 88, dark ? 62 : 48);
  const bright = hslToRgb((hue + 18) % 360, 92, dark ? 82 : 72);
  return {
    glow,
    wide: `${glow[0]}, ${glow[1]}, ${glow[2]}`,
    bright: `${bright[0]}, ${bright[1]}, ${bright[2]}`,
    wideBaseA: dark ? 0.34 : 0.28,
    brightBaseA: dark ? 0.92 : 0.88,
  };
}

export function resolveTrailPalette(color: string, dark: boolean, timeMs = 0, ageMs = 0): CursorTrailPalette {
  if (color === CURSOR_TRAIL_RGB) {
    return paletteFromHue(trailHueAt(timeMs, ageMs), dark);
  }

  if (color === CURSOR_TRAIL_AUTO) {
    return dark
      ? {
          glow: [148, 232, 194],
          wide: '120, 210, 168',
          bright: '210, 255, 232',
          wideBaseA: 0.32,
          brightBaseA: 0.9,
        }
      : {
          glow: [96, 138, 112],
          wide: '70, 100, 82',
          bright: '255, 255, 255',
          wideBaseA: 0.26,
          brightBaseA: 0.85,
        };
  }

  const rgb = parseHexColor(color);
  if (!rgb) return resolveTrailPalette(CURSOR_TRAIL_AUTO, dark, timeMs, ageMs);

  const [r, g, b] = rgb;
  const bright: [number, number, number] = dark
    ? [
        Math.min(255, r + 60),
        Math.min(255, g + 60),
        Math.min(255, b + 60),
      ]
    : [255, 255, 255];

  return {
    glow: rgb,
    wide: `${r}, ${g}, ${b}`,
    bright: `${bright[0]}, ${bright[1]}, ${bright[2]}`,
    wideBaseA: dark ? 0.32 : 0.26,
    brightBaseA: dark ? 0.9 : 0.85,
  };
}

export function readCursorTrailEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(CURSOR_TRAIL_ENABLED_KEY);
  return saved !== 'false';
}

export function readCursorTrailColor(): string {
  if (typeof window === 'undefined') return CURSOR_TRAIL_AUTO;
  return normalizeCursorTrailColor(localStorage.getItem(CURSOR_TRAIL_COLOR_KEY));
}

export function migrateCursorTrailStyleDefaultIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(CURSOR_TRAIL_STYLE_LEGACY_MIGRATION_KEY)) return;

  const raw = localStorage.getItem(CURSOR_TRAIL_STYLE_KEY);
  if (!raw || raw === 'both' || raw === 'snake') {
    localStorage.setItem(CURSOR_TRAIL_STYLE_KEY, 'line');
  }
  localStorage.setItem(CURSOR_TRAIL_STYLE_LEGACY_MIGRATION_KEY, '1');
}

export function normalizeCursorTrailStyle(value: string | null | undefined): CursorTrailStyle {
  if (value === 'line' || value === 'snake' || value === 'both') return value;
  return 'line';
}

export function readCursorTrailStyle(): CursorTrailStyle {
  if (typeof window === 'undefined') return 'line';
  migrateCursorTrailStyleDefaultIfNeeded();
  return normalizeCursorTrailStyle(localStorage.getItem(CURSOR_TRAIL_STYLE_KEY));
}

export function isPresetCursorTrailColor(value: string): boolean {
  return CURSOR_TRAIL_PRESETS.some((preset) => preset.id === value);
}
