import { NextRequest, NextResponse } from 'next/server';
import { resetStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    await resetStore();
    return NextResponse.json({
      ok: true,
      message: 'Admin yaratildi: admin / admin123. Ishchilarni admin paneldan qo\'shing.',
    });
  } catch {
    return NextResponse.json({ error: 'Xatolik' }, { status: 500 });
  }
}
