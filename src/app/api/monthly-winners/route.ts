import { NextRequest, NextResponse } from 'next/server';
import { getPendingCongrats, markCongratsSeen } from '@/lib/monthlyWinners';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session) || session!.role !== 'worker') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const store = await readStore();
    return NextResponse.json({ pending: getPendingCongrats(store, session!.id) });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session) || session!.role !== 'worker') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const month = typeof body?.month === 'string' ? body.month : '';
    if (!month) {
      return NextResponse.json({ error: 'month kerak' }, { status: 400 });
    }

    const store = await readStore();
    const changed = markCongratsSeen(store, session!.id, month);
    if (changed) {
      await writeStore(store, { tables: ['monthly_winner_views'] });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
