'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import type { Project, ProjectComment, ProjectStatus, Payment } from '@/types';
import { useAppSettings } from '@/context/AppSettingsContext';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { OrderDateDisplay } from '@/components/OrderDateDisplay';
import {
  IconCalendar,
  IconCheck,
  IconNote,
  IconPhone,
  IconUser,
} from '@/components/icons/ProjectIcons';
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatPhone,
  formatPrice,
  getDeadlineUrgency,
  isReturnedCard,
  isTerminalStatus,
  isPendingReviewStatus,
  cn,
} from '@/lib/utils';
import { getRemainingPrice, isFullyPaid } from '@/lib/payments';

interface ProjectCardProps {
  project: Project;
  workerName?: string;
  variant?: 'grid' | 'wide' | 'worker';
  onAssign?: (projectId: string) => void;
  onStatusChange?: (projectId: string, status: string) => void;
  onDelete?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
  onReturn?: (projectId: string) => void;
  onApprove?: (projectId: string) => void;
  onReassign?: (projectId: string) => void;
  onUnassign?: (projectId: string) => void;
  onComment?: (projectId: string) => void;
  onNotes?: (projectId: string) => void;
  onSaveNotes?: (projectId: string, text: string) => void | Promise<void>;
  notesEditing?: boolean;
  notesDraft?: string;
  onNotesDraftChange?: (text: string) => void;
  notesSaving?: boolean;
  workerReplyMode?: boolean;
  comments?: ProjectComment[];
  payments?: Payment[];
  showActions?: boolean;
  isAdmin?: boolean;
  onAddPayment?: (projectId: string) => void;
  onResubmit?: (projectId: string) => void;
  rejectionCount?: number;
  returnReasonEditing?: boolean;
  returnReasonDraft?: string;
  onReturnReasonDraftChange?: (text: string) => void;
  onSaveReturnReason?: (projectId: string) => void | Promise<void>;
  onStartReturnReasonEdit?: (projectId: string) => void;
  onCancelReturnReasonEdit?: () => void;
  returnReasonSaving?: boolean;
}

function ReturnedAlertStrip({
  title,
  hint,
  rejectionCount,
  rejectionLabel,
  compact = false,
}: {
  title: string;
  hint?: string;
  rejectionCount?: number;
  rejectionLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'relative z-[2] flex items-center gap-2.5 border-b border-red-700/50 bg-gradient-to-r from-red-600 to-red-500 text-white',
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
      )}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block font-semibold">{title}</span>
          {rejectionCount != null && rejectionCount > 0 && rejectionLabel && (
            <span className="whitespace-nowrap rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
              {rejectionCount}-{rejectionLabel}
            </span>
          )}
        </span>
        {hint ? (
          <span className={cn('block text-white/90', compact ? 'text-[11px] line-clamp-1' : 'mt-0.5 text-xs font-medium')}>
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
  nowrap,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  nowrap?: boolean;
  className?: string;
}) {
  return (
      <div className={cn('ui-project-meta-item', className)}>
      <span className="ui-project-meta-icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="ui-project-meta-label">{label}</p>
        <p className={cn('ui-project-meta-value', nowrap && 'tabular-nums')}>{value}</p>
      </div>
    </div>
  );
}

const statusClass: Partial<Record<ProjectStatus, string>> = {
  pending: 'ui-project-status-pending',
  in_progress: 'ui-project-status-progress',
  pending_review: 'ui-project-status-review',
  completed: 'ui-project-status-completed',
  returned: 'ui-project-status-returned',
  rejected: 'ui-project-status-returned',
};

function ProjectPriceAmount({
  project,
  t,
}: {
  project: Project;
  t: (key: string) => string;
}) {
  if (project.price == null) return null;

  return (
    <div className="shrink-0 text-right">
      <p className="text-xs text-app-muted">{t('admin.price')}</p>
      <p className="font-display text-lg font-bold tabular-nums text-app-accent sm:text-xl">
        {formatPrice(project.price)}
        <span className="ml-1 text-xs font-medium text-app-muted">so&apos;m</span>
      </p>
    </div>
  );
}

