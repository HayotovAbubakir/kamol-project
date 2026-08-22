import { v4 as uuidv4 } from 'uuid';
import {
  buildCongratsText,
  comboKey,
  formatCongratsMonth,
  pickFreshCombo,
} from '@/lib/congratsMessages';
import { monthKey, parseMonthKey, previousMonthKey, trailingMonthKeys } from '@/lib/monthKey';
import { getMonthlyLeaderboard } from '@/lib/rating';
import { sendSms } from '@/lib/sms';
import type { DataStore, MonthlyWinner, UsedCongratsCombo } from '@/types';

export { monthKey, parseMonthKey, previousMonthKey } from '@/lib/monthKey';

export function monthStartIso(key: string): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return new Date().toISOString();
  return new Date(parsed.year, parsed.month - 1, 1).toISOString();
}

export function availableMonthKeys(store: DataStore, now: Date = new Date()): string[] {
  const extra: string[] = [];
  extra.push(monthKey(now));
  for (const entry of store.ratingEntries ?? []) {
    extra.push(monthKey(new Date(entry.createdAt)));
  }
  for (const winner of store.monthlyWinners ?? []) {
    extra.push(winner.month);
  }
  return trailingMonthKeys(18, extra, now);
}

function settlementDue(now: Date): boolean {
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 5, 0, 0);
  return now.getTime() >= first.getTime();
}

export async function settlePreviousMonth(
  store: DataStore,
  now: Date = new Date(),
): Promise<{ store: DataStore; changed: boolean }> {
  if (!store.monthlyWinners) store.monthlyWinners = [];
  if (!store.usedCongratsCombos) store.usedCongratsCombos = [];
  if (!store.monthlySettlements) store.monthlySettlements = [];
  if (!store.monthlyWinnerViews) store.monthlyWinnerViews = [];

  if (!settlementDue(now)) return { store, changed: false };

  const month = previousMonthKey(now);
  if (store.monthlySettlements.some((s) => s.month === month)) {
    return { store, changed: false };
  }

  const board = getMonthlyLeaderboard(store, month).filter((e) => e.monthlyPoints > 0);
  const top = board.slice(0, 3);
  const nowIso = now.toISOString();

  for (const entry of top) {
    const rank = entry.rank as 1 | 2 | 3;
    const winner: MonthlyWinner = {
      id: uuidv4(),
      workerId: entry.workerId,
      month,
      rank,
      totalPoints: entry.monthlyPoints,
      createdAt: nowIso,
    };
    store.monthlyWinners.push(winner);

    const worker = store.users.find((u) => u.id === entry.workerId);
    const recentKeys = (store.usedCongratsCombos ?? [])
      .filter((u) => u.workerId === entry.workerId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((u) => comboKey({ a: u.aIndex, b: u.bIndex, c: u.cIndex }));
    const combo = pickFreshCombo(rank, recentKeys);
    const text = buildCongratsText(combo, rank, {
      ism: worker?.name ?? 'Ishchi',
      ball: entry.monthlyPoints,
      oy: formatCongratsMonth(month),
      orin: rank,
    });

    const used: UsedCongratsCombo = {
      id: uuidv4(),
      workerId: entry.workerId,
      rank,
      aIndex: combo.a,
      bIndex: combo.b,
      cIndex: combo.c,
      month,
      createdAt: nowIso,
    };
    store.usedCongratsCombos.push(used);

    store.notifications.unshift({
      id: uuidv4(),
      userId: entry.workerId,
      message: text,
      createdAt: nowIso,
      read: false,
      type: 'info',
      event: 'monthly_winner',
    });

    await sendSms(worker?.phone, text);
  }

  store.monthlySettlements.push({ id: uuidv4(), month, settledAt: nowIso });
  return { store, changed: true };
}

let lastMonthlySyncAt = 0;
const MONTHLY_SYNC_MS = 60_000;

export async function maybeSettleMonthlyWinners(
  store: DataStore,
): Promise<{ store: DataStore; changed: boolean }> {
  if (Date.now() - lastMonthlySyncAt < MONTHLY_SYNC_MS) {
    return { store, changed: false };
  }
  const result = await settlePreviousMonth(store);
  lastMonthlySyncAt = Date.now();
  return result;
}

export function getPendingCongrats(store: DataStore, workerId: string) {
  const latest = [...(store.monthlySettlements ?? [])].sort((a, b) =>
    b.month.localeCompare(a.month),
  )[0];
  if (!latest) return null;
  const seen = (store.monthlyWinnerViews ?? []).some(
    (v) => v.workerId === workerId && v.month === latest.month,
  );
  if (seen) return null;
  const winner = (store.monthlyWinners ?? []).find(
    (w) => w.workerId === workerId && w.month === latest.month,
  );
  if (!winner) return null;
  return {
    month: winner.month,
    rank: winner.rank,
    totalPoints: winner.totalPoints,
  };
}

export function markCongratsSeen(store: DataStore, workerId: string, month: string): boolean {
  if (!store.monthlyWinnerViews) store.monthlyWinnerViews = [];
  if (store.monthlyWinnerViews.some((v) => v.workerId === workerId && v.month === month)) {
    return false;
  }
  store.monthlyWinnerViews.push({
    id: uuidv4(),
    workerId,
    month,
    seenAt: new Date().toISOString(),
  });
  return true;
}
