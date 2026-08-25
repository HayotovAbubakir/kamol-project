'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { CompletedDateFilter } from '@/components/CompletedDateFilter';
import { SkeletonPage } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useWorkerData } from '@/hooks/useWorkerData';
import { apiFetch } from '@/lib/auth';
import {
  formatCompletedPeriodLabel,
  getCompletedDateRange,
  toDateParam,
  type CompletedDateSelection,
} from '@/lib/completedDateFilter';
import { filterProjectsBySearch } from '@/lib/utils';
import type { Project } from '@/types';

const PAGE_LIMIT = 50;

export default function WorkerCompletedPage() {
  const { t, locale } = useAppSettings();
  const { comments, loading: bootstrapLoading } = useWorkerData();
  const [selection, setSelection] = useState<CompletedDateSelection>({
    kind: 'preset',
    preset: 'this_week',
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const periodRange = useMemo(() => getCompletedDateRange(selection), [selection]);
  const periodLabel = useMemo(
    () => formatCompletedPeriodLabel(periodRange.start, periodRange.end, locale),
    [periodRange, locale],
  );

  const customReady =
    selection.kind !== 'custom' ||
    (Boolean(selection.start) && Boolean(selection.end));

  const loadProjects = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (!customReady) return;

      if (replace) setLoading(true);
      else setLoadingMore(true);

      try {
        const start = toDateParam(periodRange.start);
        const end = toDateParam(periodRange.end);
        const res = await apiFetch<{
          projects: Project[];
          total: number;
          hasMore: boolean;
          page: number;
        }>(
          `/api/worker/completed?start_date=${start}&end_date=${end}&page=${pageNum}&limit=${PAGE_LIMIT}`,
        );

        setProjects((prev) => (replace ? res.projects : [...prev, ...res.projects]));
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(res.page);
      } catch {
        if (replace) {
          setProjects([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [customReady, periodRange.end, periodRange.start],
  );

  useEffect(() => {
    if (!customReady) {
      setLoading(false);
      setProjects([]);
      setTotal(0);
      setHasMore(false);
      return;
    }
    loadProjects(1, true);
  }, [customReady, loadProjects]);

  const filtered = useMemo(
    () => filterProjectsBySearch(projects, searchQuery),
    [projects, searchQuery],
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

  if (bootstrapLoading && loading) return <SkeletonPage />;

  return (
    <>
      <PageHeader
        title={t('worker.completedTitle')}
        subtitle={periodLabel}
        actions={
          <CompletedDateFilter selection={selection} onChange={setSelection} />
        }
      />

      {loading ? (
        <SkeletonPage />
      ) : !customReady ? (
        <EmptyState
          title={t('worker.completedCustomRange')}
          description={t('worker.completedCustomRangeHint')}
        />
      ) : (
        <>
          {projects.length > 0 && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <ProjectSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('common.searchProjectsPlaceholder')}
                clearLabel={t('common.searchClear')}
              />
              <p className="text-xs text-app-muted sm:text-right">
                {total} {t('dashboard.projectUnit')}
              </p>
            </div>
          )}

          {projects.length === 0 ? (
            <EmptyState
              title={t('worker.noCompletedInPeriod')}
              description={t('worker.noCompletedInPeriodDesc')}
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
            <>
              <div className="ui-card-stack">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="worker"
                    comments={commentsByProject.get(project.id) ?? []}
                  />
                ))}
              </div>

              {hasMore && !searchQuery.trim() && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    disabled={loadingMore}
                    onClick={() => loadProjects(page + 1, false)}
                  >
                    {loadingMore ? t('worker.loadingCompleted') : t('worker.loadMoreCompleted')}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
