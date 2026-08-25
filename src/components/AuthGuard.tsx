'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearSession, saveSession } from '@/lib/auth';
import type { SessionUser } from '@/types';

interface AuthGuardProps {
  role: 'admin' | 'worker';
  children: React.ReactNode;
}

export function AuthGuard({ role, children }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    // httpOnly cookie orqali tekshirish — refreshda ham sessiya saqlanadi.
    apiFetch<{ user: SessionUser }>('/api/auth')
      .then((res) => {
        if (cancelled) return;
        saveSession(res.user);
        setSession(res.user);
        setChecked(true);
        if (res.user.role !== role) {
          router.replace(res.user.role === 'admin' ? '/admin' : '/worker');
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setSession(null);
        setChecked(true);
        router.replace('/');
      });

    return () => {
      cancelled = true;
    };
  }, [role, router]);

  if (!checked || !session || session.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-app-accent/20 border-t-app-accent" />
          <div className="absolute inset-1.5 animate-spin rounded-full border-2 border-transparent border-b-app-accent/50" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
