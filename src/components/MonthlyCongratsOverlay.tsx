'use client';

import { useEffect } from 'react';
import { FireworksField } from '@/components/atmosphere/FireworksField';
import { Button } from '@/components/ui';
import { useAppSettings } from '@/context/AppSettingsContext';
import type { PendingCongrats } from '@/types';

const MEDAL: Record<1 | 2 | 3, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface MonthlyCongratsOverlayProps {
  pending: PendingCongrats;
  onClose: () => void;
}

export function MonthlyCongratsOverlay({ pending, onClose }: MonthlyCongratsOverlayProps) {
  const { t } = useAppSettings();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 xs:p-4">
      <div className="pointer-events-none absolute inset-0">
        <FireworksField autoPlay />
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-app-card/95 p-5 text-center shadow-2xl backdrop-blur-xl xs:rounded-3xl xs:p-8">
        <p className="text-5xl xs:text-6xl" aria-hidden>
          {MEDAL[pending.rank]}
        </p>
        <h2 className="mt-4 font-display text-xl font-semibold text-app-text xs:text-2xl">
          {t(`leaderboard.congratsTitle${pending.rank}`)}
        </h2>
        <p className="mt-2 text-sm text-app-muted">
          {t('leaderboard.congratsDesc')
            .replace('{rank}', String(pending.rank))
            .replace('{points}', String(pending.totalPoints))}
        </p>
        <Button className="mt-6 w-full" onClick={onClose}>
          {t('leaderboard.congratsClose')}
        </Button>
      </div>
    </div>
  );
}
