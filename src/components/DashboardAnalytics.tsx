'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Payment, Project, WorkerSummary } from '@/types';
import { useAppSettings } from '@/context/AppSettingsContext';
import { computeProjectAnalytics } from '@/lib/stats';
import { cn, formatAddress, formatPrice } from '@/lib/utils';
import { getRemainingPrice, isFullyPaid } from '@/lib/payments';
import { Modal, Button } from '@/components/ui';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/EmptyState';
import { AnalyticsBarChart } from '@/components/charts/AnalyticsBarChart';
import { AnalyticsChartStage } from '@/components/charts/AnalyticsChartStage';

interface DashboardAnalyticsProps {
  projects: Project[];
  workers?: WorkerSummary[];
  payments?: Payment[];
  compact?: boolean;
}

export function DashboardAnalytics({
  projects,
  workers = [],
  payments = [],
  compact = false,
}: DashboardAnalyticsProps) {
  const { t, theme } = useAppSettings();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [sumOpen, setSumOpen] = useState(false);
  const analytics = useMemo(() => computeProjectAnalytics(projects), [projects]);
  const {
    thisMonthCount,
    lastMonthCount,
    monthDelta,
    totalSum,
    thisMonthSum,
    lastMonthSum,
  } = analytics;

  const workerNames = useMemo(
    () => new Map(workers.map((worker) => [worker.id, worker.name])),
    [workers],
  );

  const paymentsByProject = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const payment of payments) {
      const list = map.get(payment.projectId) ?? [];
      list.push(payment);
      map.set(payment.projectId, list);
    }
    return map;
  }, [payments]);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()),
    [projects],
  );

  const pricedProjects = useMemo(
    () =>
      [...projects]
        .filter((p) => (p.price ?? 0) > 0)
        .sort((a, b) => (b.price ?? 0) - (a.price ?? 0)),
    [projects],
  );

  const isDark = theme === 'dark';

  const projectChartData = useMemo(
    () => [
      { label: t('dashboard.lastMonth'), value: lastMonthCount },
      { label: t('dashboard.thisMonthShort'), value: thisMonthCount },
    ],
    [lastMonthCount, thisMonthCount, t],
  );

  const sumChartData = useMemo(
    () => [
      { label: t('dashboard.lastMonth'), value: lastMonthSum },
      { label: t('dashboard.thisMonthShort'), value: thisMonthSum },
    ],
    [lastMonthSum, thisMonthSum, t],
  );

  let deltaLabel = t('dashboard.sameMonth');
  let deltaClass = 'text-app-muted';

  if (monthDelta > 0) {
    deltaLabel = `+${monthDelta} ${t('dashboard.moreThanLastMonth')}`;
    deltaClass = 'text-deadline-green';
  } else if (monthDelta < 0) {
    deltaLabel = `${monthDelta} ${t('dashboard.lessThanLastMonth')}`;
    deltaClass = 'text-deadline-red';
  }

  return (
    <>
      <section className="flex h-full min-h-0 flex-col">
        <h2 className={cn('shrink-0 font-display font-semibold text-app-text', compact ? 'mb-1.5 text-sm tv:mb-2 tv:text-lg' : 'mb-3 text-xl')}>
          {t('dashboard.analytics')}
        </h2>

        <div className={cn('grid min-h-0 flex-1 gap-1.5 sm:grid-cols-2', !compact && 'gap-2')}>
          <button
            type="button"
            onClick={() => setProjectsOpen(true)}
            aria-label={t('dashboard.chartOpenProjects')}
            className={cn('ui-analytics-card ui-analytics-card-emerald group text-left', compact && 'ui-analytics-card-compact')}
          >
            <div className="ui-analytics-card-head">
              <div className="min-w-0 flex-1">
                <p className="ui-analytics-card-label">{t('dashboard.thisMonthProjects')}</p>
                <p className={cn('ui-analytics-kpi ui-analytics-kpi-emerald', compact && 'ui-analytics-kpi-compact')}>
                  {thisMonthCount}
                  <span className="ui-analytics-kpi-unit">{t('dashboard.projectUnit')}</span>
                </p>
              </div>
              <span className="ui-analytics-link">{t('dashboard.viewAll')} →</span>
            </div>

            <AnalyticsChartStage minHeight={compact ? 128 : 180}>
              {(height) => (
                <AnalyticsBarChart
                  data={projectChartData}
                  height={height}
                  isDark={isDark}
                  formatValue={(value) => `${value} ${t('dashboard.projectUnit')}`}
                  compact={compact}
                  variant="emerald"
                />
              )}
            </AnalyticsChartStage>

            {!compact && (
              <p className={cn('ui-analytics-footnote', deltaClass)}>
                {t('dashboard.vsLastMonth')}: {deltaLabel}
              </p>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSumOpen(true)}
            aria-label={t('dashboard.chartOpenSum')}
            className={cn('ui-analytics-card ui-analytics-card-gold group text-left', compact && 'ui-analytics-card-compact')}
          >
            <div className="ui-analytics-card-head">
              <div className="min-w-0 flex-1">
                <p className="ui-analytics-card-label">{t('dashboard.totalSum')}</p>
                <p className={cn('ui-analytics-kpi ui-analytics-kpi-gold', compact && 'ui-analytics-kpi-compact')}>
                  {formatPrice(totalSum)}
                  <span className="ui-analytics-kpi-unit">{t('dashboard.sumCurrency')}</span>
                </p>
              </div>
              <span className="ui-analytics-link">{t('dashboard.viewAll')} →</span>
            </div>

            {!compact && <p className="ui-analytics-sub">{t('dashboard.monthlySumCompare')}</p>}

            <AnalyticsChartStage minHeight={compact ? 128 : 180}>
              {(height) => (
                <AnalyticsBarChart
                  data={sumChartData}
                  height={height}
                  isDark={isDark}
                  formatValue={(value) => formatPrice(value)}
                  compact={compact}
                  variant="gold"
                />
              )}
            </AnalyticsChartStage>

            {!compact && <p className="ui-analytics-footnote">{t('dashboard.totalSumHint')}</p>}
          </button>
        </div>
      </section>

      <Modal
        open={projectsOpen}
        title={t('dashboard.allProjects')}
        description={t('dashboard.allProjectsDesc')}
        onClose={() => setProjectsOpen(false)}
        size="full"
      >
        {sortedProjects.length === 0 ? (
          <EmptyState title={t('dashboard.noProjectsYet')} description={t('dashboard.noProjectsDesc')} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {sortedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  workerName={project.assignedTo ? workerNames.get(project.assignedTo) : undefined}
                  variant="grid"
                />
              ))}
            </div>
            <div className="flex justify-end border-t border-app-border pt-4">
              <Link href="/admin/projects" onClick={() => setProjectsOpen(false)}>
                <Button>{t('nav.projects')}</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={sumOpen}
        title={t('dashboard.sumBreakdown')}
        description={t('dashboard.sumBreakdownDesc')}
        onClose={() => setSumOpen(false)}
        size="full"
      >
        {pricedProjects.length === 0 ? (
          <EmptyState
            title={t('dashboard.sumNoProjects')}
            description={t('dashboard.sumNoProjectsDesc')}
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-app-border bg-app-card px-4 py-3.5 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
                  {t('dashboard.totalSum')}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-app-accent sm:text-3xl">
                  {formatPrice(totalSum)}
                  <span className="ml-1 text-sm font-medium text-app-muted">{t('dashboard.sumCurrency')}</span>
                </p>
              </div>
              <p className="text-sm text-app-muted">
                {pricedProjects.length} {t('dashboard.sumProjectCount')}
              </p>
            </div>

            <ul className="space-y-2.5">
              {pricedProjects.map((project, index) => {
                const projectPayments = paymentsByProject.get(project.id) ?? [];
                const remaining = getRemainingPrice(project, projectPayments);
                const fullyPaid = isFullyPaid(project, projectPayments);
                const statusLabel = t(`status.${project.status}` as 'status.pending');
                return (
                  <li
                    key={project.id}
                    className="rounded-2xl border border-app-border bg-app-card px-4 py-3.5 shadow-sm dark:ring-1 dark:ring-metallic-green/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tabular-nums text-app-muted">#{index + 1}</p>
                        <h3 className="mt-0.5 truncate font-display text-base font-semibold text-app-text">
                          {formatAddress(project) || project.clientName || project.title}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-app-muted">
                          {project.clientName || project.title}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg font-bold tabular-nums text-app-accent">
                          {formatPrice(project.price)}
                        </p>
                        <p className="text-xs text-app-muted">{t('dashboard.sumCurrency')}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-app-border/70 pt-2.5 text-xs text-app-muted">
                      <span className="rounded-full border border-app-border bg-app-bg px-2 py-0.5 font-medium text-app-text">
                        {statusLabel}
                      </span>
                      {project.advancePaid && project.advanceAmount != null && (
                        <span>
                          {t('project.advance')}: {formatPrice(project.advanceAmount)}
                        </span>
                      )}
                      {remaining != null && (
                        <span className="font-medium text-app-text">
                          {t('project.remaining')}: {formatPrice(remaining)}
                        </span>
                      )}
                      {fullyPaid && (
                        <span className="font-medium text-green-700 dark:text-green-300">
                          {t('project.fullyPaid')}
                        </span>
                      )}
                      {project.assignedTo && workerNames.get(project.assignedTo) && (
                        <span className="min-w-0 max-w-full truncate">
                          {t('project.assignedWorker')}: {workerNames.get(project.assignedTo)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-end border-t border-app-border pt-4">
              <Link href="/admin/projects" onClick={() => setSumOpen(false)}>
                <Button>{t('nav.projects')}</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
