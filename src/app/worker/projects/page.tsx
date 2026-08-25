'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { SkeletonPage } from '@/components/Skeleton';
import { Button, ConfirmModal } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useWorkerData } from '@/hooks/useWorkerData';
import { apiFetch } from '@/lib/auth';
import { filterProjectsBySearch, getDeadlineUrgency, cn } from '@/lib/utils';
import { hasWorkerFeature, sortProjectsByUrgency } from '@/lib/workerGamification';

export default function WorkerProjectsPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const { activeProjects, comments, gamification, loading, loadData } = useWorkerData();
  const [searchQuery, setSearchQuery] = useState('');
  const [todayFocus, setTodayFocus] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);

  const canTodayFocus = hasWorkerFeature(gamification, 'todayFocus');
  const canUrgencySort = hasWorkerFeature(gamification, 'urgencySort');
  const canEnhancedSearch = hasWorkerFeature(gamification, 'enhancedSearch');

  const sortedProjects = useMemo(() => {
    if (canUrgencySort) return sortProjectsByUrgency(activeProjects);
    return activeProjects;
  }, [activeProjects, canUrgencySort]);

  const focusFiltered = useMemo(() => {
    if (!todayFocus || !canTodayFocus) return sortedProjects;
    return sortedProjects.filter((project) => {
      const urgency = getDeadlineUrgency(project.orderDate, project.status);
      return urgency === 'red' || urgency === 'yellow';
    });
  }, [sortedProjects, todayFocus, canTodayFocus]);

  const filtered = useMemo(
    () => filterProjectsBySearch(focusFiltered, searchQuery),
    [focusFiltered, searchQuery],
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
      showToast('success', t('toast.sentForReview'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <>
      <PageHeader title={t('worker.myProjectsTitle')} />

      {activeProjects.length > 0 && (
        <div className="mb-4 space-y-3">
          <ProjectSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('common.searchProjectsPlaceholder')}
            clearLabel={t('common.searchClear')}
            enhanced={canEnhancedSearch}
          />
          {canTodayFocus && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTodayFocus(false)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  !todayFocus
                    ? 'border-app-accent bg-app-accent/10 text-app-accent'
                    : 'border-app-border text-app-muted',
                )}
              >
                {t('gamification.allProjectsFilter')}
              </button>
              <button
                type="button"
                onClick={() => setTodayFocus(true)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  todayFocus
                    ? 'border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-300'
                    : 'border-app-border text-app-muted',
                )}
              >
                👑 {t('gamification.todayFocusFilter')}
              </button>
            </div>
          )}
          {canUrgencySort && (
            <p className="text-xs text-app-muted">⚡ {t('gamification.urgencySortActive')}</p>
          )}
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
            <Button variant="outline" onClick={() => { setSearchQuery(''); setTodayFocus(false); }}>
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
              onStatusChange={(id) => setConfirmCompleteId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!confirmCompleteId}
        title={t('project.completeConfirmTitle')}
        message={t('project.completeConfirmMessage')}
        confirmLabel={t('project.completeConfirmAction')}
        confirmingLabel={t('project.completing')}
        variant="primary"
        onConfirm={async () => {
          const id = confirmCompleteId;
          if (!id) return;
          await handleComplete(id);
          setConfirmCompleteId(null);
        }}
        onCancel={() => setConfirmCompleteId(null)}
      />
    </>
  );
}
