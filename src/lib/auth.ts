'use client';

import { clearReturnedAlertSoundFlags } from '@/lib/returnedAlertSound';
import type { SessionUser } from '@/types';

const SESSION_KEY = 'kamol_session';

export function saveSession(user: SessionUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
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
  }
}

function encodeSessionToken(session: SessionUser): string {
  const json = JSON.stringify(session);
  // Unicode-safe base64 (Uzbek/Cyrillic names break plain btoa)
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function getAuthHeader(): Record<string, string> {
  const session = getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${encodeSessionToken(session)}` };
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
