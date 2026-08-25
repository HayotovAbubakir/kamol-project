'use client';

import { PageHeader } from '@/components/PageHeader';
import { AppearancePanel } from '@/components/AppearancePanel';
import { useAppSettings } from '@/context/AppSettingsContext';

export default function WorkerSettingsPage() {
  const { t } = useAppSettings();

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="max-w-3xl pb-6">
        <AppearancePanel />
      </div>
    </>
  );
}
