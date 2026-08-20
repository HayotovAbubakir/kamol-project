import { NextRequest } from 'next/server';
import { readStore } from '@/lib/store';
import type { SessionUser } from '@/types';

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionUser | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    const session = JSON.parse(
      Buffer.from(auth.slice(7), 'base64').toString('utf-8'),
    ) as SessionUser;
    const store = await readStore();
    const user =
      store.users.find((u) => u.id === session.id) ??
      store.users.find((u) => u.username === session.username);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export function requireAdmin(session: SessionUser | null) {
  return session?.role === 'admin';
}

export function requireAuth(session: SessionUser | null) {
  return session !== null;
}
