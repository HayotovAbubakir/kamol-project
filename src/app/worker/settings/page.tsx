'use client';

import { PageHeader } from '@/components/PageHeader';
import { AppearancePanel } from '@/components/AppearancePanel';
import { useAppSettings } from '@/context/AppSettingsContext';

export default function WorkerSettingsPage() {
  const { t } = useAppSettings();

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.appearanceHint')} />
      <div className="max-w-3xl">
        <AppearancePanel />
      </div>
    </>
  );
}
