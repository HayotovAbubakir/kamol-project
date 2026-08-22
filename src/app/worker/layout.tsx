'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/AppShell';
import { WorkerDataProvider, useWorkerData } from '@/context/WorkerDataContext';
import { ReturnedProjectAlertSound } from '@/components/ReturnedProjectAlertSound';
import { MonthlyCongratsOverlay } from '@/components/MonthlyCongratsOverlay';

function WorkerShell({ children }: { children: React.ReactNode }) {
  const { pendingCongrats, dismissCongrats } = useWorkerData();
  return (
    <>
      <ReturnedProjectAlertSound />
      {pendingCongrats && (
        <MonthlyCongratsOverlay pending={pendingCongrats} onClose={dismissCongrats} />
      )}
      <AppShell role="worker">{children}</AppShell>
    </>
  );
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="worker">
      <WorkerDataProvider>
        <WorkerShell>{children}</WorkerShell>
      </WorkerDataProvider>
    </AuthGuard>
  );
}
