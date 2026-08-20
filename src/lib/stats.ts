import type { DataStore, Project } from '@/types';
import { isInProgressStatus, isTerminalStatus } from '@/lib/utils';

export const STORE_VERSION = 2;

export function computeStats(store: DataStore) {
  const active = store.projects.filter((p) => isInProgressStatus(p.status)).length;
  const completed = store.projects.filter((p) => p.status === 'completed').length;
  const pending = store.projects.filter((p) => p.status === 'pending').length;
  const workers = store.users.filter((u) => u.role === 'worker').length;

  return {
    projects: store.projects.length,
    workers,
    active,
    completed,
    pending,
  };
}

export interface ProjectAnalytics {
  thisMonthCount: number;
  lastMonthCount: number;
  monthDelta: number;
  totalSum: number;
  thisMonthSum: number;
  lastMonthSum: number;
}

export function computeProjectAnalytics(projects: Project[]): ProjectAnalytics {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  let thisMonthCount = 0;
  let lastMonthCount = 0;
  let totalSum = 0;
  let thisMonthSum = 0;
  let lastMonthSum = 0;

  for (const p of projects) {
    const d = new Date(p.orderDate);
    const price = p.price ?? 0;
    const inThisMonth = d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    const inLastMonth = d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;

    if (inThisMonth) {
      thisMonthCount++;
      thisMonthSum += price;
    }
    if (inLastMonth) {
      lastMonthCount++;
      lastMonthSum += price;
    }
    totalSum += price;
  }

  return {
    thisMonthCount,
    lastMonthCount,
    monthDelta: thisMonthCount - lastMonthCount,
    totalSum,
    thisMonthSum,
    lastMonthSum,
  };
}
