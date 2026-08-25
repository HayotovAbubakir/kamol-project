'use client';

import { useCallback, useEffect, useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { Button, ConfirmModal, Modal, uiInputClass, uiSelectClass } from '@/components/ui';
import { SkeletonTable } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/lib/auth';
import { cn, formatDate, formatDateTime, formatWeeklyRank, isReturnedProject } from '@/lib/utils';
import { WorkerGamificationPanel } from '@/components/WorkerGamificationPanel';
import type { CommentSentiment, CommentWithAuthor, RatingHistoryItem, WorkerProfile, WorkerProfileProject, WorkerSummary } from '@/types';

interface WorkerProfileModalProps {
  workerId: string | null;
  workers?: WorkerSummary[];
  onClose: () => void;
  onUpdated?: () => void;
  readOnly?: boolean;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-app-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-app-text">{value}</dd>
    </div>
  );
}

function ProjectDates({
  project,
  t,
}: {
  project: WorkerProfileProject;
  t: (key: string) => string;
}) {
  return (
    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
      <MetaItem label={t('workerProfile.orderDate')} value={formatDate(project.orderDate)} />
      {project.assignedAt && (
        <MetaItem label={t('workerProfile.assignedDate')} value={formatDate(project.assignedAt)} />
      )}
      {project.completedAt && (
        <MetaItem label={t('workerProfile.completedDate')} value={formatDate(project.completedAt)} />
      )}
    </dl>
  );
}

function CommentBlock({
  comment,
  t,
  onEdit,
}: {
  comment: CommentWithAuthor;
  t: (key: string) => string;
  onEdit: () => void;
}) {
  const displayDate = comment.updatedAt ?? comment.createdAt;
  const positive = comment.sentiment === 'positive';

  return (
    <div className="border-t border-app-border bg-app-bg/40 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(positive ? 'ui-badge-positive' : 'ui-badge-negative', 'text-xs')}>
              {positive ? `👍 ${t('rating.sentimentPositive')}` : `👎 ${t('rating.sentimentNegative')}`}
            </span>
            <span className="text-xs text-app-muted">
              @{comment.authorUsername} · {formatDateTime(displayDate)}
              {comment.updatedAt && ` (${t('workerProfile.edited')})`}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-app-text">{comment.text}</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={onEdit}>
          {t('rating.editComment')}
        </Button>
      </div>
    </div>
  );
}

