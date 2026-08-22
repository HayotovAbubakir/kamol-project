import { NextRequest, NextResponse } from 'next/server';
import { settlePreviousMonth } from '@/lib/monthlyWinners';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function authorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const session = await getSessionFromRequest(request);
  return Boolean(requireAdmin(session));
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const store = await readStore();
    const result = await settlePreviousMonth(store);
    if (result.changed) {
      await writeStore(result.store, {
        tables: ['monthly_winners', 'used_congrats_combos', 'monthly_settlements', 'notifications'],
      });
    }
    return NextResponse.json({ ok: true, settled: result.changed });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
