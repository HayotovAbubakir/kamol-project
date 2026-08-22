'use client';

import { useMemo } from 'react';
import type { Payment } from '@/types';
import { useAppSettings } from '@/context/AppSettingsContext';
import { ADVANCE_PAYMENT_NOTE } from '@/lib/payments';
import { cn, formatDateTime, formatPrice } from '@/lib/utils';

interface PaymentHistoryListProps {
  payments: Payment[];
  className?: string;
  scrollable?: boolean;
}

export function PaymentHistoryList({
  payments,
  className,
  scrollable = true,
}: PaymentHistoryListProps) {
  const { t } = useAppSettings();

  const sorted = useMemo(
    () =>
      [...payments].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      ),
    [payments],
  );

  if (sorted.length === 0) return null;

  function paymentTypeLabel(note?: string) {
    if (note === ADVANCE_PAYMENT_NOTE) return t('project.advance');
    if (note?.trim()) return note.trim();
    return t('project.paymentRegular');
  }

  return (
    <div className={cn('rounded-xl border border-app-border bg-app-bg/60', className)}>
      <p className="border-b border-app-border/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-app-muted">
        {t('project.paymentHistory')}
      </p>
      <ul
        className={cn(
          'divide-y divide-app-border/60',
          scrollable && 'max-h-[200px] overflow-y-auto',
        )}
      >
        {sorted.map((payment) => (
          <li
            key={payment.id}
            className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium tabular-nums text-app-text">{formatDateTime(payment.paidAt)}</p>
              <p className="mt-0.5 truncate text-app-muted">{paymentTypeLabel(payment.note)}</p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-app-accent">
              {formatPrice(payment.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