function CommentEditor({
  project,
  existing,
  t,
  onSaved,
  onCancel,
}: {
  project: WorkerProfileProject;
  existing?: CommentWithAuthor;
  t: (key: string) => string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [sentiment, setSentiment] = useState<CommentSentiment | null>(existing?.sentiment ?? null);
  const [text, setText] = useState(existing?.text ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!sentiment || !text.trim() || saving) return;
    const payload = {
      projectId: project.id,
      text: text.trim(),
      sentiment,
    };
    setSaving(true);
    try {
      await apiFetch('/api/comments', {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved();
      showToast('success', t('toast.saved'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-app-border bg-app-bg/40 px-4 py-3">
      {!sentiment ? (
        <>
          <p className="mb-3 text-sm text-app-muted">{t('rating.commentStepHint')}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSentiment('positive')}
              className="ui-sentiment-btn ui-sentiment-positive flex-1"
            >
              <span className="text-2xl">👍</span>
              <p className="ui-sentiment-label-positive text-sm">{t('rating.commentPositive')}</p>
            </button>
            <button
              type="button"
              onClick={() => setSentiment('negative')}
              className="ui-sentiment-btn ui-sentiment-negative flex-1"
            >
              <span className="text-2xl">👎</span>
              <p className="ui-sentiment-label-negative text-sm">{t('rating.commentNegative')}</p>
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className={cn(sentiment === 'positive' ? 'ui-badge-positive' : 'ui-badge-negative', 'text-xs')}>
              {sentiment === 'positive'
                ? `👍 ${t('rating.sentimentPositive')}`
                : `👎 ${t('rating.sentimentNegative')}`}
            </span>
            <button type="button" onClick={() => setSentiment(null)} className="ui-link-btn text-xs">
              {t('rating.changeSentiment')}
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('rating.commentPlaceholder')}
            rows={3}
            className={cn(uiInputClass, 'resize-none')}
            autoFocus
          />
          <div className="mt-3 flex flex-col gap-2 xs:flex-row">
            <Button size="sm" className="w-full xs:w-auto" onClick={handleSave} disabled={!text.trim() || saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
            <Button size="sm" variant="outline" className="w-full xs:w-auto" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function InProgressProjectCard({
  project,
  currentWorkerId,
  workers,
  t,
  onRefresh,
}: {
  project: WorkerProfileProject;
  currentWorkerId: string;
  workers: WorkerSummary[];
  t: (key: string) => string;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const otherWorkers = workers.filter((w) => w.id !== currentWorkerId);

  async function handleReassign() {
    if (!selectedWorker || busy) return;
    const workerId = selectedWorker;
    setBusy(true);
    try {
      await apiFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({ projectId: project.id, workerId }),
      });
      setReassignOpen(false);
      setSelectedWorker('');
      onRefresh();
      showToast('success', t('toast.assigned'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({ mode: 'unassign', projectId: project.id }),
      });
      setUnassignOpen(false);
      onRefresh();
      showToast('success', t('toast.unassigned'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-app-border bg-app-card">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h5 className="min-w-0 break-words font-medium text-app-text [overflow-wrap:anywhere]">
              {project.address}
            </h5>
            {isReturnedProject(project) && (
              <span className="ui-project-status ui-project-status-returned shrink-0 text-[10px]">
                {t('status.returned')}
              </span>
            )}
          </div>
          <p className="mt-0.5 break-words text-sm text-app-muted">{project.clientName}</p>
          {isReturnedProject(project) && project.notes && (
            <p className="mt-2 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text">
              {project.notes}
            </p>
          )}
          <ProjectDates project={project} t={t} />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {otherWorkers.length > 0 && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setReassignOpen(true)}>
                {t('workerProfile.reassign')}
              </Button>
            )}
            <Button size="sm" variant="danger" className="w-full sm:w-auto" onClick={() => setUnassignOpen(true)}>
              {t('workerProfile.unassign')}
            </Button>
          </div>
        </div>
      </article>

      <Modal
        open={reassignOpen}
        title={t('workerProfile.reassign')}
        onClose={() => {
          setReassignOpen(false);
          setSelectedWorker('');
        }}
        size="sm"
      >
        <select
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          className={uiSelectClass}
        >
          <option value="">{t('workerProfile.reassignTo')}</option>
          {otherWorkers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} (@{w.username})
            </option>
          ))}
        </select>
        <div className="mt-4 flex flex-col gap-2 xs:flex-row">
          <Button className="w-full flex-1" onClick={handleReassign} disabled={!selectedWorker || busy}>
            {busy ? t('common.assigning') : t('common.assign')}
          </Button>
          <Button
            variant="outline"
            className="w-full flex-1"
            onClick={() => {
              setReassignOpen(false);
              setSelectedWorker('');
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={unassignOpen}
        title={t('workerProfile.unassign')}
        message={`${project.clientName} — ${project.address}\n${t('workerProfile.confirmUnassign')}`}
        confirmLabel={t('workerProfile.unassign')}
        confirmingLabel={t('common.unassigning')}
        variant="danger"
        onConfirm={handleUnassign}
        onCancel={() => setUnassignOpen(false)}
      />
    </>
  );
}

function ProjectCard({
  project,
  showComments,
  t,
  onRefresh,
}: {
  project: WorkerProfileProject;
  showComments?: boolean;
  t: (key: string) => string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const comment = project.comments[0];

  return (
    <article className="overflow-hidden rounded-xl border border-app-border bg-app-card">
      <div className="p-4">
        <h5 className="min-w-0 break-words font-medium text-app-text [overflow-wrap:anywhere]">
          {project.address}
        </h5>
        <p className="mt-0.5 break-words text-sm text-app-muted">{project.clientName}</p>
        <ProjectDates project={project} t={t} />
      </div>

      {showComments && !editing && comment && (
        <CommentBlock comment={comment} t={t} onEdit={() => setEditing(true)} />
      )}

      {showComments && !editing && !comment && (
        <div className="border-t border-app-border bg-app-bg/40 px-4 py-3">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t('rating.addComment')}
          </Button>
        </div>
      )}

      {showComments && editing && (
        <CommentEditor
          project={project}
          existing={comment}
          t={t}
          onSaved={() => {
            setEditing(false);
            onRefresh();
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </article>
  );
}

function ProjectSection({
  title,
  projects,
  showComments,
  showAssignActions,
  currentWorkerId,
  workers,
  t,
  onRefresh,
}: {
  title: string;
  projects: WorkerProfileProject[];
  showComments?: boolean;
  showAssignActions?: boolean;
  currentWorkerId?: string;
  workers?: WorkerSummary[];
  t: (key: string) => string;
  onRefresh: () => void;
}) {
  if (projects.length === 0) return null;

  return (
    <section className="mt-6 min-w-0">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h4 className="min-w-0 text-sm font-semibold text-app-text">{title}</h4>
        <span className="rounded-full bg-app-bg px-2.5 py-0.5 text-xs font-medium text-app-muted">
          {projects.length}
        </span>
      </div>
      <div className="space-y-3">
        {projects.map((project) =>
          showAssignActions && currentWorkerId && workers ? (
            <InProgressProjectCard
              key={project.id}
              project={project}
              currentWorkerId={currentWorkerId}
              workers={workers}
              t={t}
              onRefresh={onRefresh}
            />
          ) : (
            <ProjectCard
              key={project.id}
              project={project}
              showComments={showComments}
              t={t}
              onRefresh={onRefresh}
            />
          ),
        )}
      </div>
    </section>
  );
}

function RatingHistoryList({
  items,
  t,
}: {
  items: RatingHistoryItem[];
  t: (key: string) => string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-app-border px-4 py-6 text-center text-sm text-app-muted">
        {t('leaderboard.historyEmpty')}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const positive = item.points > 0;
        return (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-app-border bg-app-bg/40 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-app-text">{item.projectLabel}</p>
              <p className="mt-0.5 text-xs text-app-muted">
                {t(`leaderboard.historyType.${item.type}`)}
                {item.daysToComplete != null
                  ? ` · ${item.daysToComplete} ${t('common.days')}`
                  : ''}
                {` · ${formatDateTime(item.createdAt)}`}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 text-sm font-semibold tabular-nums',
                positive ? 'text-green-600 dark:text-green-400' : item.points < 0 ? 'text-deadline-red' : 'text-app-muted',
              )}
            >
              {item.points > 0 ? `+${item.points}` : item.points} {t('rating.pointsUnit')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function WorkerProfileModal({
  workerId,
  workers = [],
  onClose,
  onUpdated,
  readOnly = false,
}: WorkerProfileModalProps) {
  const { t, locale } = useAppSettings();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!workerId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ profile: WorkerProfile }>(`/api/workers/profile?workerId=${workerId}`);
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [workerId, t]);

  useEffect(() => {
    if (workerId) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [workerId, loadProfile]);

  function handleRefresh() {
    loadProfile();
    onUpdated?.();
  }

  const hasProjects =
    profile &&
    (profile.inProgress.length > 0 ||
      profile.completed.length > 0 ||
      profile.returned.length > 0);

  return (
    <Modal
      open={!!workerId}
      title={profile ? profile.worker.name : t('workerProfile.title')}
      description={profile ? `@${profile.worker.username}` : undefined}
      onClose={onClose}
      size="full"
    >
      {loading && <SkeletonTable rows={3} />}

      {error && !loading && (
        <p className="rounded-xl bg-deadline-red/10 px-4 py-3 text-sm text-deadline-red">{error}</p>
      )}

      {profile && !loading && (
        <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 pb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-app-border bg-app-bg/50 p-4">
              <p className="text-xs font-medium text-app-muted">{t('workerProfile.rating')}</p>
              <div className="mt-2">
                <StarRating rating={profile.rating.rating} size="md" />
              </div>
            </div>
            <div className="rounded-xl border border-app-border bg-app-bg/50 p-4">
              <p className="text-xs font-medium text-app-muted">{t('rating.weeklyRank')}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-app-text">
                {profile.weeklyRank != null ? formatWeeklyRank(profile.weeklyRank, locale) : '—'}
              </p>
            </div>
          </div>

          <WorkerGamificationPanel
            gamification={profile.gamification}
            workerName={profile.worker.name}
            workerId={profile.worker.id}
          />

          {profile.worker.telegramId && (
            <div className="rounded-xl border border-app-border bg-app-bg/50 px-4 py-3">
              <p className="text-xs font-medium text-app-muted">{t('workerProfile.telegram')}</p>
              <p className="mt-0.5 text-sm font-medium text-app-text">{profile.worker.telegramId}</p>
            </div>
          )}

          <ProjectSection
            title={t('workerProfile.inProgressSection')}
            projects={profile.inProgress}
            showAssignActions={!readOnly}
            currentWorkerId={workerId ?? undefined}
            workers={workers}
            t={t}
            onRefresh={handleRefresh}
          />
          <ProjectSection
            title={t('workerProfile.completedSection')}
            projects={profile.completed}
            showComments={!readOnly}
            t={t}
            onRefresh={handleRefresh}
          />
          <ProjectSection
            title={t('workerProfile.returnedSection')}
            projects={profile.returned}
            showComments={!readOnly}
            t={t}
            onRefresh={handleRefresh}
          />

          <section className="mt-6 min-w-0">
            <h4 className="mb-3 text-sm font-semibold text-app-text">{t('leaderboard.historyTitle')}</h4>
            <RatingHistoryList items={profile.ratingHistory ?? []} t={t} />
          </section>

          {!hasProjects && (
            <p className="rounded-xl border border-dashed border-app-border px-4 py-8 text-center text-sm text-app-muted">
              {t('workerProfile.noProjects')}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
