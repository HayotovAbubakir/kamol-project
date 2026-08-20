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

export default function WorkerReturnedPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const { returnedProjects, comments, loading, loadData } = useWorkerData();
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const filtered = useMemo(
    () => filterProjectsBySearch(returnedProjects, searchQuery),
    [returnedProjects, searchQuery],
  );

  function toggleNotesEditor(projectId: string) {
    if (editingNotesId === projectId) {
      setEditingNotesId(null);
      setNotesDraft('');
      return;
    }
    const project = returnedProjects.find((p) => p.id === projectId);
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
      <PageHeader title={t('worker.returnedTitle')} description={t('worker.returnedDesc')} />

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
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              variant="worker"
              comments={comments.filter((c) => c.projectId === project.id)}
              showActions
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
