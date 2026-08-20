import { NextResponse } from 'next/server';
import { resetStore } from '@/lib/store';

export async function POST() {
  try {
    await resetStore();
    return NextResponse.json({
      ok: true,
      message: 'Admin: admin / admin123. Ishchi: worker / worker123',
    });
  } catch {
    return NextResponse.json({ error: 'Xatolik' }, { status: 500 });
  }
}
