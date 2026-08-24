import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const hasWorker = existsSync('.open-next/worker.js');

if (!hasWorker) {
  console.log('>>> .open-next/worker.js topilmadi — OpenNext build ishga tushirilmoqda...\n');
  execSync('npx opennextjs-cloudflare build', { stdio: 'inherit' });
} else {
  console.log('>>> .open-next/worker.js mavjud — faqat deploy qilinmoqda...\n');
}

if (!existsSync('.open-next/worker.js')) {
  console.error('\n[X] .open-next/worker.js yaratilmadi — deploy bekor qilindi.\n');
  process.exit(1);
}

execSync('npx opennextjs-cloudflare deploy -- --keep-vars', { stdio: 'inherit' });
