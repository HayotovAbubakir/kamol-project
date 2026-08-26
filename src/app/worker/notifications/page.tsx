'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { NotificationDateFilter } from '@/components/NotificationDateFilter';
import { SkeletonPage } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useAutoMarkAllNotificationsRead } from '@/hooks/useAutoMarkAllNotificationsRead';
import { useWorkerData } from '@/hooks/useWorkerData';
import { apiFetch } from '@/lib/auth';
import { notifyNotificationsUpdated } from '@/lib/notificationEvents';
import {
  filterNotificationsByDatePreset,
  type NotificationDatePreset,
} from '@/lib/utils';

export default function WorkerNotificationsPage() {
  const { t } = useAppSettings();
  const { notifications, loading, updateNotifications } = useWorkerData();
  const [datePreset, setDatePreset] = useState<NotificationDatePreset>('this_week');

  useAutoMarkAllNotificationsRead(notifications, loading, updateNotifications);

  const filtered = useMemo(
    () => filterNotificationsByDatePreset(notifications, datePreset),
    [notifications, datePreset],
  );

  async function markRead(id: string) {
    updateNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ id }),
      });
      notifyNotificationsUpdated();
    } catch {
      updateNotifications(notifications);
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-6">
      <PageHeader
        title={t('notifications.title')}
        description={t('worker.notificationsDesc')}
        actions={
          <NotificationDateFilter value={datePreset} onChange={setDatePreset} />
        }
      />

      <div className="ui-glass-card rounded-2xl border p-4 shadow-sm dark:ring-1 dark:ring-metallic-green/15 sm:p-5">
        <NotificationsPanel
          full
          notifications={filtered}
          onMarkRead={markRead}
          emptyMessage={
            datePreset === 'this_week'
              ? t('notifications.emptyFiltered')
              : t('notifications.empty')
          }
        />
      </div>
    </div>
  );
}
