'use client';

import { clearReturnedAlertSoundFlags } from '@/lib/returnedAlertSound';
import type { SessionUser } from '@/types';

/** Faqat UI uchun (ism, rol) — token/IP yo'q. */
const DISPLAY_SESSION_KEY = 'kamol_user';
/** Eski localStorage kalitlari — tozalanadi. */
const LEGACY_SESSION_KEY = 'kamol_session';
const LEGACY_TOKEN_KEY = 'kamol_token';

let memorySession: SessionUser | null = null;

function purgeLegacyAuthStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_SESSION_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  // Ehtimoliy eski IP / device kalitlari
  localStorage.removeItem('kamol_device_ip');
  localStorage.removeItem('device_ip');
  localStorage.removeItem('kamol_ip');
}

purgeLegacyAuthStorage();

function readDisplaySession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DISPLAY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (
      typeof parsed?.id !== 'string' ||
      typeof parsed?.username !== 'string' ||
      typeof parsed?.name !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'worker')
    ) {
      return null;
    }
    return {
      id: parsed.id,
      username: parsed.username,
      name: parsed.name,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

/** Login yoki /api/auth muvaffaqiyatidan keyin — faqat ko'rinadigan profil. */
export function saveSession(user: SessionUser): void {
  memorySession = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  if (typeof window === 'undefined') return;
  purgeLegacyAuthStorage();
  localStorage.setItem(DISPLAY_SESSION_KEY, JSON.stringify(memorySession));
}

export function getSession(): SessionUser | null {
  if (memorySession) return memorySession;
  const cached = readDisplaySession();
  if (cached) {
    memorySession = cached;
    return cached;
  }
  return null;
}

export function clearSession(): void {
  memorySession = null;
  if (typeof window !== 'undefined') {
    clearReturnedAlertSoundFlags();
    localStorage.removeItem(DISPLAY_SESSION_KEY);
    purgeLegacyAuthStorage();
  }
}

/** Server httpOnly cookie orqali autentifikatsiya — credentials majburiy. */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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

  if (res.status === 401) {
    const method = (options?.method ?? 'GET').toUpperCase();
    const path = url.split('?')[0];
    const isLoginPost = path === '/api/auth' && method === 'POST';
    const isSessionCheck = path === '/api/auth' && method === 'GET';
    if (!isLoginPost && !isSessionCheck && getSession()) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
  }

  if (!res.ok) throw new Error(data.error ?? 'Xatolik yuz berdi');
  return data as T;
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiFetch('/api/auth', { method: 'DELETE' });
  } catch {
    // Cookie serverda tozalanishi shart emas — baribir client sessiyani o'chiramiz.
  }
  clearSession();
}