function ProjectPriceRemaining({
  project,
  payments = [],
  t,
  isAdmin = false,
  onAddPayment,
}: {
  project: Project;
  payments?: Payment[];
  t: (key: string) => string;
  isAdmin?: boolean;
  onAddPayment?: (projectId: string) => void;
}) {
  if (project.price == null) return null;

  const remaining = getRemainingPrice(project, payments);
  const fullyPaid = isFullyPaid(project, payments);

  if (remaining == null && !fullyPaid) return null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {remaining != null && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-xs font-semibold text-app-text sm:text-sm">
            {t('project.remaining')}: {formatPrice(remaining)} so&apos;m
          </p>
          {isAdmin && onAddPayment && !fullyPaid && (
            <button
              type="button"
              onClick={() => onAddPayment(project.id)}
              className="ui-btn-outline ui-btn-sm"
            >
              {t('project.addPayment')}
            </button>
          )}
        </div>
      )}
      {fullyPaid && (
        <span className="inline-flex rounded-full border border-green-500/35 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-300">
          {t('project.fullyPaid')}
        </span>
      )}
    </div>
  );
}

function ProjectActions({
  project,
  showActions,
  isAdmin,
  t,
  onAssign,
  onStatusChange,
  onNotes,
  onReturn,
  onApprove,
  onReassign,
  onUnassign,
  onComment,
  onEdit,
  onDelete,
  onResubmit,
}: {
  project: Project;
  showActions?: boolean;
  isAdmin?: boolean;
  t: (key: string) => string;
  onAssign?: (projectId: string) => void;
  onStatusChange?: (projectId: string, status: string) => void;
  onNotes?: (projectId: string) => void;
  onReturn?: (projectId: string) => void;
  onApprove?: (projectId: string) => void;
  onReassign?: (projectId: string) => void;
  onUnassign?: (projectId: string) => void;
  onComment?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onResubmit?: (projectId: string) => void;
}) {
  if (!showActions) return null;

  const isReturnedActive = isReturnedCard(project);

  return (
    <div className="ui-project-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
      {project.status === 'pending' && onAssign && (
        <button type="button" onClick={() => onAssign(project.id)} className="ui-btn-primary ui-btn-sm">
          {t('project.assignToWorker')}
        </button>
      )}
      {project.status === 'in_progress' && onStatusChange && (
        <button
          type="button"
          onClick={() => onStatusChange(project.id, 'completed')}
          className="ui-btn-primary ui-btn-sm"
        >
          {t('project.complete')}
        </button>
      )}
      {!isAdmin && onNotes && project.returnedAt && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNotes(project.id);
          }}
          className="ui-btn-outline ui-btn-sm"
        >
          {t('project.note')}
        </button>
      )}
      {isAdmin && project.status === 'in_progress' && onReassign && (
        <button type="button" onClick={() => onReassign(project.id)} className="ui-btn-outline ui-btn-sm">
          {t('workerProfile.reassign')}
        </button>
      )}
      {isAdmin && project.status === 'in_progress' && onUnassign && (
        <button
          type="button"
          onClick={() => onUnassign(project.id)}
          className="ui-btn-outline ui-btn-sm border-orange-500/35 text-orange-600 hover:border-orange-500 hover:bg-orange-500/10 dark:text-orange-400"
        >
          {t('workerProfile.unassign')}
        </button>
      )}
      {isAdmin && onApprove && project.status === 'pending_review' && (
        <button
          type="button"
          onClick={() => onApprove(project.id)}
          className="ui-btn-primary ui-btn-sm"
        >
          {t('project.approveComplete')}
        </button>
      )}
      {isAdmin && onReturn && project.status === 'completed' && (
        <button
          type="button"
          onClick={() => onReturn(project.id)}
          className="ui-btn-outline ui-btn-sm border-orange-500/35 text-orange-600 hover:border-orange-500 hover:bg-orange-500/10 dark:text-orange-400"
        >
          {t('rating.returnProject')}
        </button>
      )}
      {isAdmin && onResubmit && isReturnedActive && (
        <button
          type="button"
          onClick={() => onResubmit(project.id)}
          className="ui-btn-primary ui-btn-sm"
        >
          {t('project.resubmit')}
        </button>
      )}
      {isAdmin && onComment && (project.status === 'completed' || project.status === 'pending_review' || project.status === 'returned') && (
        <button type="button" onClick={() => onComment(project.id)} className="ui-btn-outline ui-btn-sm">
          {t('rating.leaveComment')}
        </button>
      )}
      {isAdmin && onEdit && (
        <button type="button" onClick={() => onEdit(project.id)} className="ui-btn-outline ui-btn-sm">
          {t('common.edit')}
        </button>
      )}
      {isAdmin && onDelete && (
        <button type="button" onClick={() => onDelete(project.id)} className="ui-btn-danger-soft">
          {t('common.delete')}
        </button>
      )}
    </div>
  );
}

