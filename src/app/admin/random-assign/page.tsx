'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button, uiChoiceCardActiveClass, uiChoiceCardClass, uiSelectRowActiveClass, uiSelectRowClass } from '@/components/ui';
import { AssignAnimation, AnimationTypeIcon } from '@/components/random-assign/AssignAnimation';
import { AssignDistributionChart } from '@/components/random-assign/AssignDistributionChart';
import { AssignStepIndicator, type AssignStep } from '@/components/random-assign/AssignStepIndicator';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { apiFetch } from '@/lib/auth';
import {
  ANIMATION_TYPES,
  buildDistributionCounts,
  createRandomPairs,
  formatAssignResult,
  formatProjectShort,
  getFairAssignSummary,
  resolveAnimationType,
  type AnimationType,
  type AssignPair,
} from '@/lib/randomAssign';
import { cn, filterProjectsBySearch } from '@/lib/utils';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';

type Phase = 'setup' | 'preview' | 'running' | 'done';
type AnimationChoice = AnimationType | 'mix';

function phaseToStep(phase: Phase): AssignStep {
  if (phase === 'setup') return 'select';
  if (phase === 'preview') return 'preview';
  if (phase === 'running') return 'animate';
  return 'done';
}

function animationLabel(type: AnimationType | 'mix', t: (key: string) => string): string {
  const map: Record<AnimationType | 'mix', string> = {
    wheel: t('randomAssign.animationWheel'),
    slot: t('randomAssign.animationSlot'),
    dice: t('randomAssign.animationDice'),
    shuffle: t('randomAssign.animationShuffle'),
    lottery: t('randomAssign.animationLottery'),
    mix: t('randomAssign.animationMix'),
  };
  return map[type];
}

