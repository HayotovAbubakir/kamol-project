'use client';

import { useEffect, useRef } from 'react';
import { apiFetch, getSession } from '@/lib/auth';
import { notifyNotificationsUpdated } from '@/lib/notificationEvents';
import type { AppNotification } from '@/types';

export function useAutoMarkAllNotificationsRead(
  notifications: AppNotification[],
  loading: boolean,
  updateNotifications: (notifications: AppNotification[]) => void,
) {
  const markedRef = useRef(false);

  useEffect(() => {
    if (loading || markedRef.current) return;

    const session = getSession();
    if (!session) return;
    if (!notifications.some((n) => !n.read)) return;

    markedRef.current = true;
    const previous = notifications;
    updateNotifications(notifications.map((n) => (n.read ? n : { ...n, read: true })));

    void apiFetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: true, userId: session.id }),
    })
      .then(() => notifyNotificationsUpdated())
      .catch(() => {
        markedRef.current = false;
        updateNotifications(previous);
      });
  }, [loading, notifications, updateNotifications]);
}
