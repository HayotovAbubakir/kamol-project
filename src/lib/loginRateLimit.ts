import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const FILE_PATH = path.join(process.cwd(), 'data', 'login-locks.json');

interface Entry {
  count: number;
  resetAt: number;
}

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function getClientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

/** Local dev often has no proxy IP — shared ip:unknown would block everyone after test runs. */
export function shouldRateLimitByIp(ip: string): boolean {
  return ip !== 'unknown';
}

async function readFileStore(): Promise<Record<string, Entry>> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, Entry>;
  } catch {
    return {};
  }
}

async function writeFileStore(data: Record<string, Entry>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(data), 'utf-8');
  } catch {
    // Cloudflare Workers kabi serverless muhitlarda fayl yozilmaydi.
  }
}

async function loadEntry(key: string): Promise<Entry | null> {
  const now = Date.now();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('login_locks')
        .select('fail_count, locked_until')
        .eq('lock_key', key)
        .maybeSingle();
      if (error || !data) return null;
      const resetAt = data.locked_until ? new Date(data.locked_until as string).getTime() : now + WINDOW_MS;
      if (resetAt <= now) {
        await deleteEntry(key);
        return null;
      }
      return { count: Number(data.fail_count) || 0, resetAt };
    } catch {
      // Table may not exist yet — fall through to file store.
    }
  }

  const file = await readFileStore();
  const entry = file[key];
  if (!entry || entry.resetAt <= now) {
    if (entry) {
      delete file[key];
      await writeFileStore(file);
    }
    return null;
  }
  return entry;
}

async function saveEntry(key: string, entry: Entry): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabaseAdmin().from('login_locks').upsert({
        lock_key: key,
        fail_count: entry.count,
        locked_until: new Date(entry.resetAt).toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (!error) return;
    } catch {
      // Fall through to file store.
    }
  }

  const file = await readFileStore();
  file[key] = entry;
  await writeFileStore(file);
}

async function deleteEntry(key: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await getSupabaseAdmin().from('login_locks').delete().eq('lock_key', key);
    } catch {
      // ignore
    }
  }
  try {
    const file = await readFileStore();
    if (file[key]) {
      delete file[key];
      await writeFileStore(file);
    }
  } catch {
    // ignore
  }
}

export async function remainingLockMs(rawKey: string): Promise<number> {
  const entry = await loadEntry(hashKey(rawKey));
  if (!entry || entry.count < MAX_ATTEMPTS) return 0;
  return Math.max(0, entry.resetAt - Date.now());
}

export async function isLoginRateLimited(rawKey: string): Promise<boolean> {
  return (await remainingLockMs(rawKey)) > 0;
}

export async function recordLoginFailure(rawKey: string): Promise<void> {
  const key = hashKey(rawKey);
  const now = Date.now();
  const existing = await loadEntry(key);
  if (!existing || existing.resetAt <= now) {
    await saveEntry(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  const count = existing.count + 1;
  await saveEntry(key, {
    count,
    resetAt: count >= MAX_ATTEMPTS ? now + WINDOW_MS : existing.resetAt,
  });
}

export async function clearLoginAttempts(rawKey: string): Promise<void> {
  await deleteEntry(hashKey(rawKey));
}

export function loginLockMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const duration =
    minutes >= 60 ? `${Math.ceil(minutes / 60)} soatga` : `${minutes} daqiqaga`;
  return `8 marta ketma-ket xato login yoki parol kiritildi. ${duration} kirish bloklandi.`;
}
