/**
 * Barcha sahifalarni TV o'lchamida (1920x1080) skrinshot qiladi.
 * Ishlatish: node scripts/tv-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots', 'tv');
const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5173';
const VIEWPORT = { width: 1920, height: 1080 };

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

const ADMIN_PAGES = [
  ['01-admin-dashboard', '/admin'],
  ['02-admin-projects', '/admin/projects'],
  ['03-admin-notifications', '/admin/notifications'],
  ['04-admin-random-assign', '/admin/random-assign'],
  ['05-admin-workers', '/admin/workers'],
  ['06-admin-leaderboard', '/admin/leaderboard'],
  ['07-admin-settings', '/admin/settings'],
];

const WORKER_PAGES = [
  ['08-worker-dashboard', '/worker'],
  ['09-worker-projects', '/worker/projects'],
  ['10-worker-returned', '/worker/returned'],
  ['11-worker-completed', '/worker/completed'],
  ['12-worker-leaderboard', '/worker/leaderboard'],
  ['13-worker-settings', '/worker/settings'],
];

fs.mkdirSync(OUT, { recursive: true });

async function waitForPageReady(page, role) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.ui-sidebar-btn', { timeout: 60000 });
  await page
    .waitForResponse(
      (r) =>
        r.url().includes(role === 'admin' ? '/api/admin/bootstrap' : '/api/worker/bootstrap') &&
        r.status() === 200,
      { timeout: 90000 },
    )
    .catch(() => {});
  await page.waitForFunction(
    () => {
      const skeleton = document.querySelector('.animate-pulse');
      const header = document.querySelector('h1, h2.font-display');
      return header && !skeleton;
    },
    { timeout: 90000 },
  );
  await page.waitForTimeout(2000);
}

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

async function createAuthedContext(browser, session) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'uz-UZ',
  });
  await context.addInitScript(
    (s) => {
      localStorage.setItem('kamol_session', JSON.stringify(s));
    },
    session,
  );
  await context.addInitScript(AUTH_HELPER);
  return context;
}

async function impersonateWorker(page) {
  return page.evaluate(async () => {
    const data = await window.__authFetch('/api/users');
    const worker = data.workers?.[0];
    if (!worker) throw new Error('Ishchi topilmadi');
    return { id: worker.id, username: worker.username, name: worker.name, role: 'worker' };
  });
}

async function shot(page, fileName) {
  const filePath = path.join(OUT, `${fileName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log('✓', filePath);
}

async function capturePages(page, pages, role) {
  for (const [name, route] of pages) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPageReady(page, role);
    await shot(page, name);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Login sahifasi
  const loginContext = await browser.newContext({ viewport: VIEWPORT, locale: 'uz-UZ' });
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await loginPage.evaluate(() => localStorage.removeItem('kamol_session'));
  await loginPage.reload({ waitUntil: 'domcontentloaded' });
  await loginPage.waitForSelector('.book-shell', { timeout: 30000 });
  await loginPage.evaluate(() => document.querySelector('.book')?.classList.add('is-open'));
  await loginPage.waitForSelector('#username', { timeout: 15000 });
  await loginPage.waitForTimeout(1500);
  await shot(loginPage, '00-login');
  await loginContext.close();

  // Admin sahifalar
  const adminSession = await fetchSession('admin', 'admin123');
  const adminContext = await createAuthedContext(browser, adminSession);
  const adminPage = await adminContext.newPage();
  await capturePages(adminPage, ADMIN_PAGES, 'admin');
  await adminContext.close();

  // Worker sahifalar
  const workerLookupContext = await createAuthedContext(browser, adminSession);
  const lookupPage = await workerLookupContext.newPage();
  await lookupPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await lookupPage.waitForSelector('.ui-sidebar-btn', { timeout: 60000 });
  const workerSession = await impersonateWorker(lookupPage);
  await workerLookupContext.close();

  const workerContext = await createAuthedContext(browser, workerSession);
  const workerPage = await workerContext.newPage();
  await capturePages(workerPage, WORKER_PAGES, 'worker');
  await workerContext.close();

  await browser.close();
  console.log(`\nJami ${1 + ADMIN_PAGES.length + WORKER_PAGES.length} ta skrinshot: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
