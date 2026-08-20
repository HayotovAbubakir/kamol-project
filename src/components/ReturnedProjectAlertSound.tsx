'use client';

import { useEffect, useRef } from 'react';
import { useWorkerDataOptional } from '@/context/WorkerDataContext';
import { playReturnedAlertSound, returnedSoundSessionKey } from '@/lib/returnedAlertSound';

/** Ishchi kirganda qaytgan loyiha bo'lsa, ogohlantirish ovozini 3 marta ijro etadi. */
export function ReturnedProjectAlertSound() {
  const data = useWorkerDataOptional();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!data || data.loading || startedRef.current) return;
    if (data.returnedProjects.length === 0) return;

    const storageKey = returnedSoundSessionKey(data.session.id);
    if (sessionStorage.getItem(storageKey)) return;

    startedRef.current = true;
    sessionStorage.setItem(storageKey, '1');
    void playReturnedAlertSound();
  }, [data]);

  return null;
}
