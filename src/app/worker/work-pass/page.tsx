'use client';

import Link from 'next/link';
import { DesignPassPanel } from '@/components/DesignPassPanel';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonPage } from '@/components/Skeleton';
import { Button } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import { useWorkerData } from '@/hooks/useWorkerData';

export default function WorkerWorkPassPage() {
  const { t } = useAppSettings();
  const { gamification, loading } = useWorkerData();

  if (loading) return <SkeletonPage />;

  return (
    <div className="pb-4 sm:pb-6">
      <PageHeader
        title={t('designPass.brand')}
        actions={
          <Link href="/worker/leaderboard">
            <Button variant="outline">{t('nav.leaderboard')}</Button>
          </Link>
        }
      />

      {gamification?.designPass ? (
        <DesignPassPanel designPass={gamification.designPass} />
      ) : (
        <p className="text-sm text-app-muted">{t('common.loading')}</p>
      )}
    </div>
  );
}
