import type { NextResponse } from 'next/server';
import { isServerlessRuntime } from '@/lib/runtimeEnv';
import { SESSION_TOKEN_TTL_MS } from '@/lib/sessionToken';

/** Brauzer JS o'qiy olmaydigan sessiya cookie. */
export const SESSION_COOKIE_NAME = 'kamol_sid';

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isServerlessRuntime(),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TOKEN_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isServerlessRuntime(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
