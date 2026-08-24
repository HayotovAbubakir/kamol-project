import { NextRequest, NextResponse } from 'next/server';
import { resetStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 404 });
  }

  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    await resetStore();
    return NextResponse.json({
      ok: true,
      message: 'Ma\'lumotlar bazasi tozalandi. Yangi admin parolini server logida ko\'ring.',
    });
  } catch {
    return NextResponse.json({ error: 'Xatolik' }, { status: 500 });
  }
}
