import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { settlePreviousMonth } from '@/lib/monthlyWinners';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

function secretsMatch(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, 'utf-8');
    const b = Buffer.from(expected, 'utf-8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function authorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  if (cronSecret && auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (secretsMatch(token, cronSecret)) return true;
  }
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
