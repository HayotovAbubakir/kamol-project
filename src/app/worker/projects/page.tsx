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
  const [busy, setBusy] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const filtered = useMemo(
    () => filterProjectsBySearch(activeProjects, searchQuery),
    [activeProjects, searchQuery],
  );

  async function handleComplete(projectId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, status: 'completed' }),
      });
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  function toggleNotesEditor(projectId: string) {
    if (editingNotesId === projectId) {
      setEditingNotesId(null);
      setNotesDraft('');
      return;
    }
    const project = activeProjects.find((p) => p.id === projectId);
    setEditingNotesId(projectId);
    setNotesDraft(project?.description ?? '');
  }

  async function handleSaveNotes(projectId: string, text: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, description: text }),
      });
      setEditingNotesId(null);
      setNotesDraft('');
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
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
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              variant="worker"
              comments={comments.filter((c) => c.projectId === project.id)}
              showActions
              onStatusChange={(id) => handleComplete(id)}
              onNotes={toggleNotesEditor}
              onSaveNotes={handleSaveNotes}
              notesEditing={editingNotesId === project.id}
              notesDraft={editingNotesId === project.id ? notesDraft : ''}
              onNotesDraftChange={setNotesDraft}
              notesSaving={busy && editingNotesId === project.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
