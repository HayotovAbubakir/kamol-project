'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StarRating } from '@/components/StarRating';
import { Button, Input, Modal, ConfirmModal, uiFieldLabelClass, uiInputGroupClass } from '@/components/ui';
import { SkeletonTable } from '@/components/Skeleton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { WorkerProfileModal } from '@/components/WorkerProfileModal';
import { apiFetch } from '@/lib/auth';
import { cn, isInProgressStatus, extractUzbekMobileDigits, formatPhoneInput, formatWeeklyRank } from '@/lib/utils';
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy';

const EMPTY_WORKER = {
  firstName: '',
  lastName: '',
  username: '',
  password: '',
  phone: '',
};

function formatPhoneField(value: string): string {
  const digits = extractUzbekMobileDigits(value) ?? value.replace(/\D/g, '').slice(0, 9);
  return formatPhoneInput(digits);
}

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

  const leaderboardOrder = useMemo(() => {
    const map = new Map<string, number>();
    leaderboard.forEach((entry, idx) => map.set(entry.workerId, idx));
    return map;
  }, [leaderboard]);

  const sortedWorkers = useMemo(
    () =>
      [...workers].sort((a, b) => {
        const aOrder = leaderboardOrder.get(a.id) ?? 999;
        const bOrder = leaderboardOrder.get(b.id) ?? 999;
        return aOrder - bOrder;
      }),
    [workers, leaderboardOrder],
  );

  const leaderId = useMemo(
    () => leaderboard.find((e) => e.weeklyRank === 1)?.workerId ?? null,
    [leaderboard],
  );

  const activeCountByWorker = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      if (!p.assignedTo || !isInProgressStatus(p.status)) continue;
      map.set(p.assignedTo, (map.get(p.assignedTo) ?? 0) + 1);
    }
    return map;
  }, [projects]);

  const ratingByWorker = useMemo(() => {
    const map = new Map<string, (typeof allRatings)[number]>();
    for (const r of allRatings) map.set(r.workerId, r);
    return map;
  }, [allRatings]);

  const leaderboardByWorker = useMemo(() => {
    const map = new Map<string, (typeof leaderboard)[number]>();
    for (const l of leaderboard) map.set(l.workerId, l);
    return map;
  }, [leaderboard]);
  const [showForm, setShowForm] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ ...EMPTY_WORKER });
  const [editWorker, setEditWorker] = useState({ ...EMPTY_WORKER });
  const [deleteWorkerId, setDeleteWorkerId] = useState<string | null>(null);
  const [profileWorkerId, setProfileWorkerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function closeWorkerForm() {
    setShowForm(false);
    setNewWorker({ ...EMPTY_WORKER });
  }

  function closeEditWorker() {
    setEditWorkerId(null);
    setEditWorker({ ...EMPTY_WORKER });
  }

  function openEditWorker(worker: { id: string; name: string; username: string; phone?: string }) {
    const { firstName, lastName } = splitName(worker.name);
    const digits = extractUzbekMobileDigits(worker.phone ?? '') ?? '';
    setEditWorkerId(worker.id);
    setEditWorker({ firstName, lastName, username: worker.username, password: '', phone: formatPhoneInput(digits) });
  }

  async function handleCreateWorker(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const firstName = newWorker.firstName.trim();
    const lastName = newWorker.lastName.trim();
    const username = newWorker.username.trim();
    const password = newWorker.password;
    const phone = extractUzbekMobileDigits(newWorker.phone);
    if (!firstName || !username || !password.trim() || !phone) {
      const msg = t('admin.workerRequiredFields');
      setError(msg);
      showToast('error', msg);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim(),
          username,
          password,
          phone,
        }),
      });
      closeWorkerForm();
      await loadData({ silent: true });
      showToast('success', t('toast.created'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!editWorkerId || busy) return;
    const firstName = editWorker.firstName.trim();
    const lastName = editWorker.lastName.trim();
    const username = editWorker.username.trim();
    const phone = extractUzbekMobileDigits(editWorker.phone);
    if (!firstName || !username || !phone) {
      const msg = t('admin.workerEditRequiredFields');
      setError(msg);
      showToast('error', msg);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload: {
        id: string;
        firstName: string;
        lastName: string;
        name: string;
        username: string;
        password?: string;
        phone: string;
      } = {
        id: editWorkerId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        username,
        phone,
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
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteWorker() {
    if (!deleteWorkerId || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/api/users?id=${deleteWorkerId}`, { method: 'DELETE' });
      setDeleteWorkerId(null);
      await loadData({ silent: true });
      showToast('success', t('toast.deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      showToast('error', msg);
    } finally {
      setBusy(false);
    }
  }

  const canCreateWorker = Boolean(
    newWorker.firstName.trim() &&
      newWorker.username.trim() &&
      newWorker.password.trim().length >= MIN_PASSWORD_LENGTH &&
      extractUzbekMobileDigits(newWorker.phone),
  );
  const canEditWorker = Boolean(
    editWorker.firstName.trim() &&
      editWorker.username.trim() &&
      extractUzbekMobileDigits(editWorker.phone),
  );

  return (
    <>
      <PageHeader
        title={t('dashboard.workersTitle')}
        description={t('dashboard.workersDesc')}
        actions={<Button onClick={() => setShowForm(true)}>+ {t('admin.addWorker')}</Button>}
      />

      {error && (
        <p className="mb-4 rounded-xl bg-deadline-red/10 px-4 py-3 text-sm text-deadline-red">{error}</p>
      )}

      <Modal open={showForm} title={t('admin.newWorker')} onClose={closeWorkerForm} size="lg">
        <form onSubmit={handleCreateWorker}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('common.firstName')} required value={newWorker.firstName} onChange={(e) => setNewWorker({ ...newWorker, firstName: e.target.value })} />
            <Input label={t('common.lastName')} value={newWorker.lastName} onChange={(e) => setNewWorker({ ...newWorker, lastName: e.target.value })} />
            <Input label={t('common.login')} required value={newWorker.username} onChange={(e) => setNewWorker({ ...newWorker, username: e.target.value })} autoComplete="off" />
            <div>
              <label className={uiFieldLabelClass}>{t('admin.phone')}</label>
              <WorkerPhoneInput
                value={newWorker.phone}
                onChange={(phone) => setNewWorker({ ...newWorker, phone })}
                placeholder={t('admin.phonePlaceholder')}
              />
            </div>
            <Input
              label={t('common.password')}
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={newWorker.password}
              onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 xs:flex-row">
            <Button type="submit" disabled={busy || !canCreateWorker}>
              {busy ? t('common.creating') : t('admin.addWorker')}
            </Button>
            <Button variant="outline" type="button" onClick={closeWorkerForm} disabled={busy}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editWorkerId} title={t('admin.editWorker')} onClose={closeEditWorker} size="lg">
        <form onSubmit={handleUpdateWorker}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('common.firstName')} required value={editWorker.firstName} onChange={(e) => setEditWorker({ ...editWorker, firstName: e.target.value })} />
            <Input label={t('common.lastName')} value={editWorker.lastName} onChange={(e) => setEditWorker({ ...editWorker, lastName: e.target.value })} />
            <Input label={t('common.login')} required value={editWorker.username} onChange={(e) => setEditWorker({ ...editWorker, username: e.target.value })} autoComplete="off" />
            <div>
              <label className={uiFieldLabelClass}>{t('admin.phone')}</label>
              <WorkerPhoneInput
                value={editWorker.phone}
                onChange={(phone) => setEditWorker({ ...editWorker, phone })}
                placeholder={t('admin.phonePlaceholder')}
              />
            </div>
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
          <div className="mt-4 flex flex-col gap-2 xs:flex-row">
            <Button type="submit" disabled={busy || !canEditWorker}>
              {busy ? t('common.saving') : t('common.save')}
            </Button>
            <Button variant="outline" type="button" onClick={closeEditWorker} disabled={busy}>{t('common.cancel')}</Button>
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
          <div className="hidden grid-cols-12 border-b border-app-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted md:grid">
            <div className="col-span-3">{t('dashboard.nameCol')}</div>
            <div className="col-span-2">{t('dashboard.loginCol')}</div>
            <div className="col-span-2">Reyting</div>
            <div className="col-span-2">{t('rating.weeklyRank')}</div>
            <div className="col-span-1">{t('dashboard.activeCol')}</div>
            <div className="col-span-2 text-right">{t('dashboard.actionCol')}</div>
          </div>
          {sortedWorkers.map((w) => {
            const count = activeCountByWorker.get(w.id) ?? 0;
            const workerRating = ratingByWorker.get(w.id);
            const weeklyEntry = leaderboardByWorker.get(w.id);
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
                className={`grid cursor-pointer items-center gap-2 border-b border-app-border px-4 py-4 transition last:border-0 hover:bg-app-bg/60 md:grid-cols-12 md:px-5 ${isLeader ? 'bg-yellow-50/60 dark:bg-yellow-900/10' : ''}`}
              >
                <div className="md:col-span-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 break-words font-medium text-app-text">{w.name}</p>
                    {isLeader && <span title={t('rating.weeklyLeader')}>🏆</span>}
                  </div>
                  {w.telegramId && (
                    <p className="text-xs text-app-muted">Telegram: {w.telegramId}</p>
                  )}
                </div>
                <p className="text-sm text-app-muted md:col-span-2">@{w.username}</p>
                <div className="md:col-span-2">
                  <StarRating rating={workerRating?.rating ?? 0} size="sm" />
                </div>
                <p className="text-sm md:col-span-2">
                  <span className="mr-1 text-xs text-app-muted md:hidden">{t('rating.weeklyRank')}:</span>
                  {weeklyEntry?.weeklyRank != null ? (
                    <span className={`font-semibold ${weeklyEntry.weeklyRank === 1 ? 'text-green-600 dark:text-green-400' : 'text-app-text'}`}>
                      {formatWeeklyRank(weeklyEntry.weeklyRank, locale)}
                    </span>
                  ) : (
                    <span className="text-app-muted">—</span>
                  )}
                </p>
                <p className="text-sm md:col-span-1">
                  <span className="mr-1 text-xs text-app-muted md:hidden">{t('dashboard.activeCol')}:</span>
                  {count} {t('dashboard.countUnit')}
                </p>
                <div
                  className="flex flex-wrap justify-start gap-2 md:col-span-2 md:justify-end [&>button]:flex-1 md:[&>button]:flex-none"
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

function WorkerPhoneInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className={cn(uiInputGroupClass, 'mt-1.5')}>
      <span className="select-none pl-3 text-sm text-app-muted">+998</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required
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
