import type { LocalizedText } from '@/types';

type Triple = LocalizedText;

type RewardType = 'title' | 'badge' | 'frame' | 'feature';

const TIER_TYPES: RewardType[] = [
  'badge',
  'title',
  'feature',
  'frame',
  'badge',
  'title',
  'feature',
  'frame',
  'title',
  'title',
];

const ADJECTIVES: Triple[] = [
  { uz: 'Nurli', ru: 'Светлый', en: 'Luminous' },
  { uz: 'Atlas', ru: 'Атлас', en: 'Atlas' },
  { uz: 'Bakir', ru: 'Медный', en: 'Copper' },
  { uz: 'Tiniq', ru: 'Прозрачный', en: 'Clear' },
  { uz: 'Qirrali', ru: 'Гранёный', en: 'Faceted' },
  { uz: 'Tun', ru: 'Ночной', en: 'Night' },
  { uz: 'Ipak', ru: 'Шёлковый', en: 'Silk' },
  { uz: 'Geometrik', ru: 'Геометрический', en: 'Geometric' },
  { uz: 'Minimal', ru: 'Минимальный', en: 'Minimal' },
  { uz: 'Chizma', ru: 'Чертёжный', en: 'Draft' },
  { uz: 'Zarrali', ru: 'Зернистый', en: 'Grain' },
  { uz: 'Meridian', ru: 'Меридиан', en: 'Meridian' },
  { uz: 'Vesper', ru: 'Веспер', en: 'Vesper' },
  { uz: 'Obsidian', ru: 'Обсидиан', en: 'Obsidian' },
  { uz: 'Summit', ru: 'Саммит', en: 'Summit' },
  { uz: 'Aqua', ru: 'Аква', en: 'Aqua' },
  { uz: 'Ember', ru: 'Тлеющий', en: 'Ember' },
  { uz: 'Marmar', ru: 'Мраморный', en: 'Marble' },
  { uz: 'Yarimtun', ru: 'Полночный', en: 'Midnight' },
  { uz: 'Kahramon', ru: 'Янтарный', en: 'Amber' },
  { uz: 'Po‘lat', ru: 'Стальной', en: 'Steel' },
  { uz: 'Fil suyagi', ru: 'Айвори', en: 'Ivory' },
  { uz: 'Zumrad', ru: 'Изумрудный', en: 'Verdant' },
  { uz: 'Lavanda', ru: 'Лавандовый', en: 'Lavender' },
  { uz: 'Qizg‘ish', ru: 'Багровый', en: 'Crimson' },
  { uz: 'Osmon', ru: 'Небесный', en: 'Sky' },
  { uz: 'Qum', ru: 'Песочный', en: 'Sand' },
  { uz: 'Muz', ru: 'Ледяной', en: 'Ice' },
  { uz: 'Kulrang', ru: 'Графитовый', en: 'Graphite' },
  { uz: 'Oltin', ru: 'Золотой', en: 'Gilded' },
  { uz: 'Nikel', ru: 'Никелевый', en: 'Nickel' },
  { uz: 'Binafsha', ru: 'Фиолетовый', en: 'Violet' },
];

