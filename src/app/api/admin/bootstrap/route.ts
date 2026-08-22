import { NextRequest, NextResponse } from 'next/server';
import { maybeSyncDeadlineNotifications } from '@/lib/notifications';
import { maybeSettleMonthlyWinners } from '@/lib/monthlyWinners';
import { getWorkerRating, getWeeklyRanks } from '@/lib/rating';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';
import { isInProgressStatus } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    let store = await readStore();
    const synced = maybeSyncDeadlineNotifications(store);
    const settled = await maybeSettleMonthlyWinners(synced.store);
    if (synced.changed || settled.changed) {
      await writeStore(settled.store, {
        tables: ['notifications', 'monthly_winners', 'used_congrats_combos', 'monthly_settlements'],
      });
    }
    store = settled.store;

    const projects = [...store.projects].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    );

    const workers = store.users
      .filter((u) => u.role === 'worker')
      .map(({ id, name, username, telegramId, phone }) => ({ id, name, username, telegramId, phone }));

    const notifications = store.notifications
      .filter((n) => n.userId === session!.id || n.userId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    const comments = store.comments ?? [];
    const leaderboard = getWeeklyRanks(store);
    const allRatings = workers.map((w) => getWorkerRating(w.id, store.ratingEntries ?? []));

    return NextResponse.json(
      {
        projects,
        workers,
        notifications,
        comments,
        payments: store.payments ?? [],
        ratingEntries: store.ratingEntries ?? [],
        leaderboard,
        allRatings,
        pendingCount: projects.filter((p) => p.status === 'pending').length,
        activeCount: projects.filter((p) => isInProgressStatus(p.status)).length,
        completedCount: projects.filter((p) => p.status === 'completed').length,
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error('[api/admin/bootstrap]', err);
    const message = err instanceof Error ? err.message : 'Server xatoligi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
