import { v4 as uuidv4 } from 'uuid';
import { RATING_POINTS, MAX_STARS } from './ratingConfig';
import type {
  DataStore,
  Project,
  RatingEntry,
  WeeklyLeaderboardEntry,
  WeeklyRankEntry,
  WorkerRating,
} from '@/types';

function daysBetween(a: string, b: string): number {
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
  if (project.status === 'rejected' || project.status === 'returned') return RATING_POINTS.REJECTION;
  if (project.status !== 'completed') return 0;

  const assignedAt = project.assignedAt || project.orderDate;
  const completedAt = project.completedAt!;
  const days = daysBetween(assignedAt, completedAt);

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

export function getWorkerRating(workerId: string, entries: RatingEntry[]): WorkerRating {
  const workerEntries = entries.filter((e) => e.workerId === workerId);
  const totalPoints = workerEntries.reduce((sum, e) => sum + e.points, 0);
  const totalCount = workerEntries.length;

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
