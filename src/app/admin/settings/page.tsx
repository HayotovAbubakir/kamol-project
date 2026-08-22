'use client';

import { PageHeader } from '@/components/PageHeader';
import { AppearancePanel } from '@/components/AppearancePanel';
import { AdminAccountPanel } from '@/components/AdminAccountPanel';
import { AdminManagementPanel } from '@/components/AdminManagementPanel';
import { useAppSettings } from '@/context/AppSettingsContext';

export default function AdminSettingsPage() {
  const { t } = useAppSettings();

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <div className="mx-auto max-w-3xl space-y-6 pb-6">
        <AdminAccountPanel />
        <AdminManagementPanel />
        <AppearancePanel />
      </div>
    </>
  );
}
