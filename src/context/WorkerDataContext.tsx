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
import type { AppNotification, PendingCongrats, Project, ProjectComment, WorkerRating } from '@/types';

interface WorkerData {
  session: { id: string; username: string; name: string; role: 'worker' };
  activeProjects: Project[];
  completedCount: number;
  returnedProjects: Project[];
  comments: ProjectComment[];
  rating: WorkerRating | null;
  notifications: AppNotification[];
  pendingCongrats: PendingCongrats | null;
  loading: boolean;
  loadData: (options?: { silent?: boolean }) => Promise<void>;
  updateNotifications: (items: AppNotification[]) => void;
  dismissCongrats: () => Promise<void>;
}

const WorkerDataContext = createContext<WorkerData | null>(null);

export function WorkerDataProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => getSession());
  const hasLoadedRef = useRef(false);

  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [returnedProjects, setReturnedProjects] = useState<Project[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [rating, setRating] = useState<WorkerRating | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingCongrats, setPendingCongrats] = useState<PendingCongrats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!session) {
      setLoading(false);
      return;
    }

    const silent = options?.silent ?? hasLoadedRef.current;
    if (!silent) setLoading(true);

    try {
      const res = await apiFetch<{
        activeProjects: Project[];
        completedCount: number;
        returnedProjects: Project[];
        comments: ProjectComment[];
        rating: WorkerRating;
        notifications: AppNotification[];
        pendingCongrats: PendingCongrats | null;
      }>('/api/worker/bootstrap');

      setActiveProjects(res.activeProjects);
      setCompletedCount(res.completedCount ?? 0);
      setReturnedProjects(res.returnedProjects);
      setComments(res.comments ?? []);
      setRating(res.rating ?? null);
      setNotifications(res.notifications ?? []);
      setPendingCongrats(res.pendingCongrats ?? null);

      hasLoadedRef.current = true;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('worker bootstrap failed', err);
      }
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

  const dismissCongrats = useCallback(async () => {
    const month = pendingCongrats?.month;
    setPendingCongrats(null);
    if (!month) return;
    try {
      await apiFetch('/api/monthly-winners', {
        method: 'PATCH',
        body: JSON.stringify({ month }),
      });
    } catch {
      // ignore
    }
  }, [pendingCongrats?.month]);

  const value = useMemo<WorkerData>(
    () => ({
      session: session as WorkerData['session'],
      activeProjects,
      completedCount,
      returnedProjects,
      comments,
      rating,
      notifications,
      pendingCongrats,
      loading,
      loadData,
      updateNotifications,
      dismissCongrats,
    }),
    [
      session,
      activeProjects,
      completedCount,
      returnedProjects,
      comments,
      rating,
      notifications,
      pendingCongrats,
      loading,
      loadData,
      updateNotifications,
      dismissCongrats,
    ],
  );

  return <WorkerDataContext.Provider value={value}>{children}</WorkerDataContext.Provider>;
}

export function useWorkerData(): WorkerData {
  const ctx = useContext(WorkerDataContext);
  if (!ctx) {
    throw new Error('useWorkerData must be used within WorkerDataProvider');
  }
  return ctx;
}

export function useWorkerDataOptional(): WorkerData | null {
  return useContext(WorkerDataContext);
}
