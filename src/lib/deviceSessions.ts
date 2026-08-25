import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';

/**
 * Qurilma IP faqat serverda saqlanadi (hash) — localStorage / client JS ga chiqmaydi.
 * Foydalanuvchi DevTools orqali ham ochiq IP ko'rmaydi.
 */
const FILE_PATH = path.join(process.cwd(), 'data', 'device-sessions.json');

interface DeviceSession {
  userId: string;
  ipHash: string;
  lastSeenAt: string;
}

function hashIp(userId: string, ip: string): string {
  return createHash('sha256').update(`kamol-device:${userId}:${ip}`).digest('hex');
}

async function readFileStore(): Promise<Record<string, DeviceSession>> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, DeviceSession>;
  } catch {
    return {};
  }
}

async function writeFileStore(data: Record<string, DeviceSession>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(data), 'utf-8');
  } catch {
    // Serverless muhitda fayl yozilmasligi mumkin.
  }
}

/** Muvaffaqiyatli login: IP ni hashlab serverda yozadi. Clientga hech narsa qaytarmaydi. */
export async function recordDeviceLogin(userId: string, ip: string): Promise<void> {
  if (!userId || !ip || ip === 'unknown') return;

  const entry: DeviceSession = {
    userId,
    ipHash: hashIp(userId, ip),
    lastSeenAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabaseAdmin().from('device_sessions').upsert(
        {
          user_id: entry.userId,
          ip_hash: entry.ipHash,
          last_seen_at: entry.lastSeenAt,
        },
        { onConflict: 'user_id' },
      );
      if (!error) return;
    } catch {
      // Jadval hali yo'q bo'lishi mumkin — faylga yozamiz.
    }
  }

  const file = await readFileStore();
  file[userId] = entry;
  await writeFileStore(file);
}