const NOUNS: Triple[] = [
  { uz: 'Protokol', ru: 'Протокол', en: 'Protocol' },
  { uz: 'Studiya', ru: 'Студия', en: 'Studio' },
  { uz: 'Chiziq', ru: 'Линия', en: 'Line' },
  { uz: 'Pass', ru: 'Пасс', en: 'Pass' },
  { uz: 'Atelier', ru: 'Ателье', en: 'Atelier' },
  { uz: 'To‘r', ru: 'Сетка', en: 'Grid' },
  { uz: 'Qonun', ru: 'Канон', en: 'Canon' },
  { uz: 'Parda', ru: 'Вуаль', en: 'Veil' },
  { uz: 'Ustaxona', ru: 'Горн', en: 'Forge' },
  { uz: 'Arxiv', ru: 'Архив', en: 'Archive' },
  { uz: 'Signal', ru: 'Сигнал', en: 'Signal' },
  { uz: 'Ombor', ru: 'Хранилище', en: 'Vault' },
  { uz: 'Gerb', ru: 'Герб', en: 'Crest' },
  { uz: 'Daftar', ru: 'Журнал', en: 'Ledger' },
  { uz: 'Orbit', ru: 'Орбита', en: 'Orbit' },
  { uz: 'Prisma', ru: 'Призма', en: 'Prism' },
  { uz: 'Mayak', ru: 'Маяк', en: 'Beacon' },
  { uz: 'Qalam', ru: 'Перо', en: 'Quill' },
  { uz: 'Markaz', ru: 'Нексус', en: 'Nexus' },
  { uz: 'Hola', ru: 'Ореол', en: 'Halo' },
  { uz: 'O‘q', ru: 'Ось', en: 'Axis' },
  { uz: 'Minora', ru: 'Шпиль', en: 'Spire' },
  { uz: 'To‘qima', ru: 'Станок', en: 'Loom' },
  { uz: 'Shifr', ru: 'Шифр', en: 'Cipher' },
  { uz: 'Kontur', ru: 'Контур', en: 'Contour' },
  { uz: 'Fasad', ru: 'Фасад', en: 'Facade' },
  { uz: 'Kesim', ru: 'Разрез', en: 'Section' },
  { uz: 'Maket', ru: 'Макет', en: 'Model' },
];

const MOODS: Triple[] = [
  { uz: 'Aniqlik va chizma', ru: 'Точность и чертёж', en: 'Precision and draft' },
  { uz: 'Sokin studio ritmi', ru: 'Спокойный ритм студии', en: 'Quiet studio rhythm' },
  { uz: 'Issiq metall chiziq', ru: 'Тёплая металлическая линия', en: 'Warm metal line' },
  { uz: 'Yuqori natija me’yori', ru: 'Стандарт высокого результата', en: 'High-performance standard' },
  { uz: 'Premium qorong‘u ton', ru: 'Премиальный тёмный тон', en: 'Premium dark tone' },
  { uz: 'Sovuq suv palitrasi', ru: 'Холодная водная палитра', en: 'Cool water palette' },
  { uz: 'Qog‘oz va qalam ruhi', ru: 'Дух бумаги и карандаша', en: 'Paper and pencil spirit' },
  { uz: 'Elita shartnoma uslubi', ru: 'Стиль элитного контракта', en: 'Elite contract style' },
  { uz: 'Geometriya va tartib', ru: 'Геометрия и порядок', en: 'Geometry and order' },
  { uz: 'Yumshoq nur va shisha', ru: 'Мягкий свет и стекло', en: 'Soft light and glass' },
  { uz: 'Tuman va chuqur fon', ru: 'Туман и глубокий фон', en: 'Mist and deep ground' },
  { uz: 'Qirra va kontrast', ru: 'Грань и контраст', en: 'Edge and contrast' },
];

const ROLES: Triple[] = [
  { uz: 'Chizgichi', ru: 'Чертёжник', en: 'Drafter' },
  { uz: 'Usta', ru: 'Мастер', en: 'Craftsman' },
  { uz: 'Dizayner', ru: 'Дизайнер', en: 'Designer' },
  { uz: 'Arxitektor', ru: 'Архитектор', en: 'Architect' },
  { uz: 'Muhandis', ru: 'Инженер', en: 'Engineer' },
  { uz: 'Kurator', ru: 'Куратор', en: 'Curator' },
  { uz: 'Nazoratchi', ru: 'Надзиратель', en: 'Overseer' },
  { uz: 'Elita', ru: 'Элита', en: 'Elite' },
  { uz: 'Virtuoz', ru: 'Виртуоз', en: 'Virtuoso' },
  { uz: 'Maestro', ru: 'Маэстро', en: 'Maestro' },
  { uz: 'Konstruktor', ru: 'Конструктор', en: 'Constructor' },
  { uz: 'Tahlilchi', ru: 'Аналитик', en: 'Analyst' },
  { uz: 'Proyektant', ru: 'Проектировщик', en: 'Planner' },
  { uz: 'Rassom', ru: 'Художник', en: 'Artist' },
  { uz: 'Mentor', ru: 'Наставник', en: 'Mentor' },
  { uz: 'Pioneer', ru: 'Пионер', en: 'Pioneer' },
];

