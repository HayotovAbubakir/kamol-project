'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/AppShell';
import { WorkerDataProvider } from '@/context/WorkerDataContext';
import { ReturnedProjectAlertSound } from '@/components/ReturnedProjectAlertSound';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="worker">
      <WorkerDataProvider>
        <ReturnedProjectAlertSound />
        <AppShell role="worker">{children}</AppShell>
      </WorkerDataProvider>
    </AuthGuard>
  );
}
