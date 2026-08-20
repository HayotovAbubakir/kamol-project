'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { Button, Input, Modal, NumberInput, ConfirmModal, uiFieldLabelClass, uiInputClass, uiInputGroupClass, uiSelectClass, uiTogglePanelClass, uiTogglePanelActiveClass } from '@/components/ui';
import type { CommentSentiment } from '@/types';
import { SkeletonPage } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { apiFetch } from '@/lib/auth';
import { cn, extractUzbekMobileDigits, filterProjectsBySearch, formatPhoneInput, normalizePhone } from '@/lib/utils';

function formatPhoneField(value: string): string {
  const digits = extractUzbekMobileDigits(value) ?? value.replace(/\D/g, '').slice(0, 9);
  return formatPhoneInput(digits);
}

const EMPTY_NEW_PROJECT = {
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  price: '',
  advancePaid: false,
  advanceAmount: '',
};

type ProjectTab = 'active' | 'completed' | 'pending';

function parseProjectTab(value: string | null): ProjectTab {
  if (value === 'pending' || value === 'completed' || value === 'active') return value;
  return 'active';
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
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const {
    projects,
    workers,
    comments,
    loading,
    error,
    setError,
    loadData,
    pendingCount,
  } = useAdminData();

  const [tab, setTab] = useState<ProjectTab>(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');

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
    price: string;
    advancePaid: boolean;
    advanceAmount: string;
  } | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  function closeNewForm() {
    setShowNewForm(false);
    setNewProject({ ...EMPTY_NEW_PROJECT });
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

  const tabProjects = useMemo(
    () =>
      projects.filter((p) => {
        if (tab === 'completed') return p.status === 'completed';
        if (tab === 'pending') return p.status === 'pending';
        return p.status === 'in_progress';
      }),
    [projects, tab],
  );

  const filtered = useMemo(
    () => filterProjectsBySearch(tabProjects, searchQuery),
    [tabProjects, searchQuery],
  );

  const tabCounts = {
    active: projects.filter((p) => p.status === 'in_progress').length,
    pending: projects.filter((p) => p.status === 'pending').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  };

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
      showToast('success', t('toast.saved'));
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
    const clientName = `${newProject.firstName} ${newProject.lastName}`.trim();
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: clientName,
          clientName,
          address: newProject.address,
          phone: normalizePhone(newProject.phone) || undefined,
          advancePaid: newProject.advancePaid,
          price: newProject.price ? Number(newProject.price) : undefined,
          advanceAmount: newProject.advanceAmount ? Number(newProject.advanceAmount) : undefined,
        }),
      });
      closeNewForm();
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

  async function handleDeleteProject() {
    if (!deleteId || formBusy) return;
    setFormBusy(true);
    setError('');
    try {
      await apiFetch(`/api/projects?id=${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
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
      showToast('success', t('toast.saved'));
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
    const digits = extractUzbekMobileDigits(p.phone ?? '') ?? '';
    setEditProject({
      id: p.id,
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' '),
      address: p.address,
      phone: formatPhoneInput(digits),
      price: p.price != null ? String(p.price) : '',
      advancePaid: p.advancePaid,
      advanceAmount: p.advanceAmount != null ? String(p.advanceAmount) : '',
    });
  }

  async function handleEditProject(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject || formBusy) return;
    const clientName = `${editProject.firstName} ${editProject.lastName}`.trim();
    setFormBusy(true);
    setError('');
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editProject.id,
          title: clientName,
          clientName,
          address: editProject.address,
          phone: normalizePhone(editProject.phone) || undefined,
          price: editProject.price ? Number(editProject.price) : undefined,
          advancePaid: editProject.advancePaid,
          advanceAmount: editProject.advanceAmount ? Number(editProject.advanceAmount) : undefined,
        }),
      });
      setEditProject(null);
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
          ['active', t('admin.inProgress'), tabCounts.active],
          ['pending', t('admin.pending'), tabCounts.pending],
          ['completed', t('admin.completed'), tabCounts.completed],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={cn('ui-segment-tab', tab === key ? 'ui-segment-tab-active' : 'ui-segment-tab-inactive')}
          >
            <span className="ui-segment-tab-label">{label}</span>
            <span className="ui-segment-tab-count">· {count}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 mt-3">
        <ProjectSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('common.searchProjectsPlaceholder')}
          clearLabel={t('common.searchClear')}
        />
        {searchQuery.trim() && tabProjects.length > 0 && (
          <p className="mt-2 text-xs text-app-muted">
            {filtered.length} / {tabProjects.length}
          </p>
        )}
      </div>

      {tabProjects.length === 0 ? (
        <EmptyState
          title={t('dashboard.noSectionProjects')}
          description={t('dashboard.noSectionDesc')}
          action={<Button onClick={() => setShowNewForm(true)}>+ {t('admin.newOrder')}</Button>}
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
        <div className="flex flex-col gap-4">
          {filtered.map((project) => {
            const worker = workers.find((w) => w.id === project.assignedTo);
            return (
              <ProjectCard
                key={project.id}
                variant="wide"
                project={project}
                workerName={worker?.name}
                comments={comments.filter((c) => c.projectId === project.id)}
                showActions
                isAdmin
                onAssign={(id) => {
                  setAssignModal(id);
                  setSelectedWorker(workers[0]?.id ?? '');
                }}
                onEdit={openEdit}
                onDelete={(id) => setDeleteId(id)}
                onReturn={(id) => setReturnId(id)}
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
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" disabled={formBusy} onClick={() => assignModal && handleAssign(assignModal)}>
            {formBusy ? t('common.saving') : t('common.assign')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={closeAssignModal}>
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
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            disabled={!reassignWorker || formBusy}
            onClick={() => reassignModal && handleReassign(reassignModal)}
          >
            {formBusy ? t('common.saving') : t('common.assign')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={closeReassignModal}>
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
              <div className={cn(uiInputGroupClass, 'mt-1.5')}>
                <span className="select-none pl-3 text-sm text-app-muted">+998</span>
                <input
                  type="tel"
                  value={newProject.phone}
                  onChange={(e) => {
                    setNewProject({ ...newProject, phone: formatPhoneField(e.target.value) });
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    setNewProject({ ...newProject, phone: formatPhoneField(e.clipboardData.getData('text')) });
                  }}
                  placeholder={t('admin.phonePlaceholder')}
                  className="w-full bg-transparent px-1 py-2 text-sm text-app-text outline-none"
                />
              </div>
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
          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={formBusy}>
              {formBusy ? t('common.saving') : t('common.save')}
            </Button>
            <Button variant="outline" type="button" onClick={closeNewForm}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editProject} title={t('common.edit')} onClose={() => { if (!formBusy) setEditProject(null); }} size="lg">
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
                <div className={cn(uiInputGroupClass, 'mt-1.5')}>
                  <span className="select-none pl-3 text-sm text-app-muted">+998</span>
                  <input
                    type="tel"
                    value={editProject.phone}
                    onChange={(e) => {
                      setEditProject({ ...editProject, phone: formatPhoneField(e.target.value) });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      setEditProject({ ...editProject, phone: formatPhoneField(e.clipboardData.getData('text')) });
                    }}
                    placeholder={t('admin.phonePlaceholder')}
                    className="w-full bg-transparent px-1 py-2 text-sm text-app-text outline-none"
                  />
                </div>
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
            <div className="mt-5 flex gap-2">
              <Button type="submit" disabled={formBusy}>
              {formBusy ? t('common.saving') : t('common.save')}
            </Button>
              <Button variant="outline" type="button" onClick={() => setEditProject(null)}>
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
        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleReturn}
            disabled={!returnNote.trim() || formBusy}
            variant="outline"
            className="border-orange-500/40 text-orange-600 hover:border-orange-500 hover:bg-orange-500/10 dark:text-orange-400"
          >
            {formBusy ? t('common.saving') : `🔄 ${t('rating.returnProject')}`}
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
            <div className="mt-4 flex gap-2">
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
        variant="danger"
        onConfirm={handleUnassign}
        onCancel={() => setUnassignId(null)}
      />
    </>
  );
}
