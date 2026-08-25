import { NextRequest, NextResponse } from 'next/server';
import { availableMonthKeys, maybeSettleMonthlyWinners, monthKey, parseMonthKey } from '@/lib/monthlyWinners';
import { getMonthlyLeaderboard } from '@/lib/rating';
import { enrichLeaderboardEntries, getHallOfFame } from '@/lib/workerGamification';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
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

    const requested = request.nextUrl.searchParams.get('month');
    const month = requested && parseMonthKey(requested) ? requested : monthKey();
    const entries = enrichLeaderboardEntries(store, getMonthlyLeaderboard(store, month));
    const hallOfFame = getHallOfFame(store).filter((entry) => entry.firstPlaceWins > 0);

    return NextResponse.json({
      month,
      months: availableMonthKeys(store),
      entries,
      hallOfFame,
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
