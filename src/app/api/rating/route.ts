import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { getWorkerRating, getWeeklyRanks } from '@/lib/rating';
import { getSessionFromRequest, requireAuth } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const store = await readStore();
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');

    if (workerId) {
      const rating = getWorkerRating(workerId, store.ratingEntries ?? []);
      return NextResponse.json({ rating });
    }

    const leaderboard = getWeeklyRanks(store);
    const allRatings = store.users
      .filter((u) => u.role === 'worker')
      .map((u) => getWorkerRating(u.id, store.ratingEntries ?? []));

    return NextResponse.json({ leaderboard, allRatings });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
