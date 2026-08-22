export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function previousMonthKey(date: Date = new Date()): string {
  return monthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

const MONTH_NAMES: Record<string, string[]> = {
  uz: [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
  ],
  ru: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

export function formatMonthLabel(key: string, locale = 'uz'): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  const names = MONTH_NAMES[locale] ?? MONTH_NAMES.uz;
  return `${names[parsed.month - 1]} ${parsed.year}`;
}

export function monthName(monthIndex1to12: number, locale = 'uz'): string {
  const names = MONTH_NAMES[locale] ?? MONTH_NAMES.uz;
  return names[monthIndex1to12 - 1] ?? String(monthIndex1to12);
}

/** Joriy oydan orqaga `count` oy + qo'shimcha kalitlar */
export function trailingMonthKeys(count = 18, extra: string[] = [], now: Date = new Date()): string[] {
  const keys = new Set<string>(extra);
  for (let i = 0; i < count; i += 1) {
    keys.add(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}
