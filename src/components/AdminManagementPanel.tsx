'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { apiFetch, getSession } from '@/lib/auth';

interface AdminSummary {
  id: string;
  name: string;
  username: string;
  createdBy: string | null;
  canDelete: boolean;
  canEdit: boolean;
}

const EMPTY_ADMIN = {
  name: '',
  username: '',
  password: '',
};

export function AdminManagementPanel() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
  const [editAdmin, setEditAdmin] = useState<AdminSummary | null>(null);
  const [newAdmin, setNewAdmin] = useState({ ...EMPTY_ADMIN });
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const session = getSession();

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ admins: AdminSummary[] }>('/api/admin/admins');
      setAdmins(res.admins);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  function closeForm() {
    setShowForm(false);
    setNewAdmin({ ...EMPTY_ADMIN });
  }

  function openEdit(admin: AdminSummary) {
    setEditAdmin(admin);
    setEditForm({ name: admin.name, username: admin.username, password: '' });
  }

  function closeEdit() {
    setEditAdmin(null);
    setEditForm({ name: '', username: '', password: '' });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(newAdmin),
      });
      closeForm();
      await loadAdmins();
      showToast('success', t('settings.adminAdded'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editAdmin || busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/admin/admins', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editAdmin.id,
          name: editForm.name,
          username: editForm.username,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      closeEdit();
      await loadAdmins();
      showToast('success', t('settings.adminUpdated'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAdmin() {
    if (!deleteAdminId || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/admins?id=${deleteAdminId}`, { method: 'DELETE' });
      setDeleteAdminId(null);
      await loadAdmins();
      showToast('success', t('settings.adminDeleted'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-app-border bg-app-card p-4 shadow-sm dark:ring-1 dark:ring-metallic-green/15 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-app-text">{t('settings.adminsTitle')}</h2>
          <p className="mt-1 text-sm text-app-muted">{t('settings.adminsHint')}</p>
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
          + {t('settings.addAdmin')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-app-muted">{t('common.loading')}</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-app-muted">{t('settings.noAdmins')}</p>
      ) : (
        <ul className="space-y-2">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border bg-app-bg/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-app-text">
                  {admin.name}
                  {session?.id === admin.id && (
                    <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-app-accent">
                      ({t('settings.you')})
                    </span>
                  )}
                </p>
                <p className="text-sm text-app-muted">{admin.username}</p>
              </div>
              {(admin.canEdit || admin.canDelete) && (
                <div className="flex flex-wrap gap-2">
                  {admin.canEdit && (
                    <Button type="button" variant="outline" onClick={() => openEdit(admin)}>
                      {t('common.edit')}
                    </Button>
                  )}
                  {admin.canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-deadline-red/40 text-deadline-red hover:bg-deadline-red/10"
                      onClick={() => setDeleteAdminId(admin.id)}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={showForm} title={t('settings.addAdmin')} onClose={closeForm}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={t('settings.displayName')}
            value={newAdmin.name}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label={t('common.login')}
            value={newAdmin.username}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, username: e.target.value }))}
            autoComplete="off"
            required
          />
          <Input
            label={t('common.password')}
            type="password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
            autoComplete="new-password"
            required
          />
          <div className="flex flex-col-reverse gap-2 pt-2 xs:flex-row xs:justify-end">
            <Button type="button" variant="outline" className="w-full xs:w-auto" onClick={closeForm}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="w-full xs:w-auto" disabled={busy}>
              {busy ? t('common.creating') : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editAdmin} title={t('settings.editAdmin')} onClose={closeEdit}>
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label={t('settings.displayName')}
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label={t('common.login')}
            value={editForm.username}
            onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
            autoComplete="off"
            required
          />
          <Input
            label={t('settings.newPassword')}
            type="password"
            value={editForm.password}
            onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
            autoComplete="new-password"
            placeholder={t('settings.newPasswordPlaceholder')}
          />
          <div className="flex flex-col-reverse gap-2 pt-2 xs:flex-row xs:justify-end">
            <Button type="button" variant="outline" className="w-full xs:w-auto" onClick={closeEdit}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="w-full xs:w-auto" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteAdminId}
        title={t('settings.confirmDeleteAdmin')}
        onClose={() => {
          if (!busy) setDeleteAdminId(null);
        }}
      >
        <p className="text-sm text-app-muted">{t('settings.confirmDeleteAdminHint')}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
          <Button type="button" variant="outline" className="w-full xs:w-auto" onClick={() => setDeleteAdminId(null)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="w-full bg-deadline-red hover:bg-deadline-red/90 xs:w-auto"
            onClick={handleDeleteAdmin}
            disabled={busy}
          >
            {busy ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
