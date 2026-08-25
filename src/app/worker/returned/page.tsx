'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectSearchInput } from '@/components/ProjectSearchInput';
import { SkeletonPage } from '@/components/Skeleton';
import { Button, Modal } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useWorkerData } from '@/hooks/useWorkerData';
import { apiFetch } from '@/lib/auth';
import { filterProjectsBySearch, formatAddress } from '@/lib/utils';

export default function WorkerReturnedPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const { returnedProjects, comments, loading, loadData } = useWorkerData();
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyProjectId, setReplyProjectId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const filtered = useMemo(
    () => filterProjectsBySearch(returnedProjects, searchQuery),
    [returnedProjects, searchQuery],
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

  const replyProject = useMemo(
    () => (replyProjectId ? returnedProjects.find((p) => p.id === replyProjectId) : undefined),
    [replyProjectId, returnedProjects],
  );

  function openReplyModal(projectId: string) {
    setReplyProjectId(projectId);
    setNotesDraft('');
  }

  function closeReplyModal() {
    if (busy) return;
    setReplyProjectId(null);
    setNotesDraft('');
  }

  async function handleSubmitReply() {
    if (busy || !replyProjectId || !notesDraft.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/api/worker/replies', {
        method: 'POST',
        body: JSON.stringify({ projectId: replyProjectId, message: notesDraft.trim() }),
      });
      setReplyProjectId(null);
      setNotesDraft('');
      showToast('success', t('worker.replySent'));
      await loadData({ silent: true });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <>
      <PageHeader title={t('worker.returnedTitle')} />

      {returnedProjects.length > 0 && (
        <p className="ui-hint">{t('project.returnedAlertHint')}</p>
      )}

      {returnedProjects.length > 0 && (
        <div className="mb-4">
          <ProjectSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('common.searchProjectsPlaceholder')}
            clearLabel={t('common.searchClear')}
          />
        </div>
      )}

      {returnedProjects.length === 0 ? (
        <EmptyState
          title={t('worker.noReturnedProject')}
          description={t('worker.noReturnedProjectDesc')}
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
              workerReplyMode
              onNotes={openReplyModal}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!replyProject}
        title={t('worker.replyLabel')}
        description={
          replyProject
            ? [replyProject.title, formatAddress(replyProject)].filter(Boolean).join(' · ')
            : undefined
        }
        onClose={closeReplyModal}
        size="lg"
      >
        {replyProject?.notes?.trim() && (
          <p className="mb-3 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-sm text-app-muted">
            <span className="font-medium text-orange-600 dark:text-orange-300">
              {t('project.returnedReason')}:
            </span>{' '}
            {replyProject.notes.trim()}
          </p>
        )}
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-app-muted">
          {t('worker.replyLabel')}
        </label>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={5}
          className="ui-input w-full resize-none"
          placeholder={t('worker.replyPlaceholder')}
          autoFocus
        />
        <div className="mt-4 flex flex-col-reverse gap-2 xs:flex-row xs:flex-wrap xs:justify-end">
          <Button variant="outline" className="w-full xs:w-auto" onClick={closeReplyModal} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button className="w-full xs:w-auto" onClick={handleSubmitReply} disabled={busy || !notesDraft.trim()}>
            {busy ? t('common.submitting') : t('worker.replySubmit')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