const SURFACES: Triple[] = [
  { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
  { uz: 'Karta', ru: 'Карточка', en: 'Card' },
  { uz: 'Menyu', ru: 'Меню', en: 'Menu' },
  { uz: 'Avatar', ru: 'Аватар', en: 'Avatar' },
  { uz: 'Xabar', ru: 'Уведомление', en: 'Notice' },
  { uz: 'Qidiruv', ru: 'Поиск', en: 'Search' },
  { uz: 'Statistika', ru: 'Статистика', en: 'Stats' },
  { uz: 'Reyting', ru: 'Рейтинг', en: 'Ranking' },
  { uz: 'Fon', ru: 'Фон', en: 'Backdrop' },
  { uz: 'Ramka', ru: 'Рамка', en: 'Frame' },
  { uz: 'Nishon', ru: 'Значок', en: 'Badge' },
  { uz: 'Sarlavha', ru: 'Заголовок', en: 'Heading' },
  { uz: 'Tugma', ru: 'Кнопка', en: 'Button' },
  { uz: 'Panel', ru: 'Панель', en: 'Panel' },
  { uz: 'Chiziq', ru: 'Линия', en: 'Rule' },
  { uz: 'Jadval', ru: 'Таблица', en: 'Table' },
  { uz: 'Logo', ru: 'Логотип', en: 'Logo' },
  { uz: 'Cursor', ru: 'Курсор', en: 'Cursor' },
  { uz: 'Shadow', ru: 'Тень', en: 'Shadow' },
  { uz: 'Grid', ru: 'Сетка', en: 'Grid' },
  { uz: 'Banner', ru: 'Баннер', en: 'Banner' },
  { uz: 'Ikonka', ru: 'Иконка', en: 'Icon' },
  { uz: 'Tab', ru: 'Вкладка', en: 'Tab' },
  { uz: 'Filter', ru: 'Фильтр', en: 'Filter' },
];

const ACTIONS: Triple[] = [
  { uz: 'filtri', ru: 'фильтр', en: 'filter' },
  { uz: 'tartibi', ru: 'порядок', en: 'order' },
  { uz: 'yoritishi', ru: 'подсветка', en: 'highlight' },
  { uz: 'tezkorligi', ru: 'ускорение', en: 'haste' },
  { uz: 'diqqati', ru: 'фокус', en: 'focus' },
  { uz: 'himoyasi', ru: 'защита', en: 'guard' },
  { uz: 'izi', ru: 'след', en: 'trail' },
  { uz: 'imzosi', ru: 'подпись', en: 'mark' },
  { uz: 'aurasi', ru: 'аура', en: 'aura' },
  { uz: 'jilosi', ru: 'блеск', en: 'sheen' },
  { uz: 'toni', ru: 'тон', en: 'tone' },
  { uz: 'muhri', ru: 'печать', en: 'stamp' },
  { uz: 'lenti', ru: 'лента', en: 'ribbon' },
  { uz: 'nuri', ru: 'свет', en: 'glow' },
  { uz: 'puls', ru: 'пульс', en: 'pulse' },
  { uz: 'aks', ru: 'отражение', en: 'echo' },
  { uz: 'qirrasi', ru: 'грань', en: 'edge' },
  { uz: 'parda', ru: 'вуаль', en: 'veil' },
  { uz: 'qatlami', ru: 'слой', en: 'layer' },
  { uz: 'ritmi', ru: 'ритм', en: 'rhythm' },
];

const MATERIALS: Triple[] = [
  { uz: 'Shisha', ru: 'Стекло', en: 'Glass' },
  { uz: 'Bronza', ru: 'Бронза', en: 'Bronze' },
  { uz: 'Kumush', ru: 'Серебро', en: 'Silver' },
  { uz: 'Oltin', ru: 'Золото', en: 'Gold' },
  { uz: 'Bakir', ru: 'Медь', en: 'Copper' },
  { uz: 'Obsidian', ru: 'Обсидиан', en: 'Obsidian' },
  { uz: 'Marmar', ru: 'Мрамор', en: 'Marble' },
  { uz: 'Po‘lat', ru: 'Сталь', en: 'Steel' },
  { uz: 'Ipak', ru: 'Шёлк', en: 'Silk' },
  { uz: 'Qog‘oz', ru: 'Бумага', en: 'Paper' },
  { uz: 'Nikel', ru: 'Никель', en: 'Nickel' },
  { uz: 'Zumrad', ru: 'Изумруд', en: 'Emerald' },
  { uz: 'Safir', ru: 'Сапфир', en: 'Sapphire' },
  { uz: 'Grafit', ru: 'Графит', en: 'Graphite' },
  { uz: 'Muz', ru: 'Лёд', en: 'Ice' },
  { uz: 'Qumtoshi', ru: 'Песчаник', en: 'Sandstone' },
];

const ICONS = [
  '◈', '▣', '⌁', '◆', '◇', '▤', '⬡', '▧', '◉', '✦',
  '✧', '★', '✵', '✶', '✷', '❋', '❖', '⚜', '⟡', '⬢',
  '⬣', '✺', '✹', '⚝', '✩', '✪', '✫', '✬',
];

export interface GeneratedPerk {
  icon: string;
  label: LocalizedText;
  description: LocalizedText;
  feature: string;
}

export function locText(
  text: LocalizedText | string | undefined,
  locale: keyof LocalizedText,
  fallback = '',
): string {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  return text[locale] || text.uz || fallback;
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[], used?: Set<number>): T {
  if (!used) return items[Math.floor(rng() * items.length)]!;
  for (let attempt = 0; attempt < items.length * 3; attempt += 1) {
    const index = Math.floor(rng() * items.length);
    if (!used.has(index)) {
      used.add(index);
      return items[index]!;
    }
  }
  return items[Math.floor(rng() * items.length)]!;
}

function joinTriple(left: Triple, right: Triple): Triple {
  return {
    uz: `${left.uz} ${right.uz}`,
    ru: `${left.ru} ${right.ru}`,
    en: `${left.en} ${right.en}`,
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function slug(parts: string[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

function featureId(seasonId: string, surface: Triple, action: Triple, index: number): string {
  return `dpf:${seasonId}:${slug([surface.en, action.en, String(index)])}`;
}

export const REWARD_CATALOG_SIZE =
  ADJECTIVES.length * NOUNS.length * SURFACES.length * ACTIONS.length * MATERIALS.length;

export function generateSeasonTemplate(
  seasonId: string,
  thresholds: readonly number[],
) {
  const rng = mulberry32(hashString(`design-pass:${seasonId}`));
  const hue = Math.floor(rng() * 360);
  const sat = 40 + Math.floor(rng() * 28);
  const light = 34 + Math.floor(rng() * 16);
  const accent = hslToHex(hue, sat, light);

  const adjUsed = new Set<number>();
  const nounUsed = new Set<number>();
  const adj = pick(rng, ADJECTIVES, adjUsed);
  const noun = pick(rng, NOUNS, nounUsed);
  const mood = pick(rng, MOODS);
  const name = joinTriple(adj, noun);
  const theme: Triple = {
    uz: `${mood.uz} — bu oyga maxsus sovg‘alar`,
    ru: `${mood.ru} — уникальные награды этого месяца`,
    en: `${mood.en} — unique rewards for this month`,
  };

  const roleUsed = new Set<number>();
  const surfaceUsed = new Set<number>();
  const actionUsed = new Set<number>();
  const materialUsed = new Set<number>();
  const iconUsed = new Set<number>();

  const tiers = thresholds.map((pointsRequired, index) => {
    const type = TIER_TYPES[index] ?? 'badge';
    const icon = pick(rng, ICONS, iconUsed);
    const isMaster = index === thresholds.length - 1;
    const role = pick(rng, ROLES, roleUsed);
    const surface = pick(rng, SURFACES, surfaceUsed);
    const action = pick(rng, ACTIONS, actionUsed);
    const material = pick(rng, MATERIALS, materialUsed);
    const tone = pick(rng, ADJECTIVES, adjUsed);

    let label: Triple;
    let description: Triple;
    let feature: string | undefined;
    let frameClass: string | undefined;
    let frameColor: string | undefined;

    if (type === 'badge') {
      label = {
        uz: `${tone.uz} nishon`,
        ru: `${tone.ru} значок`,
        en: `${tone.en} badge`,
      };
      description = {
        uz: 'Akkauntingizga qo‘shiladigan noyob nishon',
        ru: 'Уникальный значок, который остаётся в аккаунте',
        en: 'A unique badge that stays on your account',
      };
    } else if (type === 'title') {
      label = joinTriple(tone, role);
      description = {
        uz: 'Ball uchun beriladigan maxsus unvon',
        ru: 'Особый титул за собранные баллы',
        en: 'A special title earned with points',
      };
    } else if (type === 'feature') {
      label = {
        uz: `${surface.uz} ${action.uz}`,
        ru: `${surface.ru}: ${action.ru}`,
        en: `${surface.en} ${action.en}`,
      };
      description = {
        uz: 'Akkauntga qo‘shiladigan maxsus funksiya — keyingi oylarda ham saqlanadi',
        ru: 'Функция добавляется в аккаунт и сохраняется в следующих месяцах',
        en: 'A feature added to your account that stays in later months',
      };
      feature = featureId(seasonId, surface, action, index);
    } else {
      label = {
        uz: `${material.uz} ramka`,
        ru: `${material.ru} рамка`,
        en: `${material.en} frame`,
      };
      description = {
        uz: 'Avatar atrofidagi maxsus ramka',
        ru: 'Особая рамка вокруг аватара',
        en: 'A special frame around your avatar',
      };
      frameClass = 'design-pass-frame-proc';
      frameColor = hslToHex((hue + index * 18) % 360, sat + 6, Math.min(62, light + 8 + index));
    }

    if (isMaster) {
      label = {
        uz: `${name.uz} ustasi`,
        ru: `Мастер ${name.ru}`,
        en: `${name.en} master`,
      };
      description = {
        uz: 'Bu oylik passning final sovg‘asi — akkauntda qoladi',
        ru: 'Финальная награда месяца — остаётся в аккаунте',
        en: 'The month’s final gift — it stays on your account',
      };
      frameClass = 'design-pass-frame-proc';
      frameColor = hslToHex((hue + 42) % 360, Math.min(78, sat + 18), Math.min(58, light + 14));
    }

    return {
      id: `${seasonId}_t${index + 1}`,
      tier: index + 1,
      pointsRequired,
      type: isMaster ? 'title' : type,
      rewardId: `${seasonId}_${type}_${index + 1}`,
      icon,
      labelKey: 'designPass.reward.generated',
      descKey: 'designPass.reward.generatedDesc',
      label,
      description,
      feature,
      frameClass,
      frameColor,
    };
  });

  return {
    id: seasonId,
    nameKey: 'designPass.season.generated',
    themeKey: 'designPass.theme.generated',
    name,
    theme,
    accent,
    tiers,
  };
}

export function generateEternalPerk(index: number): GeneratedPerk {
  const rng = mulberry32(hashString(`eternal-perk:${index}`));
  const adj = pick(rng, ADJECTIVES);
  const surface = pick(rng, SURFACES);
  const action = pick(rng, ACTIONS);
  const role = pick(rng, ROLES);
  const icon = pick(rng, ICONS);
  const n = index + 1;
  return {
    icon,
    label: {
      uz: `${adj.uz} ${surface.uz} ${action.uz} #${n}`,
      ru: `${adj.ru} ${surface.ru} ${action.ru} №${n}`,
      en: `${adj.en} ${surface.en} ${action.en} #${n}`,
    },
    description: {
      uz: `${role.uz} darajasidagi abadiy sovg‘a — akkauntingizga qo‘shildi`,
      ru: `Вечная награда уровня «${role.ru}» — добавлена в аккаунт`,
      en: `An eternal ${role.en}-tier gift added to your account`,
    },
    feature: `eternal:${n}:${slug([adj.en, surface.en, action.en])}`,
  };
}
