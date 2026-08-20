import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/store';
import { maybeSyncDeadlineNotifications } from '@/lib/notifications';
import { computeStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  try {
    let store = await readStore();
    const synced = maybeSyncDeadlineNotifications(store);
    if (synced.changed) {
      await writeStore(synced.store, { tables: ['notifications'] });
    }
    store = synced.store;

    return NextResponse.json(computeStats(store), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
