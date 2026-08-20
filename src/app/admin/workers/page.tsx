'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StarRating } from '@/components/StarRating';
import { Button, Input, Modal, ConfirmModal } from '@/components/ui';
import { SkeletonTable } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { WorkerProfileModal } from '@/components/WorkerProfileModal';
import { apiFetch } from '@/lib/auth';
import { isInProgressStatus, formatWeeklyRank } from '@/lib/utils';

const EMPTY_WORKER = {
  firstName: '',
  lastName: '',
  username: '',
  password: '',
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export default function AdminWorkersPage() {
  const { t, locale } = useAppSettings();
  const { showToast } = useToast();
  const { projects, workers, leaderboard, allRatings, loading, error, setError, loadData } = useAdminData();

  const sortedWorkers = [...workers].sort((a, b) => {
    const aIdx = leaderboard.findIndex((l) => l.workerId === a.id);
    const bIdx = leaderboard.findIndex((l) => l.workerId === b.id);
    const aOrder = aIdx === -1 ? 999 : aIdx;
    const bOrder = bIdx === -1 ? 999 : bIdx;
    return aOrder - bOrder;
  });

  const leaderId = leaderboard.find((e) => e.weeklyRank === 1)?.workerId ?? null;
  const [showForm, setShowForm] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ ...EMPTY_WORKER });
  const [editWorker, setEditWorker] = useState({ ...EMPTY_WORKER });
  const [deleteWorkerId, setDeleteWorkerId] = useState<string | null>(null);
  const [profileWorkerId, setProfileWorkerId] = useState<string | null>(null);

  function closeWorkerForm() {
    setShowForm(false);
    setNewWorker({ ...EMPTY_WORKER });
  }

  function closeEditWorker() {
    setEditWorkerId(null);
    setEditWorker({ ...EMPTY_WORKER });
  }

  function openEditWorker(worker: { id: string; name: string; username: string }) {
    const { firstName, lastName } = splitName(worker.name);
    setEditWorkerId(worker.id);
    setEditWorker({ firstName, lastName, username: worker.username, password: '' });
  }

  async function handleCreateWorker(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: `${newWorker.firstName} ${newWorker.lastName}`.trim(),
          username: newWorker.username,
          password: newWorker.password,
        }),
      });
      closeWorkerForm();
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    }
  }

  async function handleUpdateWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!editWorkerId) return;
    setError('');
    try {
      const payload: {
        id: string;
        name: string;
        username: string;
        password?: string;
      } = {
        id: editWorkerId,
        name: `${editWorker.firstName} ${editWorker.lastName}`.trim(),
        username: editWorker.username,
      };
      if (editWorker.password.trim()) {
        payload.password = editWorker.password;
      }
      await apiFetch('/api/users', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      closeEditWorker();
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    }
  }

  async function handleDeleteWorker() {
    if (!deleteWorkerId) return;
    setError('');
    try {
      await apiFetch(`/api/users?id=${deleteWorkerId}`, { method: 'DELETE' });
      setDeleteWorkerId(null);
      await loadData({ silent: true });
      showToast('success', t('toast.saved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    }
  }

  return (
    <>
      <PageHeader
        title={t('dashboard.workersTitle')}
        actions={<Button onClick={() => setShowForm(true)}>+ {t('admin.addWorker')}</Button>}
      />

      {error && (
        <p className="mb-4 rounded-xl bg-deadline-red/10 px-4 py-3 text-sm text-deadline-red">{error}</p>
      )}

      <Modal open={showForm} title={t('admin.newWorker')} onClose={closeWorkerForm} size="lg">
        <form onSubmit={handleCreateWorker}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('common.firstName')} required value={newWorker.firstName} onChange={(e) => setNewWorker({ ...newWorker, firstName: e.target.value })} />
            <Input label={t('common.lastName')} required value={newWorker.lastName} onChange={(e) => setNewWorker({ ...newWorker, lastName: e.target.value })} />
            <Input label={t('common.login')} required value={newWorker.username} onChange={(e) => setNewWorker({ ...newWorker, username: e.target.value })} />
            <Input label={t('common.password')} type="password" required value={newWorker.password} onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">{t('common.save')}</Button>
            <Button variant="outline" type="button" onClick={closeWorkerForm}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editWorkerId} title={t('admin.editWorker')} onClose={closeEditWorker} size="lg">
        <form onSubmit={handleUpdateWorker}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('common.firstName')} required value={editWorker.firstName} onChange={(e) => setEditWorker({ ...editWorker, firstName: e.target.value })} />
            <Input label={t('common.lastName')} required value={editWorker.lastName} onChange={(e) => setEditWorker({ ...editWorker, lastName: e.target.value })} />
            <Input label={t('common.login')} required value={editWorker.username} onChange={(e) => setEditWorker({ ...editWorker, username: e.target.value })} />
            <div className="sm:col-span-2">
              <Input
                label={t('admin.newPassword')}
                type="password"
                value={editWorker.password}
                onChange={(e) => setEditWorker({ ...editWorker, password: e.target.value })}
                placeholder={t('admin.newPasswordHint')}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">{t('common.save')}</Button>
            <Button variant="outline" type="button" onClick={closeEditWorker}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : workers.length === 0 ? (
        <EmptyState
          title={t('dashboard.workersEmpty')}
          description={t('dashboard.workersEmptyDesc')}
          action={<Button onClick={() => setShowForm(true)}>+ {t('admin.addWorker')}</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm dark:ring-1 dark:ring-metallic-green/15">
          <div className="hidden grid-cols-12 border-b border-app-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted sm:grid">
            <div className="col-span-3">{t('dashboard.nameCol')}</div>
            <div className="col-span-2">{t('dashboard.loginCol')}</div>
            <div className="col-span-2">Reyting</div>
            <div className="col-span-2">{t('rating.weeklyRank')}</div>
            <div className="col-span-1">{t('dashboard.activeCol')}</div>
            <div className="col-span-2 text-right">{t('dashboard.actionCol')}</div>
          </div>
          {sortedWorkers.map((w) => {
            const count = projects.filter(
              (p) => p.assignedTo === w.id && isInProgressStatus(p.status),
            ).length;
            const workerRating = allRatings.find((r) => r.workerId === w.id);
            const weeklyEntry = leaderboard.find((l) => l.workerId === w.id);
            const isLeader = w.id === leaderId;
            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => setProfileWorkerId(w.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setProfileWorkerId(w.id);
                  }
                }}
                className={`grid cursor-pointer items-center gap-2 border-b border-app-border px-5 py-4 transition last:border-0 hover:bg-app-bg/60 sm:grid-cols-12 ${isLeader ? 'bg-yellow-50/60 dark:bg-yellow-900/10' : ''}`}
              >
                <div className="sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-app-text">{w.name}</p>
                    {isLeader && <span title={t('rating.weeklyLeader')}>🏆</span>}
                  </div>
                  {w.telegramId && (
                    <p className="text-xs text-app-muted">Telegram: {w.telegramId}</p>
                  )}
                </div>
                <p className="text-sm text-app-muted sm:col-span-2">@{w.username}</p>
                <div className="sm:col-span-2">
                  <StarRating rating={workerRating?.rating ?? 0} size="sm" />
                </div>
                <p className="text-sm sm:col-span-2">
                  {weeklyEntry?.weeklyRank != null ? (
                    <span className={`font-semibold ${weeklyEntry.weeklyRank === 1 ? 'text-green-600 dark:text-green-400' : 'text-app-text'}`}>
                      {formatWeeklyRank(weeklyEntry.weeklyRank, locale)}
                    </span>
                  ) : (
                    <span className="text-app-muted">—</span>
                  )}
                </p>
                <p className="text-sm sm:col-span-1">{count} {t('dashboard.countUnit')}</p>
                <div
                  className="flex flex-wrap justify-end gap-2 sm:col-span-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Button variant="outline" size="sm" onClick={() => openEditWorker(w)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteWorkerId(w.id)}>
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteWorkerId}
        title={t('admin.confirmDeleteWorker')}
        message={(() => {
          const w = workers.find((worker) => worker.id === deleteWorkerId);
          return w ? `${w.name} (@${w.username})` : '';
        })()}
        onConfirm={handleDeleteWorker}
        onCancel={() => setDeleteWorkerId(null)}
      />

      <WorkerProfileModal
        workerId={profileWorkerId}
        workers={workers}
        onClose={() => setProfileWorkerId(null)}
        onUpdated={() => loadData({ silent: true })}
      />
    </>
  );
}
