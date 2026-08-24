import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const password = process.env.ADMIN_INITIAL_PASSWORD?.trim() || 'admin123';
const username = process.argv[2]?.trim() || 'admin';

if (!url || !key) {
  console.error('[X] NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak (.env.local)');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hash = await bcrypt.hash(password, 10);

const { data: existing, error: readError } = await supabase
  .from('users')
  .select('id, username, role')
  .eq('username', username)
  .maybeSingle();

if (readError) {
  console.error('[X] Supabase xato:', readError.message);
  process.exit(1);
}

if (!existing) {
  const { error: insertError } = await supabase.from('users').insert({
    username,
    password: hash,
    name: 'Administrator',
    role: 'admin',
  });
  if (insertError) {
    console.error('[X] Admin yaratib bo\'lmadi:', insertError.message);
    process.exit(1);
  }
  console.log(`[OK] Yangi admin yaratildi: ${username}`);
} else {
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hash })
    .eq('id', existing.id);
  if (updateError) {
    console.error('[X] Parol yangilanmadi:', updateError.message);
    process.exit(1);
  }
  console.log(`[OK] Admin paroli yangilandi: ${username}`);
}

console.log('[OK] Endi login qiling:', username, '/', password);
