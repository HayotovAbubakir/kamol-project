import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

console.log(
  "\n>>> Build tayyor. Agar sayt ochiq bo'lsa: npm run rebuild  (yoki dev uchun: npm run dev)\n",
);

if (process.env.VERCEL) {
  process.exit(0);
}

if (!existsSync('wrangler.toml')) {
  process.exit(0);
}

console.log('>>> Cloudflare Workers uchun OpenNext output yaratilmoqda...\n');
try {
  execSync('npx opennextjs-cloudflare build --skipNextBuild', { stdio: 'inherit' });
} catch (err) {
  // Windowsda .open-next band bo'lsa EPERM chiqishi mumkin — lokal next start uchun Next build yetarli.
  console.warn('\n[!] OpenNext bundle yaratilmadi (lokal Windows). Cloudflare deploy oldidan qayta build qiling.\n');
  if (process.env.CI || process.env.CLOUDFLARE_WORKERS || process.env.CF_WORKER) {
    process.exit(1);
  }
  process.exit(0);
}

if (!existsSync('.open-next/worker.js')) {
  console.error('\n[X] .open-next/worker.js yaratilmadi — Cloudflare deploy ishlamaydi.\n');
  if (process.env.CI || process.env.CLOUDFLARE_WORKERS || process.env.CF_WORKER) {
    process.exit(1);
  }
  process.exit(0);
}

console.log('\n[OK] .open-next/worker.js tayyor.\n');
