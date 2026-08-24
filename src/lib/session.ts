import { NextRequest } from 'next/server';
import { readStore } from '@/lib/store';
import { verifySessionToken } from '@/lib/sessionToken';
import type { SessionUser } from '@/types';

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionUser | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7).trim();
  const claims = verifySessionToken(token);
  if (!claims) return null;

  // Always load the current role from the database — never trust client claims alone.
  const store = await readStore();
  const user = store.users.find((u) => u.id === claims.id);
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
