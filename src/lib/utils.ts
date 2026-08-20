import type { DeadlineUrgency, Project, ProjectStatus } from '@/types';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function isPendingStatus(status: string): boolean {
  return status === 'pending';
}

export function isInProgressStatus(status: string): boolean {
  return status === 'in_progress';
}

/** Yangi + jarayonda — muddat bildirishnomalari uchun */
export function isActiveStatus(status: string): boolean {
  return isPendingStatus(status) || isInProgressStatus(status);
}

export function isTerminalStatus(status: string): boolean {
  return status === 'completed' || status === 'rejected' || status === 'returned';
}

export function isReturnedProject(project: Pick<Project, 'returnedAt' | 'status'>): boolean {
  return Boolean(project.returnedAt) && project.status === 'in_progress';
}

/** Kartada qizil alert ko‘rinishi kerak bo‘lgan qaytarilgan loyiha */
export function isReturnedCard(project: Pick<Project, 'returnedAt' | 'status'>): boolean {
  return project.status === 'returned' || isReturnedProject(project);
}

export function sortWorkerActiveProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const aReturned = isReturnedProject(a) ? 1 : 0;
    const bReturned = isReturnedProject(b) ? 1 : 0;
    if (bReturned !== aReturned) return bReturned - aReturned;
    if (a.returnedAt && b.returnedAt) {
      return new Date(b.returnedAt).getTime() - new Date(a.returnedAt).getTime();
    }
    return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
  });
}

