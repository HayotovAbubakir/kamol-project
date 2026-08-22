'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { DashboardAnalytics } from '@/components/DashboardAnalytics';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { Button } from '@/components/ui';
import { SkeletonDashboard } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useAdminData } from '@/hooks/useAdminData';
import { apiFetch, getSession } from '@/lib/auth';
import { notifyNotificationsUpdated } from '@/lib/notificationEvents';

export default function AdminDashboardPage() {
  const { t } = useAppSettings();
  const {
    projects,
    workers,
    payments,
    notifications,
    loading,
    updateNotifications,
    pendingCount,
    activeCount,
    completedCount,
  } = useAdminData();

  const session = getSession();

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

  async function markAllRead() {
    if (!session) return;
    updateNotifications(notifications.map((n) => (n.read ? n : { ...n, read: true })));
    try {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAllRead: true, userId: session.id }),
      });
      notifyNotificationsUpdated();
    } catch {
      updateNotifications(notifications);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <SkeletonDashboard compact />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="shrink-0">
        <PageHeader
          compact
          title={t('dashboard.adminTitle')}
          actions={
            <>
              <Link href="/admin/projects">
                <Button>+ {t('admin.newOrder')}</Button>
              </Link>
              <Link href="/admin/workers">
                <Button variant="outline">{t('nav.workers')}</Button>
              </Link>
            </>
          }
        />
      </div>

      <div className="ui-stat-grid shrink-0">
        <StatCard
          compact
          label={t('admin.activeProjects')}
          value={activeCount}
          href="/admin/projects?tab=active"
          icon={<FolderMini />}
        />
        <StatCard
          compact
          label={t('admin.pending')}
          value={pendingCount}
          href="/admin/projects?tab=pending"
          icon={<ClockMini />}
        />
        <StatCard
          compact
          label={t('admin.completed')}
          value={completedCount}
          href="/admin/projects?tab=completed"
          icon={<CheckMini />}
        />
        <StatCard
          compact
          label={t('admin.workers')}
          value={workers.length}
          href="/admin/workers"
          icon={<UsersMini />}
        />
      </div>

      <div className="dashboard-bottom">
        <div className="dashboard-analytics-wrap min-h-0 overflow-hidden lg:col-span-2">
          <DashboardAnalytics projects={projects} workers={workers} payments={payments} compact />
        </div>

        <div className="dashboard-notifications-wrap min-h-0 overflow-hidden">
          <NotificationsPanel
            embedded
            compact
            notifications={notifications.slice(0, 3)}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
          <div className="mt-2 flex justify-end">
            <Link href="/admin/notifications" className="ui-link-btn text-xs">
              {t('dashboard.viewAll')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderMini() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7.5Z" />
    </svg>
  );
}

function ClockMini() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M12 8v4l3 2" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 9 17.25 19.5 6.75" />
    </svg>
  );
}

function UsersMini() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M12.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
    </svg>
  );
}
