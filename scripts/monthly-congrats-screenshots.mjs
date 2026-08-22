/**
 * Oylik 1-2-3 o'rin tabriklari skrinshotlari.
 * Ishlatish: node scripts/monthly-congrats-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots', 'monthly-winners');
const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };

const SAMPLE_MESSAGES = {
  1: "🏆 Ajoyib natija! Kamol, 2025-yil iyul oyida jamoadagi eng faol ishchilardan biri bo'ldingiz. Shu ruhda davom eting — cho'qqi sizniki!",
  2: "🥈 Zo'r ish qildingiz! Kamol, iyul yakunida siz 2-o'rindasiz: jami 28 ball. Bir qadam yuqori — va cho'qqi ham sizniki!",
  3: "🥉 Yaxshi natija! Kamol, iyulda 22 ball bilan TOP-3 ichidasiz. Shu ruhda davom eting!",
};

const AUTH_HELPER = `
  window.__authFetch = async (url, options = {}) => {
    const raw = localStorage.getItem('kamol_session');
    const headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
    if (raw) {
      const bytes = new TextEncoder().encode(raw);
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      headers.Authorization = 'Bearer ' + btoa(binary);
    }
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  };
`;

const BOOTSTRAP_BASE = {
  activeProjects: [],
  completedCount: 0,
  returnedProjects: [],
  comments: [],
  rating: { score: 4.2, count: 12 },
  notifications: [],
};

fs.mkdirSync(OUT, { recursive: true });

async function fetchSession(username, password) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data.user;
}

async function createWorkerContext(browser, workerSession) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'uz-UZ',
  });
  await context.addInitScript((s) => {
    localStorage.setItem('kamol_session', JSON.stringify(s));
    localStorage.setItem('kamol_theme', 'dark');
    document.documentElement.classList.add('dark');
  }, workerSession);
  await context.addInitScript(AUTH_HELPER);
  return context;
}

async function impersonateWorker(page) {
  return page.evaluate(async () => {
    const data = await window.__authFetch('/api/users');
    const worker = data.workers?.[0];
    if (!worker) throw new Error('Ishchi topilmadi — avval admin paneldan ishchi qo\'shing');
    return { id: worker.id, username: worker.username, name: worker.name, role: 'worker' };
  });
}

async function shot(page, fileName) {
  const filePath = path.join(OUT, `${fileName}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log('✓', filePath);
}

async function captureOverlay(page, rank, workerSession) {
  await page.route('**/api/worker/bootstrap', async (route) => {
    const points = { 1: 42, 2: 28, 3: 22 }[rank];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...BOOTSTRAP_BASE,
        notifications: [],
        pendingCongrats: {
          month: '2025-07',
          rank,
          totalPoints: points,
        },
      }),
    });
  });

  await page.goto(`${BASE}/worker`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('text=Tabriklaymiz', { timeout: 30000 });
  await page.waitForTimeout(1200);
  await shot(page, `0${rank}-overlay-rank-${rank}`);
  await page.unroute('**/api/worker/bootstrap');
}

async function captureNotification(page, rank) {
  const points = { 1: 42, 2: 28, 3: 22 }[rank];
  const message = SAMPLE_MESSAGES[rank];

  await page.route('**/api/worker/bootstrap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...BOOTSTRAP_BASE,
        pendingCongrats: null,
        notifications: [
          {
            id: `demo-${rank}`,
            userId: 'worker',
            message,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'info',
            event: 'monthly_winner',
          },
        ],
      }),
    });
  });

  await page.goto(`${BASE}/worker/notifications`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('text=Tabriklash', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(`text=${message.slice(0, 20)}`, { timeout: 30000 });
  await page.waitForTimeout(800);
  await shot(page, `0${rank}-notification-rank-${rank}`);
  await page.unroute('**/api/worker/bootstrap');
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const adminSession = await fetchSession('admin', 'admin123');
  const lookupContext = await browser.newContext({ viewport: VIEWPORT, locale: 'uz-UZ' });
  await lookupContext.addInitScript((s) => {
    localStorage.setItem('kamol_session', JSON.stringify(s));
    localStorage.setItem('kamol_theme', 'dark');
  }, adminSession);
  await lookupContext.addInitScript(AUTH_HELPER);
  const lookupPage = await lookupContext.newPage();
  await lookupPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await lookupPage.waitForSelector('.ui-sidebar-btn', { timeout: 90000 });
  let workerSession;
  try {
    workerSession = await impersonateWorker(lookupPage);
  } catch {
    console.warn('Ishchi topilmadi — demo session ishlatiladi');
    workerSession = {
      id: '00000000-0000-4000-8000-000000000001',
      username: 'demo',
      name: 'Kamol',
      role: 'worker',
    };
  }
  await lookupContext.close();

  for (const rank of [1, 2, 3]) {
    const context = await createWorkerContext(browser, workerSession);
    const page = await context.newPage();
    await captureOverlay(page, rank, workerSession);
    await context.close();
  }

  for (const rank of [1, 2, 3]) {
    const context = await createWorkerContext(browser, workerSession);
    const page = await context.newPage();
    await captureNotification(page, rank);
    await context.close();
  }

  await browser.close();
  console.log(`\nJami 6 ta skrinshot: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
