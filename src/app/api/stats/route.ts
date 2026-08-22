import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/store';
import { maybeSyncDeadlineNotifications } from '@/lib/notifications';
import { computeStats } from '@/lib/stats';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

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
    if (synced.changed) {
      await writeStore(synced.store, { tables: ['notifications'] });
    }
    store = synced.store;

    return NextResponse.json(computeStats(store), { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server xatoligi';
    console.error('[api/stats]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
