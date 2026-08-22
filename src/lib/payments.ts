import { v4 as uuidv4 } from 'uuid';
import type { DataStore, Payment, Project } from '@/types';

export const ADVANCE_PAYMENT_NOTE = 'Avans';

export function getPaymentsForProject(store: DataStore, projectId: string): Payment[] {
  return (store.payments ?? [])
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
}

export function getTotalPaid(store: DataStore, projectId: string): number {
  return getPaymentsForProject(store, projectId).reduce((sum, p) => sum + p.amount, 0);
}

export function getTotalPaidFromList(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function getRemainingPrice(
  project: Pick<Project, 'price'>,
  payments: Payment[],
): number | null {
  if (project.price == null || project.price <= 0) return null;
  const paid = getTotalPaidFromList(payments);
  return Math.max(0, project.price - paid);
}

export function isFullyPaid(project: Pick<Project, 'price'>, payments: Payment[]): boolean {
  if (project.price == null || project.price <= 0) return false;
  const remaining = getRemainingPrice(project, payments);
  return remaining != null && remaining <= 0;
}

export function ensureAdvancePayment(store: DataStore, project: Project): void {
  if (!store.payments) store.payments = [];
  if (!project.advancePaid || !project.advanceAmount || project.advanceAmount <= 0) return;

  const existing = store.payments.find(
    (p) => p.projectId === project.id && p.note === ADVANCE_PAYMENT_NOTE,
  );
  if (existing) {
    existing.amount = project.advanceAmount;
    return;
  }

  store.payments.push({
    id: uuidv4(),
    projectId: project.id,
    amount: project.advanceAmount,
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
