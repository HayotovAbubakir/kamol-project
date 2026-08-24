import { createHmac, timingSafeEqual } from 'crypto';
import type { SessionUser } from '@/types';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TokenPayload {
  id: string;
  username: string;
  name: string;
  role: SessionUser['role'];
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('SESSION_SECRET majburiy (kamida 32 belgi).');
  }
  // Dev-only fallback — never used in production.
  return 'dev-only-session-secret-change-me!!';
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function encodePayload(payload: TokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

function decodePayload(encoded: string): TokenPayload | null {
  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw) as TokenPayload;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.name !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'worker') ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function signSession(user: SessionUser): string {
  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  try {
    const a = Buffer.from(signature, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload || payload.exp < Date.now()) return null;

  return {
    id: payload.id,
    username: payload.username,
    name: payload.name,
    role: payload.role,
  };
}
