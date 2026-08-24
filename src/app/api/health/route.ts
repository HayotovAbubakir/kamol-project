import { NextResponse } from 'next/server';
import { syncRuntimeEnvToProcess } from '@/lib/runtimeEnv';
import { getServerConfigIssues, isSupabaseConfigured, mustUseSupabase } from '@/lib/supabase/admin';

/** Production sozlamalarini tekshirish (maxfiy kalitlarsiz). */
export async function GET() {
  syncRuntimeEnvToProcess();
  const issues = getServerConfigIssues();
  const supabaseConfigured = isSupabaseConfigured();
  const serverless = mustUseSupabase();
  const ok = issues.length === 0;

  return NextResponse.json(
    {
      ok,
      database: 'supabase',
      supabaseConfigured,
      serverlessEnvironment: serverless,
      missing: issues,
      hint: ok
        ? 'Ma\'lumotlar bazasi ulanishi sozlangan.'
        : 'Cloudflare Dashboard → kamol-project → Settings → Variables & Secrets ga quyidagilarni qo\'shing (Build variables emas!): ' +
          issues.join(', '),
    },
    { status: ok ? 200 : 503 },
  );
}
