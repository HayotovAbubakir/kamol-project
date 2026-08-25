import { NextRequest, NextResponse } from 'next/server';
import { syncRuntimeEnvToProcessAsync } from '@/lib/runtimeEnv';
import { readStore } from '@/lib/store';
import { verifyPassword } from '@/lib/password';
import { signSession } from '@/lib/sessionToken';
import { getSessionFromRequest } from '@/lib/session';
import { clearSessionCookie, setSessionCookie } from '@/lib/sessionCookie';
import { recordDeviceLogin } from '@/lib/deviceSessions';
import {
  clearLoginAttempts,
  getClientIp,
  isLoginRateLimited,
  loginLockMessage,
  recordLoginFailure,
  remainingLockMs,
  shouldRateLimitByIp,
} from '@/lib/loginRateLimit';
import type { SessionUser } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

async function lockResponse(key: string) {
  const remaining = await remainingLockMs(key);
  return NextResponse.json(
    { error: loginLockMessage(remaining) },
    { status: 429 },
  );
}

export async function POST(request: NextRequest) {
  try {
    await syncRuntimeEnvToProcessAsync();
    const ip = getClientIp(request);
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return NextResponse.json({ error: 'Login va parol kerak' }, { status: 400 });
    }

    const userKey = `${ip}:${username.toLowerCase()}`;
    const ipKey = `ip:${ip}`;
    const trackIp = shouldRateLimitByIp(ip);

    if (await isLoginRateLimited(userKey)) return lockResponse(userKey);
    if (trackIp && (await isLoginRateLimited(ipKey))) return lockResponse(ipKey);

    const store = await readStore();
    const user = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !(await verifyPassword(password, user.password))) {
      await recordLoginFailure(userKey);
      if (trackIp) await recordLoginFailure(ipKey);
      if (await isLoginRateLimited(userKey)) return lockResponse(userKey);
      if (trackIp && (await isLoginRateLimited(ipKey))) return lockResponse(ipKey);
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: 'Login yoki parol noto\'g\'ri' }, { status: 401 });
    }

    await clearLoginAttempts(userKey);
    if (trackIp) await clearLoginAttempts(ipKey);

    // IP faqat serverda (hash) — clientga/localStorage ga chiqmaydi.
    void recordDeviceLogin(user.id, ip).catch(() => {});

    const session: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const res = NextResponse.json({ user: session });
    setSessionCookie(res, signSession(session));
    return res;
  } catch (err) {
    console.error('[api/auth]', err);
    const message = err instanceof Error ? err.message : '';
    if (
      message.includes('Supabase') ||
      message.includes('SESSION_SECRET') ||
      message.includes('sozlanmagan')
    ) {
      return NextResponse.json(
        {
          error:
            'Server sozlanmagan. Kalitlar Settings → Variables and Secrets (RUNTIME) da bo\'lishi kerak — Build variables yetarli emas. Kerak: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
