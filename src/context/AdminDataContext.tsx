'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, getSession } from '@/lib/auth';
import { useNotificationPoll } from '@/hooks/useNotificationPoll';
import { isInProgressStatus } from '@/lib/utils';
import type {
  AppNotification,
  Payment,
  Project,
  ProjectComment,
  RatingEntry,
  WeeklyRankEntry,
  WorkerRating,
  WorkerSummary,
} from '@/types';

interface AdminData {
  session: ReturnType<typeof getSession>;
  projects: Project[];
  workers: WorkerSummary[];
  notifications: AppNotification[];
  comments: ProjectComment[];
  payments: Payment[];
  ratingEntries: RatingEntry[];
  leaderboard: WeeklyRankEntry[];
  allRatings: WorkerRating[];
  loading: boolean;
  error: string;
  setError: (e: string) => void;
  loadData: (options?: { silent?: boolean }) => Promise<void>;
  updateNotifications: (items: AppNotification[]) => void;
  pendingCount: number;
  activeCount: number;
  completedCount: number;
}

const AdminDataContext = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => getSession());
  const hasLoadedRef = useRef(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ratingEntries, setRatingEntries] = useState<RatingEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<WeeklyRankEntry[]>([]);
  const [allRatings, setAllRatings] = useState<WorkerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!session) {
      setLoading(false);
      return;
    }

    const silent = options?.silent ?? hasLoadedRef.current;
    if (!silent) setLoading(true);

    try {
      const res = await apiFetch<{
        projects: Project[];
        workers: WorkerSummary[];
        notifications: AppNotification[];
        comments: ProjectComment[];
        payments: Payment[];
        ratingEntries: RatingEntry[];
        leaderboard: WeeklyRankEntry[];
        allRatings: WorkerRating[];
      }>('/api/admin/bootstrap');

      setProjects(res.projects);
      setWorkers(res.workers);
      setNotifications(res.notifications);
      setComments(res.comments ?? []);
      setPayments(res.payments ?? []);
      setRatingEntries(res.ratingEntries ?? []);
      setLeaderboard(res.leaderboard ?? []);
      setAllRatings(res.allRatings ?? []);

      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ma\'lumotlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateNotifications = useCallback((items: AppNotification[]) => {
    setNotifications(items);
  }, []);

  useNotificationPoll(session?.id, updateNotifications);

  const { activeCount, pendingCount, completedCount } = useMemo(() => {
    let active = 0;
    let pending = 0;
    let completed = 0;
    for (const p of projects) {
      if (isInProgressStatus(p.status)) active += 1;
      if (p.status === 'pending') pending += 1;
      if (p.status === 'completed') completed += 1;
    }
    return { activeCount: active, pendingCount: pending, completedCount: completed };
  }, [projects]);

  const value = useMemo<AdminData>(
    () => ({
      session,
      projects,
      workers,
      notifications,
      comments,
      payments,
      ratingEntries,
      leaderboard,
      allRatings,
      loading,
      error,
      setError,
      loadData,
      updateNotifications,
      pendingCount,
      activeCount,
      completedCount,
    }),
    [
      session,
      projects,
      workers,
      notifications,
      comments,
      payments,
      ratingEntries,
      leaderboard,
      allRatings,
      loading,
      error,
      loadData,
      updateNotifications,
      pendingCount,
      activeCount,
      completedCount,
    ],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error('useAdminData must be used within AdminDataProvider');
  }
  return ctx;
}

export function useAdminDataOptional(): AdminData | null {
  return useContext(AdminDataContext);
}
