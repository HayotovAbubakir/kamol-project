'use client';

import { useEffect, useState } from 'react';
import type { ProjectStatus } from '@/types';
import {
  formatOrderDate,
  formatOrderElapsed,
  getDaysSinceOrder,
  isTerminalStatus,
} from '@/lib/utils';

interface OrderDateDisplayProps {
  orderDate: string;
  daysLabel: string;
  status?: ProjectStatus;
  completedAt?: string;
}

export function OrderDateDisplay({
  orderDate,
  daysLabel,
  status,
  completedAt,
}: OrderDateDisplayProps) {
  const days = getDaysSinceOrder(orderDate);
  const isFrozen = status != null && isTerminalStatus(status);
  const endAt = isFrozen && completedAt ? completedAt : undefined;

  const [elapsed, setElapsed] = useState(() => formatOrderElapsed(orderDate, endAt));

  useEffect(() => {
    if (isFrozen) {
      setElapsed(formatOrderElapsed(orderDate, endAt));
      return;
    }

    const tick = () => setElapsed(formatOrderElapsed(orderDate));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [orderDate, isFrozen, endAt]);

  return (
    <>
      {formatOrderDate(orderDate)}
      <span className="text-app-muted"> · {days} {daysLabel}</span>
      <span className="text-app-accent tabular-nums"> · {elapsed}</span>
    </>
  );
}
