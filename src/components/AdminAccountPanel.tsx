'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useToast } from '@/context/ToastContext';
import { apiFetch, getSession, saveSession } from '@/lib/auth';

interface AccountData {
  id: string;
  username: string;
  name: string;
}

export function AdminAccountPanel() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ account: AccountData }>('/api/admin/account');
      setUsername(res.account.username);
      setName(res.account.name);
    } catch {
      const session = getSession();
      if (session) {
        setUsername(session.username);
        setName(session.name);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ account: AccountData }>('/api/admin/account', {
        method: 'PATCH',
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          currentPassword: currentPassword || undefined,
          password: newPassword || undefined,
        }),
      });

      const session = getSession();
      if (session) {
        saveSession({
          ...session,
          username: res.account.username,
          name: res.account.name,
        });
      }

      setCurrentPassword('');
      setNewPassword('');
      showToast('success', t('toast.saved'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-app-border bg-app-card p-4 shadow-sm dark:ring-1 dark:ring-metallic-green/15 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-app-text">{t('settings.accountTitle')}</h2>
      <p className="mb-6 mt-1 text-sm text-app-muted">{t('settings.accountHint')}</p>

      {loading ? (
        <p className="text-sm text-app-muted">{t('common.loading')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('common.login')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label={t('settings.displayName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
          <Input
            label={t('settings.currentPassword')}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder={t('settings.currentPasswordPlaceholder')}
          />
          <Input
            label={t('settings.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t('settings.newPasswordPlaceholder')}
          />
          <p className="text-xs text-app-muted">{t('settings.passwordChangeHint')}</p>
          <div className="flex justify-end pt-1">
            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
