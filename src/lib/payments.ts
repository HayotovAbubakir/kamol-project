import { v4 as uuidv4 } from 'uuid';
import type { DataStore, Payment, Project } from '@/types';

export const ADVANCE_PAYMENT_NOTE = 'Avans';

export function normalizeMoney(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export function getPaymentsForProject(store: DataStore, projectId: string): Payment[] {
  return (store.payments ?? [])
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
}

export function getTotalPaid(store: DataStore, projectId: string): number {
  return getPaymentsForProject(store, projectId).reduce((sum, p) => sum + (normalizeMoney(p.amount) ?? 0), 0);
}

export function getTotalPaidFromList(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + (normalizeMoney(p.amount) ?? 0), 0);
}

export function getRemainingPrice(
  project: Pick<Project, 'price'>,
  payments: Payment[],
): number | null {
  const price = normalizeMoney(project.price);
  if (price == null || price <= 0) return null;
  const paid = getTotalPaidFromList(payments);
  return Math.max(0, price - paid);
}

export function isFullyPaid(project: Pick<Project, 'price'>, payments: Payment[]): boolean {
  if (project.price == null || project.price <= 0) return false;
  const remaining = getRemainingPrice(project, payments);
  return remaining != null && remaining <= 0;
}

export type PaymentValidationResult =
  | { ok: true; remaining: number; amount: number }
  | { ok: false; error: string; remaining: number };

export function validatePaymentAmount(
  project: Pick<Project, 'price'>,
  payments: Payment[],
  amount: unknown,
): PaymentValidationResult {
  const price = normalizeMoney(project.price);
  if (price == null || price <= 0) {
    return { ok: false, error: 'Loyiha narxi kiritilmagan', remaining: 0 };
  }

  const paid = getTotalPaidFromList(payments);
  const remaining = Math.max(0, price - paid);
  const parsedAmount = normalizeMoney(amount);

  if (parsedAmount == null || parsedAmount <= 0) {
    return { ok: false, error: 'Summa noto\'g\'ri kiritilgan', remaining };
  }

  if (parsedAmount > remaining) {
    return {
      ok: false,
      error: `Kiritilgan summa qolgan summadan (${remaining.toLocaleString('uz-UZ')} so'm) katta`,
      remaining,
    };
  }

  return { ok: true, remaining, amount: parsedAmount };
}

export function ensureAdvancePayment(store: DataStore, project: Project): void {
  if (!store.payments) store.payments = [];

  const existingIdx = store.payments.findIndex(
    (p) => p.projectId === project.id && p.note === ADVANCE_PAYMENT_NOTE,
  );

  if (!project.advancePaid || !project.advanceAmount || project.advanceAmount <= 0) {
    if (existingIdx !== -1) {
      store.payments.splice(existingIdx, 1);
    }
    return;
  }

  const price = normalizeMoney(project.price);
  if (price == null || price <= 0) return;

  const projectPayments = getPaymentsForProject(store, project.id);
  const nonAdvancePaid = projectPayments
    .filter((p) => p.note !== ADVANCE_PAYMENT_NOTE)
    .reduce((sum, p) => sum + (normalizeMoney(p.amount) ?? 0), 0);

  const maxAdvance = Math.max(0, price - nonAdvancePaid);
  const requestedAdvance = normalizeMoney(project.advanceAmount) ?? 0;
  const advanceAmount = Math.min(requestedAdvance, maxAdvance);

  if (advanceAmount <= 0) {
    if (existingIdx !== -1) {
      store.payments.splice(existingIdx, 1);
    }
    return;
  }

  if (existingIdx !== -1) {
    store.payments[existingIdx].amount = advanceAmount;
    return;
  }

  store.payments.push({
    id: uuidv4(),
    projectId: project.id,
    amount: advanceAmount,
    paidAt: project.orderDate,
    note: ADVANCE_PAYMENT_NOTE,
  });
}

export function syncStoreAdvancePayments(store: DataStore): void {
  for (const project of store.projects) {
    ensureAdvancePayment(store, project);
  }
}

export function addPayment(
  store: DataStore,
  data: { projectId: string; amount: number; note?: string; paidAt?: string },
): Payment {
  if (!store.payments) store.payments = [];
  const payment: Payment = {
    id: uuidv4(),
    projectId: data.projectId,
    amount: data.amount,
    paidAt: data.paidAt ?? new Date().toISOString(),
    note: data.note?.trim() || undefined,
  };
  store.payments.push(payment);
  return payment;
}

export function getRejectionCount(store: DataStore, projectId: string): number {
  return (store.ratingEntries ?? []).filter(
    (e) => e.projectId === projectId && e.type === 'rejection',
  ).length;
}