export default function RandomAssignPage() {
  const router = useRouter();
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const { projects, workers, loading, loadData } = useAdminData();

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [animationChoice, setAnimationChoice] = useState<AnimationChoice>('wheel');
  const [phase, setPhase] = useState<Phase>('setup');
  const [pairs, setPairs] = useState<AssignPair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const pendingProjects = useMemo(
    () => projects.filter((p) => p.status === 'pending'),
    [projects],
  );

  const visiblePendingProjects = useMemo(
    () => filterProjectsBySearch(pendingProjects, projectSearch),
    [pendingProjects, projectSearch],
  );

  const selectedWorkerUsers = useMemo(
    () => workers.filter((w) => selectedWorkers.includes(w.id)),
    [workers, selectedWorkers],
  );

  const selectedProjectItems = useMemo(
    () => pendingProjects.filter((p) => selectedProjects.includes(p.id)),
    [pendingProjects, selectedProjects],
  );

  const fairSummary = useMemo(
    () => getFairAssignSummary(selectedProjectItems.length, selectedWorkerUsers.length),
    [selectedProjectItems.length, selectedWorkerUsers.length],
  );

  const workerCandidates = useMemo(
    () => selectedWorkerUsers.map((w) => w.name),
    [selectedWorkerUsers],
  );

  const projectCandidates = useMemo(
    () => selectedProjectItems.map((p) => formatProjectShort(p)),
    [selectedProjectItems],
  );

  const distributionData = useMemo(() => {
    if (phase === 'preview' || phase === 'running' || phase === 'done') {
      return buildDistributionCounts(selectedWorkerUsers, pairs);
    }
    return selectedWorkerUsers.map((w) => ({ label: w.name, value: fairSummary.assignCount > 0 ? 1 : 0 }));
  }, [phase, selectedWorkerUsers, pairs, fairSummary.assignCount]);

  const stepLabels = useMemo(
    (): Record<AssignStep, string> => ({
      select: t('randomAssign.stepSelect'),
      preview: t('randomAssign.stepPreview'),
      animate: t('randomAssign.stepAnimate'),
      done: t('randomAssign.stepDone'),
    }),
    [t],
  );

  const animationOptions: (AnimationType | 'mix')[] = [...ANIMATION_TYPES, 'mix'];

  function toggleWorker(id: string) {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleProject(id: string) {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllWorkers() {
    setSelectedWorkers(workers.map((w) => w.id));
  }

  function selectAllProjects() {
    const ids = (projectSearch.trim() ? visiblePendingProjects : pendingProjects).map((p) => p.id);
    setSelectedProjects((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function generatePairs() {
    return createRandomPairs(selectedProjectItems, selectedWorkerUsers);
  }

  function handleGoToPreview() {
    if (selectedWorkers.length === 0) {
      showToast('error', t('randomAssign.noWorkers'));
      return;
    }
    if (selectedProjects.length === 0) {
      showToast('error', t('randomAssign.noProjects'));
      return;
    }

    setPairs(generatePairs());
    setResults([]);
    setCurrentIndex(0);
    setPhase('preview');
  }

  function handleRegenerate() {
    setPairs(generatePairs());
    setResults([]);
    setCurrentIndex(0);
  }

  function handleStartAnimation() {
    setResults([]);
    setCurrentIndex(0);
    setPhase('running');
  }

  async function finishAndSave(finalPairs: AssignPair[]) {
    setSaving(true);
    try {
      await apiFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'batch',
          assignments: finalPairs.map((p) => ({
            projectId: p.projectId,
            workerId: p.workerId,
          })),
        }),
      });
      await loadData({ silent: true });
      setPhase('done');
      showToast('success', t('toast.assigned'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
      setPhase('preview');
    } finally {
      setSaving(false);
    }
  }

  const handleAnimationComplete = useCallback(() => {
    const pair = pairs[currentIndex];
    if (!pair) return;

    const line = formatAssignResult(pair.workerName, pair.projectLabel);
    const nextIndex = currentIndex + 1;

    setResults((prev) => [...prev, line]);

    if (nextIndex >= pairs.length) {
      void finishAndSave(pairs);
      return;
    }

    setCurrentIndex(nextIndex);
  }, [pairs, currentIndex]);

  function handleReset() {
    setPhase('setup');
    setPairs([]);
    setResults([]);
    setCurrentIndex(0);
  }

  const currentPair = pairs[currentIndex];
  const currentAnimation = currentPair
    ? resolveAnimationType(animationChoice, currentIndex)
    : 'wheel';

  const progressText = t('randomAssign.progress')
    .replace('{current}', String(Math.min(currentIndex + 1, pairs.length || 1)))
    .replace('{total}', String(pairs.length || 0));

  useEffect(() => {
    const shell = document.querySelector('.ui-page-shell');
    if (!shell) return;
    if (phase === 'running') {
      shell.classList.add('overflow-hidden');
      shell.classList.remove('overflow-y-auto');
      return () => {
        shell.classList.remove('overflow-hidden');
        shell.classList.add('overflow-y-auto');
      };
    }
  }, [phase]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {phase !== 'running' && (
        <PageHeader
          title={t('randomAssign.title')}
          description={phase === 'setup' ? t('randomAssign.description') : undefined}
          actions={
            phase === 'setup' ? (
              <Button variant="outline" onClick={() => router.push('/admin/projects')}>
                ← {t('nav.projects')}
              </Button>
            ) : null
          }
        />
      )}

      {phase !== 'running' && (
        <div className="mb-8">
          <AssignStepIndicator current={phaseToStep(phase)} labels={stepLabels} />
        </div>
      )}

      {(phase === 'setup' || phase === 'preview') && selectedWorkerUsers.length > 0 && selectedProjectItems.length > 0 && (
        <SummaryStrip
          workers={selectedWorkerUsers.length}
          projects={selectedProjectItems.length}
          willAssign={fairSummary.assignCount}
          labels={{
            workers: t('randomAssign.statWorkers'),
            projects: t('randomAssign.statProjects'),
            willAssign: t('randomAssign.statWillAssign'),
          }}
        />
      )}

      {phase === 'setup' && (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <SelectionPanel
              title={t('randomAssign.selectWorkers')}
              count={selectedWorkers.length}
              onSelectAll={selectAllWorkers}
              onDeselectAll={() => setSelectedWorkers([])}
              selectAllLabel={t('randomAssign.selectAll')}
              deselectAllLabel={t('randomAssign.deselectAll')}
              empty={workers.length === 0 ? t('admin.noWorkers') : undefined}
            >
              {workers.map((w) => (
                <SelectRow
                  key={w.id}
                  checked={selectedWorkers.includes(w.id)}
                  onChange={() => toggleWorker(w.id)}
                  label={w.name}
                  sub=""
                />
              ))}
            </SelectionPanel>

            <SelectionPanel
              title={t('randomAssign.selectProjects')}
              count={selectedProjects.length}
              onSelectAll={selectAllProjects}
              onDeselectAll={() => setSelectedProjects([])}
              selectAllLabel={t('randomAssign.selectAll')}
              deselectAllLabel={t('randomAssign.deselectAll')}
              empty={pendingProjects.length === 0 ? t('admin.noProjects') : undefined}
            >
              {pendingProjects.length > 0 && (
                <div className="mb-2 px-1">
                  <ProjectSearchInput
                    value={projectSearch}
                    onChange={setProjectSearch}
                    placeholder={t('common.searchProjectsPlaceholder')}
                    clearLabel={t('common.searchClear')}
                  />
                </div>
              )}
              {pendingProjects.length > 0 && visiblePendingProjects.length === 0 ? (
                <p className="px-3 py-4 text-sm text-app-muted">{t('common.searchNoResults')}</p>
              ) : (
                visiblePendingProjects.map((p) => (
                  <SelectRow
                    key={p.id}
                    checked={selectedProjects.includes(p.id)}
                    onChange={() => toggleProject(p.id)}
                    label={p.address || p.title}
                    sub={p.clientName || formatProjectShort(p)}
                  />
                ))
              )}
            </SelectionPanel>
          </div>

          <section className="ui-glass-card rounded-2xl p-6 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
            <h2 className="font-display text-lg font-semibold">{t('randomAssign.animationStyle')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {animationOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAnimationChoice(type)}
                  className={cn(
                    uiChoiceCardClass,
                    'flex items-center gap-3 text-left',
                    animationChoice === type ? uiChoiceCardActiveClass : '',
                  )}
                >
                  {type !== 'mix' ? (
                    <AnimationTypeIcon type={type} />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent/15 text-lg font-bold text-app-accent">
                      +
                    </span>
                  )}
                  <p className="font-semibold text-app-text">{animationLabel(type, t)}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-center">
            <Button
              onClick={handleGoToPreview}
              disabled={workers.length === 0 || pendingProjects.length === 0}
              className="min-w-[240px] px-8 py-3 text-base"
            >
              {t('randomAssign.nextPreview')} →
            </Button>
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div className="mx-auto max-w-4xl space-y-8">
          <section className="rounded-3xl border border-app-accent/25 bg-gradient-to-br from-app-card to-app-card-soft p-8 shadow-lg dark:ring-1 dark:ring-metallic-green/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-app-text">
                  {t('randomAssign.distributionTitle')}
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                ↻ {t('randomAssign.regenerate')}
              </Button>
            </div>

            <div className="mt-6 rounded-2xl border border-app-border/60 bg-app-bg/50 p-4">
              <AssignDistributionChart data={distributionData} height={240} highlightMax />
            </div>

            <AssignWarnings
              unassigned={fairSummary.unassignedProjectCount}
              idleWorkers={fairSummary.idleWorkerCount}
              unassignedLabel={t('randomAssign.unassignedWarning').replace('{count}', String(fairSummary.unassignedProjectCount))}
              idleLabel={t('randomAssign.idleWorkersWarning').replace('{count}', String(fairSummary.idleWorkerCount))}
            />
          </section>

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => setPhase('setup')}>
              ← {t('randomAssign.backToSelect')}
            </Button>
            <Button onClick={handleStartAnimation} className="min-w-[240px] px-8 py-3 text-base">
              {t('randomAssign.startAnimation')} →
            </Button>
          </div>
        </div>
      )}

      {phase === 'running' && currentPair && (
        <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-2xl flex-col overflow-hidden lg:h-[calc(100dvh-4.5rem)]">
          <div className="mb-4 flex shrink-0 items-center gap-4">
            <span className="text-sm font-bold text-app-accent">{progressText}</span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-app-border/30">
              <div
                className="h-full rounded-full bg-app-accent transition-all duration-500"
                style={{ width: `${pairs.length ? ((currentIndex + 1) / pairs.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <AssignAnimation
              key={`${currentIndex}-${currentPair.projectId}`}
              type={currentAnimation}
              workerName={currentPair.workerName}
              projectLabel={currentPair.projectLabel}
              workerCandidates={workerCandidates}
              projectCandidates={projectCandidates}
              workerLabel={t('randomAssign.labelWorker')}
              projectLabelTitle={t('randomAssign.labelProject')}
              onComplete={handleAnimationComplete}
            />
          </div>

          {saving && (
            <p className="shrink-0 pt-2 text-center text-sm text-app-muted">{t('randomAssign.starting')}</p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <div className="rounded-3xl border border-app-accent/30 bg-app-accent/10 px-6 py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-accent text-2xl text-white">
              ✓
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-app-text">
              {t('randomAssign.complete')}
            </h2>
            <p className="mt-2 text-app-muted">{t('randomAssign.completeDesc')}</p>
          </div>

          <ResultsList title={t('randomAssign.results')} items={results} highlight />

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/admin/projects">
              <Button>{t('randomAssign.backToProjects')}</Button>
            </Link>
            <Button variant="outline" onClick={handleReset}>
              {t('randomAssign.start')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryStrip({
  workers,
  projects,
  willAssign,
  labels,
}: {
  workers: number;
  projects: number;
  willAssign: number;
  labels: { workers: string; projects: string; willAssign: string };
}) {
  const items = [
    { label: labels.workers, value: workers, accent: false },
    { label: labels.projects, value: projects, accent: false },
    { label: labels.willAssign, value: willAssign, accent: true },
  ];

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'rounded-2xl border px-5 py-4 shadow-sm',
            item.accent
              ? 'border-app-accent/40 bg-app-accent/10'
              : 'border-app-border bg-app-card dark:ring-1 dark:ring-metallic-green/10',
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-app-muted">{item.label}</p>
          <p className={cn('mt-1 font-display text-3xl font-bold', item.accent ? 'text-app-accent' : 'text-app-text')}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function AssignWarnings({
  unassigned,
  idleWorkers,
  unassignedLabel,
  idleLabel,
}: {
  unassigned: number;
  idleWorkers: number;
  unassignedLabel: string;
  idleLabel: string;
}) {
  if (unassigned === 0 && idleWorkers === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {unassigned > 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          {unassignedLabel}
        </p>
      )}
      {idleWorkers > 0 && (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-800 dark:text-sky-200">
          {idleLabel}
        </p>
      )}
    </div>
  );
}

function SelectionPanel({
  title,
  count,
  children,
  onSelectAll,
  onDeselectAll,
  selectAllLabel,
  deselectAllLabel,
  empty,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectAllLabel: string;
  deselectAllLabel: string;
  empty?: string;
}) {
  return (
    <section className="ui-glass-card rounded-2xl p-6 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-app-accent/15 px-2.5 py-0.5 text-xs font-bold text-app-accent">
              {count}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="ui-link-btn">
            {selectAllLabel}
          </button>
          <span className="text-app-muted">·</span>
          <button type="button" onClick={onDeselectAll} className="ui-link-btn text-app-muted hover:text-app-text">
            {deselectAllLabel}
          </button>
        </div>
      </div>
      {empty ? (
        <p className="text-sm text-app-muted">{empty}</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{children}</div>
      )}
    </section>
  );
}

function SelectRow({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub: string;
}) {
  return (
    <label className={cn(uiSelectRowClass, checked && uiSelectRowActiveClass)}>
      <input type="checkbox" checked={checked} onChange={onChange} className="ui-checkbox" />
      <div className="min-w-0">
        <p className="truncate font-medium text-app-text">{label}</p>
        {sub ? <p className="truncate text-sm text-app-muted">{sub}</p> : null}
      </div>
    </label>
  );
}

function ResultsList({
  title,
  items,
  highlight = false,
}: {
  title: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <section className="ui-glass-card rounded-2xl p-6 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <h3 className="mb-4 font-display text-lg font-semibold">{title}</h3>
      <ol className="space-y-2">
        {items.map((line, i) => (
          <li
            key={`${line}-${i}`}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium animate-random-pop',
              highlight ? 'bg-app-accent/15 text-app-text' : 'bg-app-bg text-app-text',
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent text-xs font-bold text-white">
              {i + 1}
            </span>
            {line}
          </li>
        ))}
      </ol>
    </section>
  );
}
