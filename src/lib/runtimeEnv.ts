import { getCloudflareContext } from '@opennextjs/cloudflare';

const RUNTIME_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SESSION_SECRET',
  'CRON_SECRET',
  'ADMIN_INITIAL_PASSWORD',
  'ADMIN_PHONE',
] as const;

type RuntimeEnvKey = (typeof RUNTIME_ENV_KEYS)[number];

function readCloudflareEnv(name: RuntimeEnvKey): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  } catch {
    // next dev yoki Cloudflare request kontekstidan tashqarida
  }
  return undefined;
}

/** Cloudflare Workers runtime o'zgaruvchilarini process.env dan o'qiydi (fallback: getCloudflareContext). */
export function getRuntimeEnv(name: RuntimeEnvKey): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  return readCloudflareEnv(name);
}

/** Birinchi API chaqiruvda Cloudflare env ni process.env ga nusxalaydi (boshqa kodlar uchun). */
export function syncRuntimeEnvToProcess(): void {
  for (const key of RUNTIME_ENV_KEYS) {
    if (process.env[key]?.trim()) continue;
    const value = readCloudflareEnv(key);
    if (value) process.env[key] = value;
  }
}
