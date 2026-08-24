import { NextResponse } from 'next/server';
import { getRuntimeEnvDiagnostics, syncRuntimeEnvToProcessAsync } from '@/lib/runtimeEnv';
import { getServerConfigIssues, isSupabaseConfigured, mustUseSupabase } from '@/lib/supabase/admin';

/** Production sozlamalarini tekshirish (maxfiy kalitlarsiz). */
export async function GET() {
  await syncRuntimeEnvToProcessAsync();
  const issues = getServerConfigIssues();
  const diagnostics = getRuntimeEnvDiagnostics();
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
      runtime: {
        configured: diagnostics.configured,
        cloudflareStringKeys: diagnostics.cloudflareKeys,
      },
      hint: ok
        ? 'Ma\'lumotlar bazasi ulanishi sozlangan.'
        : diagnostics.cloudflareKeys.length === 0
          ? 'Kalitlar faqat Build variables da bo\'lishi mumkin. Settings → Variables and Secrets (RUNTIME) ga ham qo\'shing YOKI Build variables da saqlang (deploy avtomatik sync qiladi). Yo\'qolgan: ' +
            issues.join(', ')
          : 'Cloudflare Dashboard → kamol-project → Settings → Variables and Secrets ga quyidagilarni qo\'shing (Build emas!): ' +
            issues.join(', '),
    },
    { status: ok ? 200 : 503 },
  );
}
