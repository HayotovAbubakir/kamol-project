import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRuntimeEnv, isServerlessRuntime } from '@/lib/runtimeEnv';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY');

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
  return Boolean(getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL') && getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

/** Vercel, Cloudflare Workers/Pages va boshqa serverless muhitlar fayl tizimidan foydalana olmaydi. */
export function mustUseSupabase(): boolean {
  return isServerlessRuntime();
}

export function getServerConfigIssues(): string[] {
  const issues: string[] = [];
  if (!isSupabaseConfigured()) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY');
  }
  const secret = getRuntimeEnv('SESSION_SECRET');
  if (isServerlessRuntime() && (!secret || secret.length < 32)) {
    issues.push('SESSION_SECRET (kamida 32 belgi)');
  }
  return issues;
}

export function assertSupabaseInProduction(): void {
  if (mustUseSupabase() && !isSupabaseConfigured()) {
    throw new Error(
      'Production muhitda Supabase majburiy. Cloudflare Dashboard → Settings → Variables & Secrets (Build emas!) ga NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY qo\'shing.',
    );
  }
}