function ProjectMetaGrid({
  project,
  workerName,
  locale,
  t,
  isReturned,
}: {
  project: Project;
  workerName?: string;
  locale: string;
  t: (key: string) => string;
  isReturned: boolean;
}) {
  const extraItem = isReturned && project.returnedAt
    ? (
        <MetaItem
          icon={<IconCalendar className="text-red-500" />}
          label={t('project.returnedAt')}
          value={formatDateTime(project.returnedAt)}
        />
      )
    : project.assignedAt
      ? (
          <MetaItem
            icon={<IconCalendar />}
            label={t('project.assignedAt')}
            value={formatDateTime(project.assignedAt)}
          />
        )
      : project.completedAt
        ? (
            <MetaItem
              icon={<IconCheck />}
              label={t('project.completedAt')}
              value={formatDate(project.completedAt, locale)}
            />
          )
        : (
            <MetaItem
              icon={<IconCalendar />}
              label={t('project.assignedAt')}
              value="—"
            />
          );

  return (
    <div className="ui-project-meta-grid">
      <MetaItem
        icon={<IconPhone />}
        label={t('admin.phone')}
        value={project.phone ? formatPhone(String(project.phone)) : '—'}
        nowrap
      />
      <MetaItem
        icon={<IconCalendar />}
        label={t('project.order')}
        value={
          <OrderDateDisplay
            orderDate={project.orderDate}
            daysLabel={t('common.days')}
            status={project.status}
            completedAt={project.completedAt}
          />
        }
      />
      {extraItem}
      <MetaItem
        icon={<IconUser />}
        label={t('project.assignedWorker')}
        value={workerName || '—'}
      />
    </div>
  );
}

