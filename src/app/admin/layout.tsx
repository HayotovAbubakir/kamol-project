'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AppShell } from '@/components/AppShell';
import { AdminDataProvider } from '@/context/AdminDataContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="admin">
      <AdminDataProvider>
        <AppShell role="admin">{children}</AppShell>
      </AdminDataProvider>
    </AuthGuard>
  );
}
