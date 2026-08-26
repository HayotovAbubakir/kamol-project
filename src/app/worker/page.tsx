'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StarRating } from '@/components/StarRating';
import { WorkerGamificationPanel } from '@/components/WorkerGamificationPanel';
import { Button } from '@/components/ui';
import { SkeletonDashboard } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useWorkerData } from '@/hooks/useWorkerData';

export default function WorkerDashboardPage() {
  const { t } = useAppSettings();
  const {
    activeProjects,
    completedCount,
    returnedProjects,
    rating,
    gamification,
    loading,
    session,
  } = useWorkerData();

  if (loading) return <SkeletonDashboard withNotifications={false} />;

  return (
    <>
      <PageHeader
        title={
          session?.name
            ? t('dashboard.workerGreeting').replace('{name}', session.name)
            : t('dashboard.workerTitle')
        }
        actions={
          <Link href="/worker/projects">
            <Button>{t('nav.myProjects')}</Button>
          </Link>
        }
      />

      {returnedProjects.length > 0 && (
        <Link
          href="/worker/returned"
          className="mb-5 flex items-start gap-3 rounded-xl border-2 border-red-500/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100"
        >
          <span aria-hidden>!</span>
          <span>
            {t('worker.returnedBanner').replace('{count}', String(returnedProjects.length))}
          </span>
        </Link>
      )}

      <div className="ui-glass-card mb-5 rounded-2xl border p-4 shadow-sm sm:mb-6 sm:p-5 md:p-6 dark:ring-1 dark:ring-metallic-green/15">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-app-accent sm:text-sm">
          {t('rating.myRating')}
        </h3>
        <StarRating rating={rating?.rating ?? 0} size="lg" />
      </div>

      {gamification && (
        <div className="mb-5">
          <WorkerGamificationPanel
            gamification={gamification}
            workerName={session?.name}
            workerId={session?.id}
            compact
          />
        </div>
      )}

      <div className="ui-stat-grid">
        <StatCard
          label={t('worker.inProgress')}
          value={activeProjects.length}
          href="/worker/projects"
        />
        <StatCard
          label={t('worker.completed')}
          value={completedCount}
          href="/worker/completed"
        />
        {gamification && (
          <StatCard
            label={t('gamification.lifetimePoints')}
            value={gamification.lifetimePoints}
            href="/worker/leaderboard"
          />
        )}
      </div>
    </>
  );
}
