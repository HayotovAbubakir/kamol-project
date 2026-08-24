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
execSync('npx opennextjs-cloudflare build --skipNextBuild', { stdio: 'inherit' });

if (!existsSync('.open-next/worker.js')) {
  console.error('\n[X] .open-next/worker.js yaratilmadi — Cloudflare deploy ishlamaydi.\n');
  process.exit(1);
}

console.log('\n[OK] .open-next/worker.js tayyor.\n');
