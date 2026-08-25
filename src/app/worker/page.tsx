'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { StarRating } from '@/components/StarRating';
import { WorkerGamificationPanel } from '@/components/WorkerGamificationPanel';
import { DesignPassPanel } from '@/components/DesignPassPanel';
import { Button } from '@/components/ui';
import { SkeletonDashboard } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useWorkerData } from '@/hooks/useWorkerData';
import { hasWorkerFeature, sortProjectsByUrgency } from '@/lib/workerGamification';

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

  const displayProjects = gamification && hasWorkerFeature(gamification, 'urgencySort')
    ? sortProjectsByUrgency(activeProjects)
    : activeProjects;

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
        <p className="mt-2 text-sm text-app-muted">{t('rating.ratingHint')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-deadline-green/30 bg-deadline-green/10 px-2.5 py-1 text-[11px] font-medium text-deadline-green">
            {t('worker.onTime')}
          </span>
          <span className="rounded-full border border-deadline-yellow/30 bg-deadline-yellow/10 px-2.5 py-1 text-[11px] font-medium text-deadline-yellow">
            {t('worker.attention')}
          </span>
          <span className="rounded-full border border-deadline-red/30 bg-deadline-red/10 px-2.5 py-1 text-[11px] font-medium text-deadline-red">
            {t('worker.overdue')}
          </span>
        </div>
      </div>

      {gamification && (
        <>
          {gamification.designPass && (
            <div className="mb-5">
              <DesignPassPanel designPass={gamification.designPass} compact />
            </div>
          )}
          <div className="mb-5">
            <WorkerGamificationPanel
              gamification={gamification}
              workerName={session?.name}
              workerId={session?.id}
              compact
            />
          </div>
        </>
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

      <section className="mt-6 sm:mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 font-display text-lg font-semibold text-app-text sm:text-xl">
            {t('dashboard.activeProjects')}
          </h2>
          <Link href="/worker/projects" className="shrink-0 text-sm font-medium text-app-accent hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {displayProjects.length === 0 ? (
          <EmptyState
            title={t('worker.noActiveProject')}
            description={t('worker.noActiveProjectDesc')}
          />
        ) : (
          <div className="ui-card-stack">
            {displayProjects.slice(0, 4).map((project) => (
              <ProjectCard key={project.id} project={project} variant="worker" />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
