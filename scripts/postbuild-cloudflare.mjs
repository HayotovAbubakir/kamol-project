import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

console.log(
  "\n>>> Build tayyor. Agar sayt ochiq bo'lsa: npm run rebuild  (yoki dev uchun: npm run dev)\n",
);

// Vercel o'z infratuzilmasida deploy qiladi — OpenNext kerak emas.
if (process.env.VERCEL) {
  process.exit(0);
}

if (!existsSync('wrangler.toml')) {
  process.exit(0);
}

console.log('>>> Cloudflare Workers uchun OpenNext output yaratilmoqda...\n');
execSync('npx opennextjs-cloudflare build --skipNextBuild', { stdio: 'inherit' });
