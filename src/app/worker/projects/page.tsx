'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { SkeletonPage } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useWorkerData } from '@/hooks/useWorkerData';
import { apiFetch } from '@/lib/auth';
import { filterProjectsBySearch } from '@/lib/utils';

export default function WorkerProjectsPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const { activeProjects, comments, loading, loadData } = useWorkerData();
  const [searchQuery, setSearchQuery] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterProjectsBySearch(activeProjects, searchQuery),
    [activeProjects, searchQuery],
  );

  const commentsByProject = useMemo(() => {
    const map = new Map<string, typeof comments>();
    for (const c of comments) {
      const list = map.get(c.projectId) ?? [];
      list.push(c);
      map.set(c.projectId, list);
    }
    return map;
  }, [comments]);

  async function handleComplete(projectId: string) {
    if (completingId) return;
    setCompletingId(projectId);
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, status: 'completed' }),
      });
      await loadData({ silent: true });
      showToast('success', t('toast.completed'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <>
      <PageHeader title={t('worker.myProjectsTitle')} description={t('worker.myProjectsDesc')} />

      {activeProjects.length > 0 && (
        <div className="mb-4">
          <ProjectSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('common.searchProjectsPlaceholder')}
            clearLabel={t('common.searchClear')}
          />
        </div>
      )}

      {activeProjects.length === 0 ? (
        <EmptyState
          title={t('worker.noActiveProject')}
          description={t('worker.noActiveProjectDesc')}
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
        <div className="ui-project-grid">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              variant="worker"
              comments={commentsByProject.get(project.id) ?? []}
              showActions
              actionBusy={completingId === project.id}
              onStatusChange={(id) => handleComplete(id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
