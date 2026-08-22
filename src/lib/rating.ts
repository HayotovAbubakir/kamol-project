import { v4 as uuidv4 } from 'uuid';
import { RATING_POINTS, MAX_STARS } from './ratingConfig';
import { formatAddress } from '@/lib/utils';
import type {
  DataStore,
  MonthlyLeaderboardEntry,
  Project,
  RatingEntry,
  RatingHistoryItem,
  WeeklyLeaderboardEntry,
  WeeklyRankEntry,
  WorkerRating,
} from '@/types';

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function getWeekBounds(now: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function calculatePoints(project: Project, store: DataStore): number {
  if (project.status === 'rejected' || project.status === 'returned') {
    return RATING_POINTS.REJECTION;
  }
  if (project.status !== 'completed') return 0;

  const completedAt = project.completedAt!;
  // Qaytarilgandan keyin qayta topshirish — muddat qayta ishlash kunidan hisoblanadi
  const startAt = project.returnedAt || project.assignedAt || project.orderDate;
  const days = daysBetween(startAt, completedAt);

  if (days <= 1) {
    const completedDate = new Date(completedAt).toISOString().slice(0, 10);
    const sameDayCompleted = store.projects.filter(
      (p) =>
        p.assignedTo === project.assignedTo &&
        p.status === 'completed' &&
        p.completedAt &&
        new Date(p.completedAt).toISOString().slice(0, 10) === completedDate,
    ).length;
    return sameDayCompleted >= 2 ? RATING_POINTS.SAME_DAY_MULTI : RATING_POINTS.SAME_DAY_SINGLE;
  }
  if (days === 2) return RATING_POINTS.TWO_DAYS;
  if (days === 3) return RATING_POINTS.THREE_DAYS;
  return RATING_POINTS.OVER_THREE_DAYS;
}

export function createRatingEntry(project: Project, store: DataStore): RatingEntry {
  const points = calculatePoints(project, store);
  return {
    id: uuidv4(),
    workerId: project.assignedTo!,
    projectId: project.id,
    points,
    type: project.status === 'rejected' || project.status === 'returned' ? 'rejection' : 'completion',
    createdAt: new Date().toISOString(),
  };
}

export function applyReturnRatingEntries(store: DataStore, project: Project): void {
  if (!project.assignedTo) return;
  if (!store.ratingEntries) store.ratingEntries = [];

  const workerId = project.assignedTo;
  const related = store.ratingEntries.filter(
    (e) => e.projectId === project.id && e.workerId === workerId,
  );
  const completions = related
    .filter((e) => e.type === 'completion')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const reversalCount = related.filter((e) => e.type === 'completion_reversed').length;
  const unmatched = completions[completions.length - reversalCount - 1];

  if (unmatched && unmatched.points !== 0) {
    store.ratingEntries.push({
      id: uuidv4(),
      workerId,
      projectId: project.id,
      points: -unmatched.points,
      type: 'completion_reversed',
      createdAt: new Date().toISOString(),
    });
  }

  store.ratingEntries.push(createRatingEntry({ ...project, status: 'returned' }, store));
}

export function notifyStarRatingChange(
  store: DataStore,
  workerId: string,
  previousRating: number,
): void {
  const next = getWorkerRating(workerId, store.ratingEntries ?? []);
  if (next.rating === previousRating) return;
  store.notifications.unshift({
    id: uuidv4(),
    userId: workerId,
    message: `Reytingingiz yangilandi: ${previousRating.toFixed(1)} ★ → ${next.rating.toFixed(1)} ★`,
    createdAt: new Date().toISOString(),
    read: false,
    type: next.rating >= previousRating ? 'info' : 'warning',
    event: 'rating_changed',
  });
}

export function getWorkerRatingHistory(store: DataStore, workerId: string): RatingHistoryItem[] {
  const entries = (store.ratingEntries ?? [])
    .filter((e) => e.workerId === workerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return entries.map((entry) => {
    const project = store.projects.find((p) => p.id === entry.projectId);
    const startAt = project?.returnedAt || project?.assignedAt || project?.orderDate;
    const daysToComplete =
      entry.type === 'completion' && startAt
        ? daysBetween(startAt, entry.createdAt)
        : undefined;
    return {
      id: entry.id,
      projectId: entry.projectId,
      projectLabel: project ? formatAddress(project) || project.title : 'Loyiha',
      type: entry.type,
      points: entry.points,
      createdAt: entry.createdAt,
      daysToComplete,
    };
  });
}

function monthBounds(month: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getMonthlyLeaderboard(store: DataStore, month: string): MonthlyLeaderboardEntry[] {
  const bounds = monthBounds(month);
  if (!bounds) return [];

  const pointsByWorker = new Map<string, number>();
  for (const entry of store.ratingEntries ?? []) {
    const d = new Date(entry.createdAt);
    if (d < bounds.start || d > bounds.end) continue;
    pointsByWorker.set(entry.workerId, (pointsByWorker.get(entry.workerId) ?? 0) + entry.points);
  }

  const workers = store.users.filter((u) => u.role === 'worker');
  const result: MonthlyLeaderboardEntry[] = workers.map((w) => ({
    workerId: w.id,
    workerName: w.name,
    monthlyPoints: pointsByWorker.get(w.id) ?? 0,
    rank: 0,
  }));

  result.sort((a, b) => {
    if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
    return a.workerName.localeCompare(b.workerName, 'uz');
  });

  result.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return result;
}

export function getWorkerRating(workerId: string, entries: RatingEntry[]): WorkerRating {
  const workerEntries = entries.filter((e) => e.workerId === workerId);
  const totalPoints = workerEntries.reduce((sum, e) => sum + e.points, 0);
  const totalCount = workerEntries.length;

  // Reyting = jami ball / jami yozuvlar, 0..5 oralig'ida
  let rating = totalCount > 0 ? totalPoints / totalCount : 0;
  rating = Math.max(0, Math.min(MAX_STARS, rating));
  rating = Math.round(rating * 10) / 10;

  return { workerId, totalPoints, totalCount, rating };
}

export function getWeeklyLeaderboard(
  store: DataStore,
  now: Date = new Date(),
): WeeklyLeaderboardEntry[] {
  const { start, end } = getWeekBounds(now);
  const entries = (store.ratingEntries ?? []).filter((e) => {
    const d = new Date(e.createdAt);
    return d >= start && d <= end;
  });

  const byWorker = new Map<string, { points: number; rejections: number }>();
  for (const e of entries) {
    const cur = byWorker.get(e.workerId) ?? { points: 0, rejections: 0 };
    cur.points += e.points;
    if (e.type === 'rejection') cur.rejections++;
    byWorker.set(e.workerId, cur);
  }

  const workers = store.users.filter((u) => u.role === 'worker');
  const result: WeeklyLeaderboardEntry[] = workers.map((w) => {
    const weekly = byWorker.get(w.id) ?? { points: 0, rejections: 0 };
    const allTime = getWorkerRating(w.id, store.ratingEntries ?? []);
    return {
      workerId: w.id,
      workerName: w.name,
      weeklyPoints: weekly.points,
      rejectionCount: weekly.rejections,
      allTimeRating: allTime.rating,
    };
  });

  result.sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
    if (a.rejectionCount !== b.rejectionCount) return a.rejectionCount - b.rejectionCount;
    return b.allTimeRating - a.allTimeRating;
  });

  return result;
}

export function getWeeklyRanks(store: DataStore, now: Date = new Date()): WeeklyRankEntry[] {
  const sorted = getWeeklyLeaderboard(store, now);
  let rank = 0;
  return sorted.map((entry) => ({
    workerId: entry.workerId,
    workerName: entry.workerName,
    weeklyRank: entry.weeklyPoints > 0 ? ++rank : null,
  }));
}

export { getWeekBounds };
