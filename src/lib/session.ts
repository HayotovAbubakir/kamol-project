import { NextRequest } from 'next/server';
import { syncRuntimeEnvToProcessAsync } from '@/lib/runtimeEnv';
import { readStore } from '@/lib/store';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';
import { verifySessionToken } from '@/lib/sessionToken';
import type { SessionUser } from '@/types';

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionUser | null> {
  await syncRuntimeEnvToProcessAsync();

  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  const auth = request.headers.get('Authorization');
  const bearer =
    auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  // Asosiy: httpOnly cookie. Bearer — eski klientlar / maxsus so'rovlar uchun.
  const token = cookieToken || bearer;
  if (!token) return null;

  const claims = verifySessionToken(token);
  if (!claims) return null;

  // Always load the current role from the database — never trust client claims alone.
  const store = await readStore();
  const user =
    store.users.find((u) => u.id === claims.id) ??
    store.users.find((u) => u.username === claims.username);
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

export function requireAdmin(session: SessionUser | null) {
  return session?.role === 'admin';
}

export function requireAuth(session: SessionUser | null) {
  return session !== null;
}
