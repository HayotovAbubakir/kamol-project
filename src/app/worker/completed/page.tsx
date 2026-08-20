'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { SkeletonPage } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useWorkerData } from '@/hooks/useWorkerData';
import { filterProjectsBySearch } from '@/lib/utils';

export default function WorkerCompletedPage() {
  const { t } = useAppSettings();
  const { completedProjects, comments, loading } = useWorkerData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(
    () => filterProjectsBySearch(completedProjects, searchQuery),
    [completedProjects, searchQuery],
  );

  if (loading) return <SkeletonPage />;

  return (
    <>
      <PageHeader title={t('worker.completedTitle')} description={t('worker.completedDesc')} />

      {completedProjects.length > 0 && (
        <div className="mb-4">
          <ProjectSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('common.searchProjectsPlaceholder')}
            clearLabel={t('common.searchClear')}
          />
        </div>
      )}

      {completedProjects.length === 0 ? (
        <EmptyState
          title={t('worker.noCompletedProject')}
          description={t('worker.noCompletedProjectDesc')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('common.searchNoResults')}
          description={t('common.searchNoResultsDesc')}
          action={
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              {t('common.searchClear')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              variant="worker"
              comments={comments.filter((c) => c.projectId === project.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
