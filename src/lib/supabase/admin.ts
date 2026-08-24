import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase sozlanmagan. NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY .env faylga qo\'ying.',
    );
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Vercel, Cloudflare Workers/Pages va boshqa serverless muhitlar fayl tizimidan foydalana olmaydi. */
export function mustUseSupabase(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.CF_PAGES) ||
    Boolean(process.env.CLOUDFLARE_WORKERS) ||
    Boolean(process.env.CF_WORKER) ||
    Boolean(process.env.WORKERS_CI)
  );
}

export function assertSupabaseInProduction(): void {
  if (mustUseSupabase() && !isSupabaseConfigured()) {
    throw new Error(
      'Production muhitda Supabase majburiy. Cloudflare (yoki Vercel) dashboard ga NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY qo\'shing. Keyin Supabase SQL Editor da supabase/schema.sql ni ishga tushiring.',
    );
  }
}
