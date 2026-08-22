'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/auth';
import { playNotificationSound } from '@/lib/notificationSound';
import type { AppNotification } from '@/types';

const POLL_MS = 5000;
const HIDDEN_POLL_MS = 30_000;

export function useNotificationPoll(
  userId: string | undefined,
  onUpdate: (notifications: AppNotification[]) => void,
) {
  // Track known notification ids across polls to detect new arrivals.
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Reset known-ids state when the user id changes (login/logout).
    knownIdsRef.current = null;

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
        if (!cancelled) {
          const items = res.notifications ?? [];
          // First poll: seed the known set without playing any sound (existing
          // notifications aren't "new" from the user's perspective).
          if (knownIdsRef.current === null) {
            knownIdsRef.current = new Set(items.map((n) => n.id));
          } else {
            const known = knownIdsRef.current;
            const arrivals = items.filter((n) => !known.has(n.id));
            const hasUnreadArrival = arrivals.some((n) => !n.read);
            for (const n of arrivals) known.add(n.id);
            if (hasUnreadArrival) playNotificationSound();
          }
          onUpdate(items);
        }
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
