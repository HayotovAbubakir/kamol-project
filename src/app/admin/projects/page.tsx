'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { PaymentHistoryList } from '@/components/PaymentHistoryList';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { CompletedDateFilter } from '@/components/CompletedDateFilter';
import { ProjectTabIcon } from '@/components/icons/ProjectTabIcon';
import { Button, Input, Modal, NumberInput, ConfirmModal, uiFieldLabelClass, uiInputClass, uiInputGroupClass, uiSelectClass, uiTogglePanelClass, uiTogglePanelActiveClass } from '@/components/ui';
import type { CommentSentiment } from '@/types';
import { SkeletonPage } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { apiFetch } from '@/lib/auth';
import { cn, extractUzbekMobileDigits, filterProjectsBySearch, formatPhoneInput, formatPrice, joinProjectPhones, parseNumberInput, formatNumberInput, splitProjectPhones } from '@/lib/utils';
import { getRemainingPrice, validatePaymentAmount } from '@/lib/payments';
import {
  filterProjectsByOrderDate,
  formatCompletedPeriodLabel,
  getCompletedDateRange,
  type CompletedDateSelection,
} from '@/lib/completedDateFilter';

function formatPhoneField(value: string): string {
  const digits = extractUzbekMobileDigits(value) ?? value.replace(/\D/g, '').slice(0, 9);
  return formatPhoneInput(digits);
}

const EMPTY_NEW_PROJECT = {
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  phone2: '',
  price: '',
  advancePaid: false,
  advanceAmount: '',
};

type ProjectTab = 'pending' | 'active' | 'review' | 'completed';

function parseProjectTab(value: string | null): ProjectTab {
  if (value === 'pending' || value === 'completed' || value === 'active' || value === 'review') return value;
  return 'pending';
}

export default function AdminProjectsPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <AdminProjectsPageContent />
    </Suspense>
  );
}

function AdminProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = parseProjectTab(searchParams.get('tab'));
  const { t, locale } = useAppSettings();
  const { showToast } = useToast();
  const {
    projects,
    workers,
    comments,
    payments,
    ratingEntries,
    loading,
    error,
    setError,
    loadData,
    pendingCount,
  } = useAdminData();

  const [tab, setTab] = useState<ProjectTab>(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSelection, setDateSelection] = useState<CompletedDateSelection>({
    kind: 'preset',
    preset: 'this_week',
  });

  const periodRange = useMemo(() => getCompletedDateRange(dateSelection), [dateSelection]);
  const periodLabel = useMemo(
    () => formatCompletedPeriodLabel(periodRange.start, periodRange.end, locale),
    [periodRange, locale],
  );
  const customDateReady =
    dateSelection.kind !== 'custom' ||
    (Boolean(dateSelection.start) && Boolean(dateSelection.end));

  const projectsByDate = useMemo(
    () => filterProjectsByOrderDate(projects, dateSelection),
    [projects, dateSelection],
  );

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  function selectTab(next: ProjectTab) {
    setTab(next);
    router.replace(`/admin/projects?tab=${next}`, { scroll: false });
  }
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [reassignModal, setReassignModal] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [reassignWorker, setReassignWorker] = useState('');
  const [unassignId, setUnassignId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProject, setNewProject] = useState({ ...EMPTY_NEW_PROJECT });
  const [showSecondPhone, setShowSecondPhone] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [commentId, setCommentId] = useState<string | null>(null);
  const [commentSentiment, setCommentSentiment] = useState<CommentSentiment | null>(null);
  const [commentText, setCommentText] = useState('');
  const [editProject, setEditProject] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    address: string;
    phone: string;
    phone2: string;
    price: string;
    advancePaid: boolean;
    advanceAmount: string;
  } | null>(null);
  const [editShowSecondPhone, setEditShowSecondPhone] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [cardBusyId, setCardBusyId] = useState<string | null>(null);
  const [paymentModalId, setPaymentModalId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [returnReasonEditId, setReturnReasonEditId] = useState<string | null>(null);
  const [returnReasonDraft, setReturnReasonDraft] = useState('');

  const paymentsByProject = useMemo(() => {
    const map = new Map<string, typeof payments>();
    for (const payment of payments) {
      const list = map.get(payment.projectId) ?? [];
      list.push(payment);
      map.set(payment.projectId, list);
    }
    return map;
  }, [payments]);

  const commentsByProject = useMemo(() => {
    const map = new Map<string, typeof comments>();
    for (const comment of comments) {
      const list = map.get(comment.projectId) ?? [];
      list.push(comment);
      map.set(comment.projectId, list);
    }
    return map;
  }, [comments]);

  const rejectionCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of ratingEntries) {
      if (entry.type !== 'rejection') continue;
      map.set(entry.projectId, (map.get(entry.projectId) ?? 0) + 1);
    }
    return map;
  }, [ratingEntries]);

  const workersById = useMemo(() => {
    const map = new Map<string, (typeof workers)[number]>();
    for (const w of workers) map.set(w.id, w);
    return map;
  }, [workers]);

  function projectPayments(projectId: string) {
    return paymentsByProject.get(projectId) ?? [];
  }

  function rejectionCountFor(projectId: string) {
    return rejectionCountByProject.get(projectId) ?? 0;
  }

  function closeNewForm() {
    setShowNewForm(false);
    setNewProject({ ...EMPTY_NEW_PROJECT });
    setShowSecondPhone(false);
  }

  function closeAssignModal() {
    setAssignModal(null);
    setSelectedWorker('');
  }

  function closeReassignModal() {
    setReassignModal(null);
    setReassignWorker('');
  }

  function openReassign(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    const available = workers.filter((w) => w.id !== project?.assignedTo);
    setReassignModal(projectId);
    setReassignWorker(available[0]?.id ?? '');
  }

  const tabProjects = useMemo(() => {
    const source = tab === 'completed' ? projectsByDate : projects;
    return source.filter((p) => {
      if (tab === 'completed') return p.status === 'completed';
      if (tab === 'pending') return p.status === 'pending';
      if (tab === 'review') return p.status === 'pending_review';
      return p.status === 'in_progress';
    });
  }, [projects, projectsByDate, tab]);

  const tabProjectsAllTime = useMemo(
    () =>
      projects.filter((p) => {
        if (tab === 'completed') return p.status === 'completed';
        if (tab === 'pending') return p.status === 'pending';
        if (tab === 'review') return p.status === 'pending_review';
        return p.status === 'in_progress';
      }),
    [projects, tab],
  );

  const filtered = useMemo(
    () => filterProjectsBySearch(tabProjects, searchQuery),
    [tabProjects, searchQuery],
  );

  const tabCounts = useMemo(() => ({
    pending: projects.filter((p) => p.status === 'pending').length,
    active: projects.filter((p) => p.status === 'in_progress').length,
    review: projects.filter((p) => p.status === 'pending_review').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }), [projects]);

  async function handleAssign(projectId: string) {
    if (!selectedWorker || formBusy) return;
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({ projectId, workerId: selectedWorker }),
      });
      closeAssignModal();
      await loadData({ silent: true });
      showToast('success', t('toast.assigned'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleReassign(projectId: string) {
    if (!reassignWorker || formBusy) return;
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({ projectId, workerId: reassignWorker }),
      });
      closeReassignModal();
      await loadData({ silent: true });
      showToast('success', t('toast.assigned'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleUnassign() {
    if (!unassignId || formBusy) return;
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({ mode: 'unassign', projectId: unassignId }),
      });
      setUnassignId(null);
      await loadData({ silent: true });
      showToast('success', t('toast.unassigned'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (formBusy) return;
    const firstName = newProject.firstName.trim();
    const lastName = newProject.lastName.trim();
    const clientName = `${firstName} ${lastName}`.trim();
    const phone = joinProjectPhones([newProject.phone, newProject.phone2]);
    if (!firstName || !lastName || !phone) {
      const msg = t('admin.clientRequiredFields');
      setError(msg);
      showToast('error', msg);
      return;
    }
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: clientName,
          clientName,
          firstName,
          lastName,
          address: newProject.address,
          phone,
          advancePaid: newProject.advancePaid,
          price: newProject.price ? Number(newProject.price) : undefined,
          advanceAmount: newProject.advanceAmount ? Number(newProject.advanceAmount) : undefined,
        }),
      });
      closeNewForm();
      await loadData({ silent: true });
      showToast('success', t('toast.created'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDeleteProject() {
    if (!deleteId || formBusy) return;
    setFormBusy(true);
    setError('');
    try {
      await apiFetch(`/api/projects?id=${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await loadData({ silent: true });
      showToast('success', t('toast.deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleResubmit(projectId: string) {
    if (formBusy || cardBusyId) return;
    setFormBusy(true);
    setCardBusyId(projectId);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, action: 'resubmit' }),
      });
      await loadData({ silent: true });
      showToast('success', t('toast.resubmitted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
      setCardBusyId(null);
    }
  }

  async function handleApprove(projectId: string) {
    if (formBusy || cardBusyId) return;
    setFormBusy(true);
    setCardBusyId(projectId);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, status: 'completed' }),
      });
      await loadData({ silent: true });
      showToast('success', t('toast.projectApproved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
      setCardBusyId(null);
    }
  }

  async function handleAddPayment() {
    if (!paymentModalId || formBusy) return;
    const amount = parseNumberInput(paymentAmount) ?? 0;
    if (!amount || amount <= 0) return;

    const project = projects.find((p) => p.id === paymentModalId);
    if (!project) return;

    const validation = validatePaymentAmount(project, projectPayments(paymentModalId), amount);
    if (!validation.ok) {
      const msg = t('project.paymentExceedsRemaining').replace(
        '{amount}',
        formatPrice(validation.remaining),
      );
      setError(validation.error);
      showToast('error', msg);
      return;
    }

    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          projectId: paymentModalId,
          amount: validation.amount,
          note: paymentNote.trim() || undefined,
        }),
      });
      setPaymentModalId(null);
      setPaymentAmount('');
      setPaymentNote('');
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleSaveReturnReason(projectId: string) {
    if (!returnReasonDraft.trim() || formBusy) return;
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, notes: returnReasonDraft.trim() }),
      });
      setReturnReasonEditId(null);
      setReturnReasonDraft('');
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleReturn() {
    if (!returnId || !returnNote.trim() || formBusy) return;

    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: returnId, status: 'returned', notes: returnNote.trim() }),
      });
      setReturnId(null);
      setReturnNote('');
      showToast('success', t('toast.returned'));
      await loadData({ silent: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleComment() {
    if (!commentId || !commentSentiment || !commentText.trim() || formBusy) return;
    const existing = comments.find((c) => c.projectId === commentId);
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/comments', {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          projectId: commentId,
          text: commentText.trim(),
          sentiment: commentSentiment,
        }),
      });
      setCommentId(null);
      setCommentSentiment(null);
      setCommentText('');
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  function openEdit(id: string) {
    const p = projects.find((pr) => pr.id === id);
    if (!p) return;
    const nameParts = p.clientName.split(' ');
    const phones = splitProjectPhones(p.phone);
    setEditProject({
      id: p.id,
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' '),
      address: p.address,
      phone: phones[0] ? formatPhoneField(phones[0]) : formatPhoneField(p.phone ?? ''),
      phone2: phones[1] ? formatPhoneField(phones[1]) : '',
      price: p.price != null ? String(p.price) : '',
      advancePaid: p.advancePaid,
      advanceAmount: p.advanceAmount != null ? String(p.advanceAmount) : '',
    });
    setEditShowSecondPhone(phones.length > 1);
  }

  async function handleEditProject(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject || formBusy) return;
    const firstName = editProject.firstName.trim();
    const lastName = editProject.lastName.trim();
    const clientName = `${firstName} ${lastName}`.trim();
    const phone = joinProjectPhones([editProject.phone, editProject.phone2]);
    if (!firstName || !lastName || !phone) {
      const msg = t('admin.clientRequiredFields');
      setError(msg);
      showToast('error', msg);
      return;
    }
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editProject.id,
          title: clientName,
          clientName,
          firstName,
          lastName,
          address: editProject.address,
          phone,
          price: editProject.price ? Number(editProject.price) : undefined,
          advancePaid: editProject.advancePaid,
          advanceAmount: editProject.advanceAmount ? Number(editProject.advanceAmount) : undefined,
        }),
      });
      setEditProject(null);
      setEditShowSecondPhone(false);
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setFormBusy(false);
    }
  }

  const canCreateClient =
    newProject.firstName.trim().length > 0 &&
    newProject.lastName.trim().length > 0 &&
    newProject.address.trim().length > 0 &&
    Boolean(joinProjectPhones([newProject.phone, newProject.phone2]));
  const canEditClient = Boolean(
    editProject &&
      editProject.firstName.trim() &&
      editProject.lastName.trim() &&
      editProject.address.trim() &&
      joinProjectPhones([editProject.phone, editProject.phone2]),
  );

  if (loading) return <SkeletonPage />;

  return (
    <>
      <PageHeader
        compact
        title={t('dashboard.projectsTitle')}
        actions={
          <>
            <Button onClick={() => setShowNewForm(true)}>+ {t('admin.newOrder')}</Button>
            <Link
              href="/admin/random-assign"
              className={cn(
                'ui-btn-outline',
                (pendingCount === 0 || workers.length === 0) && 'pointer-events-none opacity-50',
              )}
              aria-disabled={pendingCount === 0 || workers.length === 0}
              title={
                workers.length === 0
                  ? t('admin.randomAssignNeedWorkers')
                  : pendingCount === 0
                    ? t('admin.randomAssignNeedOrders')
                    : undefined
              }
              tabIndex={pendingCount === 0 || workers.length === 0 ? -1 : 0}
            >
              {t('admin.randomAssign')} ({pendingCount})
            </Link>
          </>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-deadline-red/10 px-4 py-3 text-sm text-deadline-red">{error}</p>
      )}

      <div className="ui-segment-tabs">
        {([
          ['pending', t('admin.pending'), tabCounts.pending],
          ['active', t('admin.inProgress'), tabCounts.active],
          ['review', t('admin.pendingReview'), tabCounts.review],
          ['completed', t('admin.completed'), tabCounts.completed],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={cn('ui-segment-tab', tab === key ? 'ui-segment-tab-active' : 'ui-segment-tab-inactive')}
          >
            <ProjectTabIcon tab={key} active={tab === key} />
            <span className="ui-segment-tab-label">{label}</span>
            <span className="ui-segment-tab-count">· {count}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ProjectSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('common.searchProjectsPlaceholder')}
          clearLabel={t('common.searchClear')}
          className="sm:flex-1"
        />
        {tab === 'completed' && (
          <CompletedDateFilter selection={dateSelection} onChange={setDateSelection} />
        )}
      </div>
      {tab === 'completed' && (
        <p className="-mt-2 mb-4 text-xs text-app-muted">{periodLabel}</p>
      )}
      {searchQuery.trim() && tabProjects.length > 0 && (
        <p className="-mt-2 mb-4 text-xs text-app-muted">
          {filtered.length} / {tabProjects.length}
        </p>
      )}

      {tab === 'completed' && !customDateReady ? (
        <EmptyState
          title={t('worker.completedCustomRange')}
          description={t('worker.completedCustomRangeHint')}
        />
      ) : tab === 'completed' && tabProjects.length === 0 && tabProjectsAllTime.length > 0 ? (
        <EmptyState
          title={t('admin.noProjectsInPeriod')}
          description={t('admin.noProjectsInPeriodDesc')}
        />
      ) : tabProjects.length === 0 ? (
        <EmptyState
          title={
            tab === 'pending'
              ? t('dashboard.noSectionPending')
              : tab === 'active'
                ? t('dashboard.noSectionActive')
                : tab === 'review'
                  ? t('dashboard.noSectionReview')
                  : t('dashboard.noSectionCompleted')
          }
          description={
            tab === 'pending'
              ? t('dashboard.noSectionPendingDesc')
              : tab === 'active'
                ? t('dashboard.noSectionActiveDesc')
                : tab === 'review'
                  ? t('dashboard.noSectionReviewDesc')
                  : t('dashboard.noSectionCompletedDesc')
          }
          action={
            tab === 'pending' ? (
              <Button onClick={() => setShowNewForm(true)}>+ {t('admin.newOrder')}</Button>
            ) : tab === 'active' && pendingCount > 0 ? (
              <Link href="/admin/projects?tab=pending">
                <Button>{t('admin.pending')}</Button>
              </Link>
            ) : undefined
          }
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
        <div className="ui-card-stack">
          {filtered.map((project) => {
            const worker = project.assignedTo ? workersById.get(project.assignedTo) : undefined;
            return (
              <ProjectCard
                key={project.id}
                variant="wide"
                project={project}
                workerName={worker?.name}
                comments={commentsByProject.get(project.id) ?? []}
                payments={projectPayments(project.id)}
                rejectionCount={rejectionCountFor(project.id)}
                showActions
                isAdmin
                onAddPayment={(id) => {
                  setPaymentModalId(id);
                  setPaymentAmount('');
                  setPaymentNote('');
                  setError('');
                }}
                onResubmit={handleResubmit}
                returnReasonEditing={returnReasonEditId === project.id}
                returnReasonDraft={returnReasonEditId === project.id ? returnReasonDraft : ''}
                onReturnReasonDraftChange={setReturnReasonDraft}
                onSaveReturnReason={handleSaveReturnReason}
                onStartReturnReasonEdit={(id) => {
                  const p = projects.find((pr) => pr.id === id);
                  setReturnReasonEditId(id);
                  setReturnReasonDraft(p?.notes?.trim() ?? '');
                }}
                onCancelReturnReasonEdit={() => {
                  setReturnReasonEditId(null);
                  setReturnReasonDraft('');
                }}
                returnReasonSaving={formBusy}
                actionBusy={cardBusyId === project.id}
                onAssign={(id) => {
                  setAssignModal(id);
                  setSelectedWorker(workers[0]?.id ?? '');
                }}
                onEdit={openEdit}
                onDelete={(id) => setDeleteId(id)}
                onReturn={(id) => setReturnId(id)}
                onApprove={handleApprove}
                onReassign={openReassign}
                onUnassign={(id) => setUnassignId(id)}
                onComment={(id) => {
                  const existing = comments.find((c) => c.projectId === id);
                  setCommentId(id);
                  if (existing) {
                    setCommentSentiment(existing.sentiment);
                    setCommentText(existing.text);
                  } else {
                    setCommentSentiment(null);
                    setCommentText('');
                  }
                }}
              />
            );
          })}
        </div>
      )}

      <Modal open={!!assignModal} title={t('admin.assignWorker')} onClose={() => { if (!formBusy) closeAssignModal(); }}>
        <select
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          className={uiSelectClass}
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <div className="mt-4 flex flex-col gap-2 xs:flex-row">
          <Button className="flex-1" disabled={formBusy} onClick={() => assignModal && handleAssign(assignModal)}>
            {formBusy ? t('common.assigning') : t('common.assign')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={closeAssignModal} disabled={formBusy}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      <Modal open={!!reassignModal} title={t('workerProfile.reassign')} onClose={() => { if (!formBusy) closeReassignModal(); }}>
        <p className="mb-3 text-sm text-app-muted">{t('workerProfile.reassignTo')}</p>
        <select
          value={reassignWorker}
          onChange={(e) => setReassignWorker(e.target.value)}
          className={uiSelectClass}
        >
          {workers
            .filter((w) => w.id !== projects.find((p) => p.id === reassignModal)?.assignedTo)
            .map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
        </select>
        <div className="mt-4 flex flex-col gap-2 xs:flex-row">
          <Button
            className="flex-1"
            disabled={!reassignWorker || formBusy}
            onClick={() => reassignModal && handleReassign(reassignModal)}
          >
            {formBusy ? t('common.assigning') : t('common.assign')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={closeReassignModal} disabled={formBusy}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      <Modal open={showNewForm} title={t('admin.newOrder')} onClose={() => { if (!formBusy) closeNewForm(); }} size="lg">
        <form onSubmit={handleCreateProject}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('common.firstName')}
              required
              value={newProject.firstName}
              onChange={(e) => setNewProject({ ...newProject, firstName: e.target.value })}
            />
            <Input
              label={t('common.lastName')}
              required
              value={newProject.lastName}
              onChange={(e) => setNewProject({ ...newProject, lastName: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label={t('admin.address')}
                required
                value={newProject.address}
                onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                placeholder={t('admin.addressPlaceholder')}
              />
            </div>
            <div>
              <label className={uiFieldLabelClass}>{t('admin.phone')}</label>
              <ClientPhoneFields
                phone={newProject.phone}
                phone2={newProject.phone2}
                showSecond={showSecondPhone}
                placeholder={t('admin.phonePlaceholder')}
                addLabel={t('admin.addPhone')}
                removeLabel={t('admin.removePhone')}
                onPhoneChange={(phone) => setNewProject({ ...newProject, phone })}
                onPhone2Change={(phone2) => setNewProject({ ...newProject, phone2 })}
                onAddSecond={() => setShowSecondPhone(true)}
                onRemoveSecond={() => {
                  setShowSecondPhone(false);
                  setNewProject({ ...newProject, phone2: '' });
                }}
              />
            </div>
            <NumberInput
              label={t('admin.price')}
              value={newProject.price}
              onChange={(price) => setNewProject({ ...newProject, price })}
              placeholder={t('admin.pricePlaceholder')}
            />

            <div className="sm:col-span-2">
              <div
                className={cn(
                  uiTogglePanelClass,
                  newProject.advancePaid && uiTogglePanelActiveClass,
                )}
              >
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="text-sm font-medium text-app-text">{t('admin.advancePaid')}</span>
                  <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                    <input
                      type="checkbox"
                      checked={newProject.advancePaid}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          advancePaid: e.target.checked,
                          advanceAmount: e.target.checked ? newProject.advanceAmount : '',
                        })
                      }
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-full bg-app-border transition peer-checked:bg-app-accent" />
                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </span>
                </label>

                {newProject.advancePaid && (
                  <div className="mt-4 border-t border-app-border/70 pt-4">
                    <NumberInput
                      label={t('admin.advanceAmount')}
                      value={newProject.advanceAmount}
                      onChange={(advanceAmount) => setNewProject({ ...newProject, advanceAmount })}
                      placeholder={t('admin.pricePlaceholder')}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 xs:flex-row">
            <Button type="submit" disabled={formBusy || !canCreateClient}>
              {formBusy ? t('common.creating') : t('common.save')}
            </Button>
            <Button variant="outline" type="button" onClick={closeNewForm} disabled={formBusy}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editProject}
        title={t('common.edit')}
        onClose={() => {
          if (!formBusy) {
            setEditProject(null);
            setEditShowSecondPhone(false);
          }
        }}
        size="lg"
      >
        {editProject && (
          <form onSubmit={handleEditProject}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('common.firstName')}
                required
                value={editProject.firstName}
                onChange={(e) => setEditProject({ ...editProject, firstName: e.target.value })}
              />
              <Input
                label={t('common.lastName')}
                required
                value={editProject.lastName}
                onChange={(e) => setEditProject({ ...editProject, lastName: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label={t('admin.address')}
                  required
                  value={editProject.address}
                  onChange={(e) => setEditProject({ ...editProject, address: e.target.value })}
                  placeholder={t('admin.addressPlaceholder')}
                />
              </div>
              <div>
                <label className={uiFieldLabelClass}>{t('admin.phone')}</label>
                <ClientPhoneFields
                  phone={editProject.phone}
                  phone2={editProject.phone2}
                  showSecond={editShowSecondPhone}
                  placeholder={t('admin.phonePlaceholder')}
                  addLabel={t('admin.addPhone')}
                  removeLabel={t('admin.removePhone')}
                  onPhoneChange={(phone) => setEditProject({ ...editProject, phone })}
                  onPhone2Change={(phone2) => setEditProject({ ...editProject, phone2 })}
                  onAddSecond={() => setEditShowSecondPhone(true)}
                  onRemoveSecond={() => {
                    setEditShowSecondPhone(false);
                    setEditProject({ ...editProject, phone2: '' });
                  }}
                />
              </div>
              <NumberInput
                label={t('admin.price')}
                value={editProject.price}
                onChange={(price) => setEditProject({ ...editProject, price })}
                placeholder={t('admin.pricePlaceholder')}
              />
              <div className="sm:col-span-2">
                <div
                  className={cn(
                    uiTogglePanelClass,
                    editProject.advancePaid && uiTogglePanelActiveClass,
                  )}
                >
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span className="text-sm font-medium text-app-text">{t('admin.advancePaid')}</span>
                    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={editProject.advancePaid}
                        onChange={(e) =>
                          setEditProject({
                            ...editProject,
                            advancePaid: e.target.checked,
                            advanceAmount: e.target.checked ? editProject.advanceAmount : '',
                          })
                        }
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 rounded-full bg-app-border transition peer-checked:bg-app-accent" />
                      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                    </span>
                  </label>
                  {editProject.advancePaid && (
                    <div className="mt-4 border-t border-app-border/70 pt-4">
                      <NumberInput
                        label={t('admin.advanceAmount')}
                        value={editProject.advanceAmount}
                        onChange={(advanceAmount) => setEditProject({ ...editProject, advanceAmount })}
                        placeholder={t('admin.pricePlaceholder')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 xs:flex-row">
              <Button type="submit" disabled={formBusy || !canEditClient}>
                {formBusy ? t('common.saving') : t('common.save')}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setEditProject(null);
                  setEditShowSecondPhone(false);
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Return modal */}
      <Modal
        open={!!returnId}
        title={t('rating.returnTitle')}
        description={t('rating.returnReasonHint')}
        onClose={() => { if (!formBusy) { setReturnId(null); setReturnNote(''); } }}
      >
        <textarea
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          placeholder={t('rating.returnReason')}
          rows={4}
          className={cn(uiInputClass, 'resize-none')}
        />
        <div className="mt-4 flex flex-col gap-2 xs:flex-row">
          <Button
            onClick={handleReturn}
            disabled={!returnNote.trim() || formBusy}
            variant="outline"
            className="border-orange-500/40 text-orange-600 hover:border-orange-500 hover:bg-orange-500/10 dark:text-orange-400"
          >
            {formBusy ? t('common.returning') : `🔄 ${t('rating.returnProject')}`}
          </Button>
          <Button variant="outline" onClick={() => { setReturnId(null); setReturnNote(''); }}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!commentId}
        title={(() => {
          const existing = commentId ? comments.find((c) => c.projectId === commentId) : null;
          return existing ? t('rating.editComment') : t('rating.leaveComment');
        })()}
        description={!commentSentiment ? t('rating.commentStepHint') : undefined}
        onClose={() => { if (!formBusy) { setCommentId(null); setCommentSentiment(null); setCommentText(''); } }}
      >
        {!commentSentiment ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCommentSentiment('positive')}
              className="ui-sentiment-btn ui-sentiment-positive"
            >
              <span className="text-3xl">👍</span>
              <p className="ui-sentiment-label-positive">{t('rating.commentPositive')}</p>
            </button>
            <button
              type="button"
              onClick={() => setCommentSentiment('negative')}
              className="ui-sentiment-btn ui-sentiment-negative"
            >
              <span className="text-3xl">👎</span>
              <p className="ui-sentiment-label-negative">{t('rating.commentNegative')}</p>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn(
                commentSentiment === 'positive' ? 'ui-badge-positive' : 'ui-badge-negative',
              )}>
                {commentSentiment === 'positive'
                  ? `👍 ${t('rating.sentimentPositive')}`
                  : `👎 ${t('rating.sentimentNegative')}`}
              </span>
              <button
                type="button"
                onClick={() => setCommentSentiment(null)}
                className="ui-link-btn"
              >
                {t('rating.changeSentiment')}
              </button>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('rating.commentPlaceholder')}
              rows={3}
              className={cn(uiInputClass, 'resize-none')}
              autoFocus
            />
            <div className="mt-4 flex flex-col gap-2 xs:flex-row">
              <Button onClick={handleComment} disabled={!commentText.trim() || formBusy}>
                {formBusy ? t('common.saving') : `💬 ${t('common.save')}`}
              </Button>
              <Button variant="outline" onClick={() => { setCommentId(null); setCommentSentiment(null); setCommentText(''); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!paymentModalId}
        title={t('project.addPayment')}
        onClose={() => {
          if (!formBusy) {
            setPaymentModalId(null);
            setPaymentAmount('');
            setPaymentNote('');
            setError('');
          }
        }}
      >
        {(() => {
          const paymentProject = paymentModalId
            ? projects.find((p) => p.id === paymentModalId)
            : undefined;
          const remaining = paymentProject
            ? getRemainingPrice(paymentProject, projectPayments(paymentProject.id))
            : null;
          const amountNum = parseNumberInput(paymentAmount) ?? 0;
          const paymentValidation = paymentProject
            ? validatePaymentAmount(paymentProject, projectPayments(paymentProject.id), amountNum)
            : null;
          const exceeds = paymentValidation != null && !paymentValidation.ok;
          const exceedsMsg = exceeds
            ? t('project.paymentExceedsRemaining').replace(
                '{amount}',
                formatPrice(paymentValidation.remaining),
              )
            : '';

          return (
            <>
              {paymentProject && projectPayments(paymentProject.id).length > 0 && (
                <PaymentHistoryList
                  payments={projectPayments(paymentProject.id)}
                  className="mb-4"
                />
              )}
              {remaining != null && (
                <p className="mb-3 text-sm text-app-muted">
                  {t('project.paymentRemaining')}:{' '}
                  <span className="font-semibold text-app-text">{formatPrice(remaining)}</span>
                </p>
              )}
              <NumberInput
                label={t('project.paymentAmount')}
                value={paymentAmount}
                onChange={(v) => {
                  setPaymentAmount(v);
                  if (error) setError('');
                }}
              />
              {remaining != null && remaining > 0 && (
                <button
                  type="button"
                  className="ui-link-btn mt-2 text-sm"
                  disabled={formBusy}
                  onClick={() => {
                    setPaymentAmount(String(remaining));
                    if (error) setError('');
                  }}
                >
                  {t('project.payRemainingFull')}
                </button>
              )}
              {(exceeds || error) && (
                <p className="mt-2 text-sm text-deadline-red" role="alert">
                  {exceedsMsg || error}
                </p>
              )}
              <Input
                label={t('project.paymentNote')}
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder={t('project.paymentNotePlaceholder')}
                className="mt-3"
              />
              <div className="mt-4 flex flex-col gap-2 xs:flex-row">
                <Button
                  className="flex-1"
                  disabled={formBusy || !paymentAmount.trim() || exceeds}
                  onClick={handleAddPayment}
                >
                  {formBusy ? t('common.saving') : t('common.save')}
                </Button>
                <Button
                  variant="outline"
                  disabled={formBusy}
                  onClick={() => {
                    setPaymentModalId(null);
                    setPaymentAmount('');
                    setPaymentNote('');
                    setError('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </>
          );
        })()}
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        open={!!deleteId}
        title={t('admin.confirmDeleteProject')}
        message={(() => {
          const p = projects.find((pr) => pr.id === deleteId);
          return p ? `${p.clientName} — ${p.address}` : '';
        })()}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        open={!!unassignId}
        title={t('workerProfile.unassign')}
        message={t('workerProfile.confirmUnassign')}
        confirmLabel={t('workerProfile.unassign')}
        confirmingLabel={t('common.unassigning')}
        variant="danger"
        onConfirm={handleUnassign}
        onCancel={() => setUnassignId(null)}
      />
    </>
  );
}

function ClientPhoneFields({
  phone,
  phone2,
  showSecond,
  placeholder,
  addLabel,
  removeLabel,
  onPhoneChange,
  onPhone2Change,
  onAddSecond,
  onRemoveSecond,
}: {
  phone: string;
  phone2: string;
  showSecond: boolean;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  onPhoneChange: (value: string) => void;
  onPhone2Change: (value: string) => void;
  onAddSecond: () => void;
  onRemoveSecond: () => void;
}) {
  return (
    <div className="mt-1.5 space-y-2">
      <div className="flex items-stretch gap-2">
        <PhoneInput value={phone} onChange={onPhoneChange} placeholder={placeholder} />
        {!showSecond && (
          <button
            type="button"
            onClick={onAddSecond}
            className="ui-icon-btn shrink-0 self-center"
            aria-label={addLabel}
            title={addLabel}
          >
            +
          </button>
        )}
      </div>
      {showSecond && (
        <div className="flex items-stretch gap-2">
          <PhoneInput value={phone2} onChange={onPhone2Change} placeholder={placeholder} />
          <button
            type="button"
            onClick={onRemoveSecond}
            className="ui-icon-btn shrink-0 self-center"
            aria-label={removeLabel}
            title={removeLabel}
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}

function PhoneInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className={cn(uiInputGroupClass, 'min-w-0 flex-1')}>
      <span className="select-none pl-3 text-sm text-app-muted">+998</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onChange(formatPhoneField(e.target.value))}
        onPaste={(e) => {
          e.preventDefault();
          onChange(formatPhoneField(e.clipboardData.getData('text')));
        }}
        placeholder={placeholder}
        className="w-full bg-transparent px-1 py-2 text-sm text-app-text outline-none"
      />
    </div>
  );
}
