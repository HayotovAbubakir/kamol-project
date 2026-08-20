'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { NotificationDateFilter } from '@/components/NotificationDateFilter';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useAdminData } from '@/hooks/useAdminData';
import { apiFetch } from '@/lib/auth';
import { notifyNotificationsUpdated } from '@/lib/notificationEvents';
import {
  filterNotificationsByDatePreset,
  type NotificationDatePreset,
} from '@/lib/utils';

export default function AdminNotificationsPage() {
  const { t } = useAppSettings();
  const { session, notifications, loadData } = useAdminData();
  const [datePreset, setDatePreset] = useState<NotificationDatePreset>('this_week');

  const filteredNotifications = useMemo(
    () => filterNotificationsByDatePreset(notifications, datePreset),
    [notifications, datePreset],
  );

  useEffect(() => {
    if (!session) return;

    void (async () => {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAllRead: true, userId: session.id }),
      });
      await loadData({ silent: true });
      notifyNotificationsUpdated();
    })();
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markRead(id: string) {
    await apiFetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    });
    await loadData({ silent: true });
    notifyNotificationsUpdated();
  }

  async function markAllRead() {
    if (!session) return;
    await apiFetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: true, userId: session.id }),
    });
    await loadData({ silent: true });
    notifyNotificationsUpdated();
  }

  return (
    <>
      <div className="mb-4">
        <NotificationDateFilter value={datePreset} onChange={setDatePreset} />
      </div>
      <PageHeader title={t('notifications.title')} />
      <NotificationsPanel
        notifications={filteredNotifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        emptyMessage={
          notifications.length > 0 && filteredNotifications.length === 0
            ? t('notifications.emptyFiltered')
            : undefined
        }
        full
      />
    </>
  );
}
