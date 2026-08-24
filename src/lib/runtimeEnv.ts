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

function readCloudflareEnvSync(name: RuntimeEnvKey): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  } catch {
    // sync kontekst mavjud emas
  }
  return undefined;
}

async function readCloudflareEnvAsync(name: RuntimeEnvKey): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  } catch {
    // async kontekst ham mavjud emas
  }
  return undefined;
}

/** Cloudflare Workers runtime o'zgaruvchilarini o'qiydi (process.env + Cloudflare env). */
export function getRuntimeEnv(name: RuntimeEnvKey): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  return readCloudflareEnvSync(name);
}

export async function getRuntimeEnvAsync(name: RuntimeEnvKey): Promise<string | undefined> {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const fromSync = readCloudflareEnvSync(name);
  if (fromSync) return fromSync;
  return readCloudflareEnvAsync(name);
}

/** Maxfiy qiymatsiz diagnostika — health endpoint uchun. */
export function getRuntimeEnvDiagnostics(): {
  processKeys: string[];
  cloudflareKeys: string[];
  configured: Record<RuntimeEnvKey, boolean>;
} {
  const configured = Object.fromEntries(
    RUNTIME_ENV_KEYS.map((key) => [key, Boolean(getRuntimeEnv(key))]),
  ) as Record<RuntimeEnvKey, boolean>;

  let cloudflareKeys: string[] = [];
  try {
    const { env } = getCloudflareContext();
    cloudflareKeys = Object.entries(env as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'string')
      .map(([key]) => key)
      .sort();
  } catch {
    cloudflareKeys = [];
  }

  return {
    processKeys: Object.keys(process.env).filter((key) =>
      RUNTIME_ENV_KEYS.includes(key as RuntimeEnvKey),
    ),
    cloudflareKeys,
    configured,
  };
}

/** Birinchi API chaqiruvda Cloudflare env ni process.env ga nusxalaydi. */
export function syncRuntimeEnvToProcess(): void {
  for (const key of RUNTIME_ENV_KEYS) {
    if (process.env[key]?.trim()) continue;
    const value = readCloudflareEnvSync(key);
    if (value) process.env[key] = value;
  }
}

export async function syncRuntimeEnvToProcessAsync(): Promise<void> {
  syncRuntimeEnvToProcess();
  for (const key of RUNTIME_ENV_KEYS) {
    if (process.env[key]?.trim()) continue;
    const value = await readCloudflareEnvAsync(key);
    if (value) process.env[key] = value;
  }
}
