'use client';

import { useEffect } from 'react';
import { apiFetch } from '@/lib/auth';
import type { AppNotification } from '@/types';

const POLL_MS = 5000;
const HIDDEN_POLL_MS = 30_000;

export function useNotificationPoll(
  userId: string | undefined,
  onUpdate: (notifications: AppNotification[]) => void,
) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(HIDDEN_POLL_MS);
        return;
      }

      try {
        const res = await apiFetch<{ notifications: AppNotification[] }>(
          `/api/notifications?userId=${userId}`,
        );
        if (!cancelled) onUpdate(res.notifications);
      } catch {
        // ignore
      }

      schedule(POLL_MS);
    }

    function schedule(ms: number) {
      if (cancelled) return;
      timer = setTimeout(poll, ms);
    }

    function onVisibilityChange() {
      if (document.hidden) return;
      if (timer) clearTimeout(timer);
      poll();
    }

    poll();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, onUpdate]);
}
