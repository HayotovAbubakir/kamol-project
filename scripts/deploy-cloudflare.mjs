import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const RUNTIME_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SESSION_SECRET',
];

const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  console.warn(
    '\n>>> Ogohlantirish: Cloudflare Deploy command faqat quyidagicha bo\'lishi kerak:\n' +
      '>>> node scripts/deploy-cloudflare.mjs\n' +
      `>>> (ortiqcha so\'zlar e\'tiborsiz qoldirildi: ${extraArgs.join(' ')})\n`,
  );
}

function run(command, args, input) {
  const result = spawnSync(command, args, {
    stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
    input,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** Workers Builds: Build variables deploy vaqtida mavjud, runtime emas — shu yerda sync qilinadi. */
function syncBuildEnvToWorkerRuntime() {
  if (!process.env.WORKERS_CI && !process.env.CI) return;

  console.log('>>> Build env dan runtime secretlarni sync qilish...\n');

  for (const key of RUNTIME_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) {
      console.warn(`>>> [ogohlantirish] Build env da ${key} yo'q`);
      continue;
    }
    console.log(`>>> secret put ${key}`);
    run('npx', ['wrangler', 'secret', 'put', key], value);
  }
}

const hasWorker = existsSync('.open-next/worker.js');

if (!hasWorker) {
  console.log('>>> .open-next/worker.js topilmadi — OpenNext build ishga tushirilmoqda...\n');
  run('npx', ['opennextjs-cloudflare', 'build']);
} else {
  console.log('>>> .open-next/worker.js mavjud — faqat deploy qilinmoqda...\n');
}

if (!existsSync('.open-next/worker.js')) {
  console.error('\n[X] .open-next/worker.js yaratilmadi — deploy bekor qilindi.\n');
  process.exit(1);
}

syncBuildEnvToWorkerRuntime();
console.log('>>> Admin parolini tekshirish / yangilash...\n');
run('node', ['scripts/reset-admin-password.mjs']);
run('npx', ['opennextjs-cloudflare', 'deploy', '--', '--keep-vars']);
