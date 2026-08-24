import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  console.warn(
    '\n>>> Ogohlantirish: Cloudflare Deploy command faqat quyidagicha bo\'lishi kerak:\n' +
      '>>> node scripts/deploy-cloudflare.mjs\n' +
      `>>> (ortiqcha so\'zlar e\'tiborsiz qoldirildi: ${extraArgs.join(' ')})\n`,
  );
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
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

run('npx', ['opennextjs-cloudflare', 'deploy', '--', '--keep-vars']);
