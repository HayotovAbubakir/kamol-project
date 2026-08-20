'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, getSession } from '@/lib/auth';
import { useNotificationPoll } from '@/hooks/useNotificationPoll';
import { isInProgressStatus } from '@/lib/utils';
import type {
  AppNotification,
  Project,
  ProjectComment,
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
  leaderboard: WeeklyRankEntry[];
  allRatings: WorkerRating[];
  loading: boolean;
  error: string;
  setError: (e: string) => void;
  loadData: (options?: { silent?: boolean }) => Promise<void>;
  pendingCount: number;
  activeCount: number;
  completedCount: number;
}

const AdminDataContext = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const session = getSession();
  const hasLoadedRef = useRef(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
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
        leaderboard: WeeklyRankEntry[];
        allRatings: WorkerRating[];
      }>('/api/admin/bootstrap');

      setProjects(res.projects);
      setWorkers(res.workers);
      setNotifications(res.notifications);
      setComments(res.comments ?? []);
      setLeaderboard(res.leaderboard ?? []);
      setAllRatings(res.allRatings ?? []);

      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ma\'lumotlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateNotifications = useCallback((items: AppNotification[]) => {
    setNotifications(items);
  }, []);

  useNotificationPoll(session?.id, updateNotifications);

  const activeCount = projects.filter((p) => isInProgressStatus(p.status)).length;
  const pendingCount = projects.filter((p) => p.status === 'pending').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  return (
    <AdminDataContext.Provider
      value={{
        session,
        projects,
        workers,
        notifications,
        comments,
        leaderboard,
        allRatings,
        loading,
        error,
        setError,
        loadData,
        pendingCount,
        activeCount,
        completedCount,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
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