export function sortReturnedProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const aTime = a.returnedAt ? new Date(a.returnedAt).getTime() : 0;
    const bTime = b.returnedAt ? new Date(b.returnedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getDaysSinceOrder(orderDate: string): number {
  const now = new Date();
  const order = new Date(orderDate);
  return Math.floor((now.getTime() - order.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatOrderDate(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatOrderElapsed(orderDate: string, endAt?: string | number): string {
  const start = new Date(orderDate).getTime();
  const end = typeof endAt === 'number' ? endAt : endAt ? new Date(endAt).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getDeadlineUrgency(orderDate: string, status: ProjectStatus): DeadlineUrgency | null {
  if (isTerminalStatus(status)) return null;
  const days = getDaysSinceOrder(orderDate);
  if (days >= 4) return 'red';
  if (days >= 3) return 'yellow';
  return 'green';
}

export function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    pending: 'Kutilmoqda',
    in_progress: 'Jarayonda',
    completed: 'Tugallangan',
    rejected: 'Rad etilgan',
    returned: 'Qaytarilgan',
  };
  return labels[status] ?? status;
}

export function formatAddress(project: Project): string {
  return project.address || '';
}

export function formatWeeklyRank(rank: number, locale: string): string {
  if (locale === 'ru') return `${rank}-е место`;
  if (locale === 'en') return `#${rank}`;
  return `${rank}-o'rin`;
}

export function formatDate(date: string, locale?: string): string {
  return new Date(date).toLocaleDateString(locale ?? 'uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function extractUzbekMobileDigits(phone?: string | number | null): string | null {
  if (phone == null || phone === '') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  else if (digits.startsWith('8') && digits.length >= 10) digits = digits.slice(1);
  if (digits.length > 9) digits = digits.slice(-9);
  return digits.length === 9 ? digits : null;
}

function formatUzbekPhoneDisplay(digits: string): string {
  return `+998 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
}

export function normalizePhone(phone?: string | number | null): string | undefined {
  const digits = extractUzbekMobileDigits(phone);
  if (!digits) {
    const raw = phone == null ? '' : String(phone).trim();
    return raw || undefined;
  }
  return formatUzbekPhoneDisplay(digits);
}

export function formatPhoneInput(raw: string | number): string {
  const digits = extractUzbekMobileDigits(raw) ?? String(raw).replace(/\D/g, '').slice(0, 9);
  let formatted = digits;
  if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length > 5) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`;
  if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`;
  return formatted;
}

export function formatPhone(phone?: string | number | null): string {
  if (phone == null || phone === '') return '';
  const digits = extractUzbekMobileDigits(phone);
  if (!digits) return String(phone).trim();
  return formatUzbekPhoneDisplay(digits);
}

export function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('uz-UZ').format(price);
}

export function getRemainingPrice(project: {
  price?: number;
  advancePaid: boolean;
  advanceAmount?: number;
}): number | null {
  const { price, advancePaid, advanceAmount } = project;
  if (price == null || price <= 0) return null;
  if (!advancePaid || advanceAmount == null || advanceAmount <= 0) return null;
  return Math.max(0, price - advanceAmount);
}

export function validateProjectPricing(project: {
  price?: number;
  advancePaid?: boolean;
  advanceAmount?: number;
}): string | null {
  const { price, advancePaid, advanceAmount } = project;

  if (advancePaid && advanceAmount != null && advanceAmount > 0) {
    if (price == null || price <= 0) {
      return 'Avans kiritish uchun loyiha narxi kerak';
    }
    if (advanceAmount > price) {
      return 'Avans summasi loyiha narxidan katta bo\'lishi mumkin emas';
    }
  }

  return null;
}

export function formatNumberInput(value: string | number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('uz-UZ').format(Number(digits));
}

export function parseNumberInput(formatted: string): number | undefined {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return undefined;
  return Number(digits);
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ʼ'`´‘’]/g, '')
    .replace(/[^a-z0-9а-яёўғҳқ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchablePhoneDigits(phone?: string | number | null): string {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length > 9) digits = digits.slice(3);
  else if (digits.startsWith('8') && digits.length >= 10) digits = digits.slice(1);
  return digits;
}

/** Mijoz ismi/familiyasi, ko‘cha yoki telefon bo‘yicha qidiruv */
export function matchesProjectSearch(
  project: Pick<Project, 'title' | 'clientName' | 'address' | 'phone'>,
  query: string,
): boolean {
  const raw = query.trim();
  if (!raw) return true;

  const phoneHaystack = searchablePhoneDigits(project.phone);
  const queryDigits = searchablePhoneDigits(raw);
  const textHaystack = normalizeSearchText(
    [project.clientName, project.title, project.address].filter(Boolean).join(' '),
  );
  const tokens = normalizeSearchText(raw).split(' ').filter(Boolean);
  const hasLetters = /[a-zа-яёўғҳқ]/i.test(raw);

  // Faqat raqam yozilsa — telefon bo‘yicha qisman moslik
  if (!hasLetters && queryDigits.length >= 2) {
    return phoneHaystack.includes(queryDigits);
  }

  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    if (textHaystack.includes(token)) return true;
    const tokenDigits = token.replace(/\D/g, '');
    return tokenDigits.length >= 2 && phoneHaystack.includes(tokenDigits);
  });
}

export function filterProjectsBySearch<T extends Pick<Project, 'title' | 'clientName' | 'address' | 'phone'>>(
  projects: T[],
  query: string,
): T[] {
  if (!query.trim()) return projects;
  return projects.filter((project) => matchesProjectSearch(project, query));
}

export type NotificationDatePreset = 'this_week' | 'today' | 'yesterday' | 'day_before_yesterday';

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfLocalWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function getNotificationDateRange(
  preset: NotificationDatePreset,
  now = new Date(),
): { start: Date; end: Date } {
  const todayStart = startOfLocalDay(now);

  switch (preset) {
    case 'today':
      return { start: todayStart, end: endOfLocalDay(now) };
    case 'yesterday': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      return { start, end: endOfLocalDay(start) };
    }
    case 'day_before_yesterday': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 2);
      return { start, end: endOfLocalDay(start) };
    }
    case 'this_week':
    default:
      return { start: startOfLocalWeek(now), end: endOfLocalDay(now) };
  }
}

export function filterNotificationsByDatePreset<T extends { createdAt: string }>(
  items: T[],
  preset: NotificationDatePreset,
  now = new Date(),
): T[] {
  const { start, end } = getNotificationDateRange(preset, now);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return items.filter((item) => {
    const createdMs = new Date(item.createdAt).getTime();
    return createdMs >= startMs && createdMs <= endMs;
  });
}
