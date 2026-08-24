'use client';

import { clearReturnedAlertSoundFlags } from '@/lib/returnedAlertSound';
import type { SessionUser } from '@/types';

const SESSION_KEY = 'kamol_session';
const TOKEN_KEY = 'kamol_token';

export function saveSession(user: SessionUser, token?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  // Legacy sessions without a signed token are no longer valid.
  if (!localStorage.getItem(TOKEN_KEY)) {
    clearSession();
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    clearReturnedAlertSoundFlags();
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options?.headers,
      },
    });
  } catch {
    throw new Error('Serverga ulanishda xatolik. Sahifani yangilab qayta urinib ko‘ring.');
  }

  let data: { error?: string } = {};
  try {
    data = (await res.json()) as { error?: string };
  } catch {
    if (!res.ok) throw new Error('Xatolik yuz berdi');
  }
  if (!res.ok) throw new Error(data.error ?? 'Xatolik yuz berdi');
  return data as T;
}
