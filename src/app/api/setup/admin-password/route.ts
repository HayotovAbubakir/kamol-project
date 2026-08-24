import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { getRuntimeEnvAsync, syncRuntimeEnvToProcessAsync } from '@/lib/runtimeEnv';
import { readStore, writeStore } from '@/lib/store';

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

/** Bir martalik admin parolini tiklash (SESSION_SECRET yoki CRON_SECRET bilan). */
export async function POST(request: NextRequest) {
  await syncRuntimeEnvToProcessAsync();

  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const sessionSecret = getRuntimeEnvAsync('SESSION_SECRET').then((v) => v ?? '');
  const cronSecret = getRuntimeEnvAsync('CRON_SECRET').then((v) => v ?? '');
  const [sessionKey, cronKey] = await Promise.all([sessionSecret, cronSecret]);

  const allowed =
    (sessionKey && token && secretsMatch(token, sessionKey)) ||
    (cronKey && token && secretsMatch(token, cronKey));

  if (!allowed) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  let body: { password?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON kerak' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  const username =
    typeof body.username === 'string' && body.username.trim()
      ? body.username.trim()
      : 'admin';

  if (password.length < 6) {
    return NextResponse.json({ error: 'Parol kamida 6 belgi bo\'lishi kerak' }, { status: 400 });
  }

  try {
    const store = await readStore();
    const adminIdx = store.users.findIndex(
      (u) => u.role === 'admin' && u.username.toLowerCase() === username.toLowerCase(),
    );

    if (adminIdx < 0) {
      return NextResponse.json({ error: `Admin topilmadi: ${username}` }, { status: 404 });
    }

    store.users[adminIdx].password = await hashPassword(password);
    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      ok: true,
      username: store.users[adminIdx].username,
      message: 'Admin paroli yangilandi. Endi shu parol bilan kiring.',
    });
  } catch (err) {
    console.error('[api/setup/admin-password]', err);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
