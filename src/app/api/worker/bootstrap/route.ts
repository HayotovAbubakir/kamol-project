import { NextRequest, NextResponse } from 'next/server';
import { getWorkerRating } from '@/lib/rating';
import { maybeSettleMonthlyWinners, getPendingCongrats } from '@/lib/monthlyWinners';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAuth } from '@/lib/session';
import {
  isInProgressStatus,
  sortReturnedProjects,
  sortWorkerActiveProjects,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session) || session!.role !== 'worker') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    let store = await readStore();
    const settled = await maybeSettleMonthlyWinners(store);
    if (settled.changed) {
      await writeStore(settled.store, {
        tables: ['monthly_winners', 'used_congrats_combos', 'monthly_settlements', 'notifications'],
      });
    }
    store = settled.store;
    const workerId = session!.id;

    const mine = store.projects.filter((p) => p.assignedTo === workerId);

    const activeProjects = sortWorkerActiveProjects(
      mine.filter((p) => isInProgressStatus(p.status)),
    );
    const completedCount = mine.filter((p) => p.status === 'completed' || p.status === 'pending_review').length;
    const returnedProjects = sortReturnedProjects(mine.filter((p) => p.returnedAt != null));

    const comments = (store.comments ?? []).filter((c) => c.workerId === workerId);
    const rating = getWorkerRating(workerId, store.ratingEntries ?? []);
    const notifications = store.notifications
      .filter((n) => n.userId === workerId || n.userId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return NextResponse.json(
      {
        activeProjects,
        completedCount,
        returnedProjects,
        comments,
        rating,
        notifications,
        pendingCongrats: getPendingCongrats(store, workerId),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error('[api/worker/bootstrap]', err);
    const message = err instanceof Error ? err.message : 'Server xatoligi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
