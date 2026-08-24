'use client';

import { useEffect, useRef } from 'react';
import { useWorkerDataOptional } from '@/context/WorkerDataContext';
import { playReturnedAlertSound } from '@/lib/returnedAlertSound';

/** Qaytarilgan loyiha bo'lsa, sahifa ochilganda / refresh qilganda 3 ta ovoz ketma-ket. */
export function ReturnedProjectAlertSound() {
  const data = useWorkerDataOptional();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!data || data.loading || startedRef.current) return;
    if (data.returnedProjects.length === 0) return;

    startedRef.current = true;
    void playReturnedAlertSound();
  }, [data]);

  return null;
}
