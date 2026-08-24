import { NextResponse } from 'next/server';
import { isSupabaseConfigured, mustUseSupabase } from '@/lib/supabase/admin';

/** Production sozlamalarini tekshirish (maxfiy kalitlarsiz). */
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const serverless = mustUseSupabase();
  const ok = !serverless || supabaseConfigured;

  return NextResponse.json(
    {
      ok,
      database: 'supabase',
      supabaseConfigured,
      serverlessEnvironment: serverless,
      hint: ok
        ? 'Ma\'lumotlar bazasi ulanishi sozlangan.'
        : 'Cloudflare dashboard → Settings → Variables ga NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY qo\'shing. So\'ng Supabase SQL Editor da supabase/schema.sql ni ishga tushiring.',
    },
    { status: ok ? 200 : 503 },
  );
}