function ReturnReasonBlock({
  project,
  t,
  isAdmin,
  returnReasonEditing,
  returnReasonDraft,
  onReturnReasonDraftChange,
  onSaveReturnReason,
  onStartReturnReasonEdit,
  onCancelReturnReasonEdit,
  returnReasonSaving,
}: {
  project: Project;
  t: (key: string) => string;
  isAdmin?: boolean;
  returnReasonEditing?: boolean;
  returnReasonDraft?: string;
  onReturnReasonDraftChange?: (text: string) => void;
  onSaveReturnReason?: (projectId: string) => void | Promise<void>;
  onStartReturnReasonEdit?: (projectId: string) => void;
  onCancelReturnReasonEdit?: () => void;
  returnReasonSaving?: boolean;
}) {
  const reason = project.notes?.trim() || '';
  if (!isAdmin && !reason) return null;
  if (isAdmin && !reason && !returnReasonEditing) return null;

  return (
    <div className="ui-project-return-reason">
      {isAdmin && returnReasonEditing ? (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
            {t('project.returnedReason')}
          </label>
          <textarea
            value={returnReasonDraft}
            onChange={(e) => onReturnReasonDraftChange?.(e.target.value)}
            rows={3}
            className="ui-input w-full resize-none text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={returnReasonSaving || !returnReasonDraft?.trim()}
              onClick={() => onSaveReturnReason?.(project.id)}
              className="ui-btn-primary ui-btn-sm"
            >
              {returnReasonSaving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              disabled={returnReasonSaving}
              onClick={onCancelReturnReasonEdit}
              className="ui-btn-outline ui-btn-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
            {t('project.returnedReason')}
          </p>
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 rounded-xl border border-red-300/45 bg-red-50/90 px-3 py-2.5 text-sm font-medium leading-relaxed text-red-900 dark:border-red-500/35 dark:bg-red-950/70 dark:text-red-100">
              {reason}
            </p>
            {isAdmin && onStartReturnReasonEdit && (
              <button
                type="button"
                onClick={() => onStartReturnReasonEdit(project.id)}
                className="ui-link-btn shrink-0 text-[11px]"
              >
                {t('common.edit')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectExtra({
  project,
  comments,
  t,
  isReturned,
  hideReturnReason = false,
  compact = false,
  suppressCommentText,
}: {
  project: Project;
  comments: ProjectComment[];
  t: (key: string) => string;
  isReturned: boolean;
  hideReturnReason?: boolean;
  compact?: boolean;
  suppressCommentText?: string | null;
}) {
  const notesText = project.notes?.trim() || null;
  const returnReason = !hideReturnReason && isReturned && notesText ? notesText : null;
  const workerNote = project.description?.trim() || null;
  const hiddenCommentText = (suppressCommentText ?? returnReason ?? notesText)?.trim() || null;
  const displayComments = comments.filter((c) => {
    const text = c.text.trim();
    return !hiddenCommentText || text !== hiddenCommentText;
  });
  const adminNotes =
    !hideReturnReason && !returnReason && !workerNote && notesText ? notesText : null;
  const hasExtra = workerNote || returnReason || adminNotes || displayComments.length > 0;
  if (!hasExtra) return null;

  return (
    <div
      className={cn(
        'ui-project-extra space-y-3',
        compact ? 'pt-0' : 'border-t border-app-border px-4 py-3 md:px-5',
      )}
    >
      {(workerNote || returnReason || adminNotes) && (
        <div className="space-y-2">
          {returnReason && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                {t('project.returnedReason')}
              </p>
              <p className="rounded-xl border border-red-300/45 bg-red-50/90 px-3 py-2.5 text-sm font-medium leading-relaxed text-red-900 backdrop-blur-xl dark:border-red-500/35 dark:bg-red-950/70 dark:text-red-100">
                {returnReason}
              </p>
            </div>
          )}
          {workerNote && workerNote !== hiddenCommentText && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-app-muted">
                {t('project.note')}
              </p>
              <p className="flex items-start gap-2 rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text">
                <IconNote className="mt-0.5 shrink-0 text-app-accent" />
                <span>{workerNote}</span>
              </p>
            </div>
          )}
          {!returnReason && !workerNote && adminNotes && (
            <p className="flex items-start gap-2 rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text">
              <IconNote className="mt-0.5 shrink-0 text-app-accent" />
              <span>{adminNotes}</span>
            </p>
          )}
        </div>
      )}

      {displayComments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">{t('rating.comments')}</p>
          <div className="space-y-2">
            {displayComments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'rounded-xl border px-3.5 py-3',
                  c.sentiment === 'positive'
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5',
                )}
              >
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    c.sentiment === 'positive'
                      ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                      : 'bg-red-500/15 text-red-700 dark:text-red-300',
                  )}
                >
                  {c.sentiment === 'positive'
                    ? t('rating.sentimentPositive')
                    : t('rating.sentimentNegative')}
                </span>
                <p className="mt-2 text-sm leading-relaxed text-app-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCardBase({
  className,
  banner,
  badges,
  priceAmount,
  title,
  priceRemaining,
  client,
  meta,
  returnReason,
  extra,
  actions,
}: {
  className: string;
  banner?: React.ReactNode;
  badges: React.ReactNode;
  priceAmount: React.ReactNode;
  title: React.ReactNode;
  priceRemaining: React.ReactNode;
  client?: React.ReactNode;
  meta: React.ReactNode;
  returnReason?: React.ReactNode;
  extra?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <article className={className}>
      {banner}
      <div className="ui-project-card-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{badges}</div>
          <div className="shrink-0">{priceAmount}</div>
        </div>
        <div className="mt-2 min-w-0">{title}</div>
        {client ? <div className="mt-1 min-w-0">{client}</div> : null}
        {priceRemaining ? (
          <div className="mt-2 flex justify-end">{priceRemaining}</div>
        ) : null}
      </div>
      {meta}
      {returnReason}
      <div className="ui-project-card-grow" />
      {actions}
      {extra}
    </article>
  );
}

function ProjectCardImpl({
  project,
  workerName,
  variant = 'grid',
  onAssign,
  onStatusChange,
  onDelete,
  onEdit,
  onReturn,
  onApprove,
  onReassign,
  onUnassign,
  onComment,
  onNotes,
  onSaveNotes,
  notesEditing = false,
  notesDraft = '',
  onNotesDraftChange,
  notesSaving = false,
  comments = [],
  payments = [],
  showActions = false,
  isAdmin = false,
  onAddPayment,
  onResubmit,
  rejectionCount = 0,
  returnReasonEditing = false,
  returnReasonDraft = '',
  onReturnReasonDraftChange,
  onSaveReturnReason,
  onStartReturnReasonEdit,
  onCancelReturnReasonEdit,
  returnReasonSaving = false,
  workerReplyMode = false,
}: ProjectCardProps) {
  const { t, locale } = useAppSettings();
  const pathname = usePathname();
  const urgency = getDeadlineUrgency(project.orderDate, project.status);
  const isReturned = isReturnedCard(project);
  const isTerminal = isTerminalStatus(project.status) || isPendingReviewStatus(project.status);
  const statusLabel = isReturned
    ? t('status.returned')
    : !isAdmin && project.status === 'pending_review'
      ? t('status.completed')
      : t(`status.${project.status}` as 'status.pending');
  const addressTitle = formatAddress(project) || project.title || project.clientName;
  const clientName = project.clientName || project.title;
  const isWide = variant === 'wide';
  const isWorker = variant === 'worker' || (pathname?.startsWith('/worker') ?? false);
  const cardClassName = cn(
    'ui-project-card',
    isWorker && 'ui-project-card-worker',
    isReturned &&
      (isWorker
        ? 'ui-project-card-returned'
        : 'relative overflow-hidden border-2 border-red-500/75 bg-gradient-to-br from-red-50/95 via-white/80 to-white/70 shadow-[0_10px_28px_rgba(239,68,68,0.14)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-[1] before:w-1 before:bg-gradient-to-b before:from-red-500 before:to-red-700 dark:border-red-500/65 dark:from-red-950/80 dark:via-[#141414]/75 dark:to-[#141414]/70 dark:shadow-[0_10px_32px_rgba(239,68,68,0.18)]'),
    isWide && 'ui-project-card-wide',
  );

  const displayStatus: ProjectStatus =
    !isAdmin && project.status === 'pending_review' ? 'completed' : project.status;
  const statusBadgeClass = cn(
    'ui-project-status',
    isReturned
      ? 'border-red-500/45 bg-red-500/15 text-red-700 dark:border-red-400/45 dark:bg-red-500/20 dark:text-red-300'
      : statusClass[displayStatus] ?? 'ui-project-status-progress',
  );

  const actionProps = {
    project,
    showActions,
    isAdmin,
    t,
    onAssign,
    onStatusChange,
    onNotes,
    onReturn,
    onApprove,
    onReassign,
    onUnassign,
    onComment,
    onEdit,
    onDelete,
    onResubmit,
  };

  if (isWorker) {
    const returnReason = isReturned && project.notes?.trim() ? project.notes.trim() : null;

    return (
      <article className={cardClassName}>
        {isReturned && (
          <div className="ui-project-worker-returned-strip" role="alert">
            <span className="ui-project-worker-returned-strip-icon" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('project.returnedAlert')}</span>
              <span className="mt-0.5 block text-xs text-white/90">
                {returnReason
                  ? `${t('project.returnedReason')}: ${returnReason}`
                  : t('project.returnedAlertHint')}
              </span>
            </span>
          </div>
        )}

        <div className={cn('ui-project-worker-body', isReturned && 'ui-project-worker-body-returned')}>
          <div>
            {!isReturned && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={statusBadgeClass}>{statusLabel}</span>
                {!isTerminal && <DeadlineBadge urgency={urgency} />}
              </div>
            )}
            <h3 className="ui-project-worker-name">{addressTitle}</h3>
            {clientName && (
              <p className="ui-project-worker-address">
                <IconUser className="mt-0.5 shrink-0 text-app-accent" />
                <span>{clientName}</span>
              </p>
            )}
          </div>

          <div className={cn('ui-project-worker-meta', isReturned && 'ui-project-worker-meta-returned')}>
            <div className="ui-project-worker-meta-row">
              <span className="ui-project-worker-meta-icon">
                <IconCalendar className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="ui-project-worker-meta-label">{t('project.order')}</p>
                <p className="ui-project-worker-meta-value">
                  <OrderDateDisplay
                    orderDate={project.orderDate}
                    daysLabel={t('common.days')}
                    status={project.status}
                    completedAt={project.completedAt}
                  />
                </p>
              </div>
            </div>
            {project.returnedAt && (
              <div className="ui-project-worker-meta-row mt-3 border-t border-red-500/25 pt-3">
                <span className="ui-project-worker-meta-icon text-red-500">
                  <IconCalendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="ui-project-worker-meta-label">{t('project.returnedAt')}</p>
                  <p className="ui-project-worker-meta-value">{formatDateTime(project.returnedAt)}</p>
                </div>
              </div>
            )}
            {project.completedAt && (
              <div className="ui-project-worker-meta-row mt-3 border-t border-app-border/60 pt-3">
                <span className="ui-project-worker-meta-icon">
                  <IconCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="ui-project-worker-meta-label">{t('project.completedAt')}</p>
                  <p className="ui-project-worker-meta-value">{formatDate(project.completedAt, locale)}</p>
                </div>
              </div>
            )}
          </div>

          <ProjectExtra
            project={project}
            comments={comments}
            t={t}
            isReturned={isReturned}
            hideReturnReason
            suppressCommentText={returnReason}
            compact
          />

          {notesEditing && !workerReplyMode && (
            <div className="rounded-xl border border-app-accent/25 bg-app-bg/80 p-3 dark:bg-black/20">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-app-muted">
                {workerReplyMode ? t('worker.replyLabel') : t('project.note')}
              </label>
              <textarea
                value={notesDraft}
                onChange={(e) => onNotesDraftChange?.(e.target.value)}
                rows={4}
                className="ui-input w-full resize-none"
                placeholder={
                  workerReplyMode ? t('worker.replyPlaceholder') : t('project.notePlaceholder')
                }
                autoFocus
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={notesSaving || !notesDraft.trim()}
                  onClick={() => onSaveNotes?.(project.id, notesDraft)}
                  className="ui-btn-primary ui-btn-sm"
                >
                  {notesSaving
                    ? (workerReplyMode ? t('common.submitting') : t('common.saving'))
                    : workerReplyMode
                      ? t('worker.replySubmit')
                      : t('common.save')}
                </button>
                <button
                  type="button"
                  disabled={notesSaving}
                  onClick={() => onNotes?.(project.id)}
                  className="ui-btn-outline ui-btn-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        <ProjectActions {...actionProps} />
      </article>
    );
  }

  return (
    <ProjectCardBase
      className={cardClassName}
      banner={
        isReturned ? (
          <ReturnedAlertStrip
            compact={isWide}
            title={t('project.returnedAlert')}
            hint={isWide ? undefined : t('project.returnedAlertHint')}
            rejectionCount={isWide ? rejectionCount : undefined}
            rejectionLabel={isWide ? t('project.returnedTimes') : undefined}
          />
        ) : null
      }
      badges={
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn(statusBadgeClass, 'shrink-0')}>{statusLabel}</span>
          {!isTerminal && !isReturned && (
            <DeadlineBadge urgency={urgency} className="shrink-0" />
          )}
        </div>
      }
      priceAmount={<ProjectPriceAmount project={project} t={t} />}
      title={
        <h3 className="min-w-0 font-display text-lg font-bold leading-tight text-app-text sm:text-xl [hyphens:none] [overflow-wrap:anywhere] [word-break:normal]">
          {addressTitle}
        </h3>
      }
      priceRemaining={
        <ProjectPriceRemaining
          project={project}
          payments={payments}
          t={t}
          isAdmin={isAdmin}
          onAddPayment={onAddPayment}
        />
      }
      client={
        clientName ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-app-muted">
            <IconUser className="h-3.5 w-3.5 shrink-0 text-app-accent" />
            <span className="truncate">{clientName}</span>
          </p>
        ) : null
      }
      meta={
        <ProjectMetaGrid
          project={project}
          workerName={workerName}
          locale={locale}
          t={t}
          isReturned={isReturned}
        />
      }
      returnReason={
        isReturned ? (
          <ReturnReasonBlock
            project={project}
            t={t}
            isAdmin={isAdmin}
            returnReasonEditing={returnReasonEditing}
            returnReasonDraft={returnReasonDraft}
            onReturnReasonDraftChange={onReturnReasonDraftChange}
            onSaveReturnReason={onSaveReturnReason}
            onStartReturnReasonEdit={onStartReturnReasonEdit}
            onCancelReturnReasonEdit={onCancelReturnReasonEdit}
            returnReasonSaving={returnReasonSaving}
          />
        ) : null
      }
      actions={<ProjectActions {...actionProps} />}
      extra={
        <ProjectExtra
          project={project}
          comments={comments}
          t={t}
          isReturned={isReturned}
          hideReturnReason
        />
      }
    />
  );
}

export const ProjectCard = memo(ProjectCardImpl);
