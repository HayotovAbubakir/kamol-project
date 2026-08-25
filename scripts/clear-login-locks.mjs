import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (url && key) {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error, count } = await supabase.from('login_locks').delete({ count: 'exact' }).neq('lock_key', '');
  if (error) {
    console.error('[X] Supabase:', error.message);
    process.exit(1);
  }
  console.log(`[OK] Supabase login_locks tozalandi (${count ?? 0} ta yozuv)`);
} else {
  console.warn('[!] Supabase env yo\'q — faqat lokal fayl tozalanadi');
}

const filePath = path.join(process.cwd(), 'data', 'login-locks.json');
try {
  await unlink(filePath);
  console.log('[OK] data/login-locks.json o\'chirildi');
} catch {
  console.log('[OK] Lokal login-locks.json yo\'q');
}

console.log('[OK] Endi qayta login qiling');
