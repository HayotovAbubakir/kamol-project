'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui';
import { SkeletonDashboard } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useWorkerData } from '@/hooks/useWorkerData';

export default function WorkerDashboardPage() {
  const { t } = useAppSettings();
  const {
    activeProjects,
    completedCount,
    rating,
    loading,
  } = useWorkerData();

  if (loading) return <SkeletonDashboard withNotifications={false} />;

  return (
    <>
      <PageHeader
        title={t('dashboard.workerTitle')}
        actions={
          <Link href="/worker/projects">
            <Button>{t('nav.myProjects')}</Button>
          </Link>
        }
      />

      <div className="ui-glass-card mb-5 rounded-2xl border p-4 shadow-sm sm:mb-6 sm:p-5 md:p-6 dark:ring-1 dark:ring-metallic-green/15">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-app-accent sm:text-sm">
          {t('rating.myRating')}
        </h3>
        <StarRating rating={rating?.rating ?? 0} size="lg" />
      </div>

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
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-app-text">
            {t('dashboard.activeProjects')}
          </h2>
          <Link href="/worker/projects" className="text-sm font-medium text-app-accent hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {activeProjects.length === 0 ? (
          <EmptyState
            title={t('worker.noActiveProject')}
            description={t('worker.noActiveProjectDesc')}
          />
        ) : (
          <div className="ui-card-stack">
            {activeProjects.slice(0, 4).map((project) => (
              <ProjectCard key={project.id} project={project} variant="worker" />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
