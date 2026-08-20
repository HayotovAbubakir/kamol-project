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
import type { Project, ProjectComment, WorkerRating } from '@/types';

interface WorkerData {
  session: { id: string; username: string; name: string; role: 'worker' };
  activeProjects: Project[];
  completedProjects: Project[];
  returnedProjects: Project[];
  comments: ProjectComment[];
  rating: WorkerRating | null;
  loading: boolean;
  loadData: (options?: { silent?: boolean }) => Promise<void>;
}

const WorkerDataContext = createContext<WorkerData | null>(null);

export function WorkerDataProvider({ children }: { children: ReactNode }) {
  const session = getSession();
  const hasLoadedRef = useRef(false);

  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [returnedProjects, setReturnedProjects] = useState<Project[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [rating, setRating] = useState<WorkerRating | null>(null);
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
        completedProjects: Project[];
        returnedProjects: Project[];
        comments: ProjectComment[];
        rating: WorkerRating;
      }>('/api/worker/bootstrap');

      setActiveProjects(res.activeProjects);
      setCompletedProjects(res.completedProjects);
      setReturnedProjects(res.returnedProjects);
      setComments(res.comments ?? []);
      setRating(res.rating ?? null);

      hasLoadedRef.current = true;
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <WorkerDataContext.Provider
      value={{
        session: session as WorkerData['session'],
        activeProjects,
        completedProjects,
        returnedProjects,
        comments,
        rating,
        loading,
        loadData,
      }}
    >
      {children}
    </WorkerDataContext.Provider>
  );
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
