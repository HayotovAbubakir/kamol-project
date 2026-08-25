/**
 * Yangi funksiyalar skrinshotlari (gamification, appearance, leaderboard).
 * Ishlatish: node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import { createHmac } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve('screenshots-test');
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  return 'dev-only-session-secret-change-me!!';
}

function signSession(user) {
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

async function fetchUserFromDb(username) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Supabase env kerak (.env.local)');
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('users')
    .select('id, username, name, role')
    .eq('username', username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Foydalanuvchi topilmadi: ${username}`);
  return data;
}

async function tryPasswordLogin(username, password) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return { user: data.user, token: data.token };
}

async function resolveSession(username, password) {
  const fromLogin = await tryPasswordLogin(username, password);
  if (fromLogin) return fromLogin;

  const dbUser = await fetchUserFromDb(username);
  const user = {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
  };
  return { user, token: signSession(user) };
}

async function createAuthedContext(browser, session, viewport) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'dark',
    locale: 'uz-UZ',
  });
  await context.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('kamol_session', JSON.stringify(user));
      localStorage.setItem('kamol_token', token);
      localStorage.setItem('kamol_theme', 'dark');
      localStorage.setItem('kamol_lang', 'uz');
      document.documentElement.classList.add('dark');
    },
    session,
  );
  return context;
}

async function shot(page, name, options = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, ...options });
  console.log('✓', file);
}

async function shotAppearancePanel(page, name) {
  const panel = page.locator('section').filter({
    has: page.locator('h2', { hasText: /Ko'rinish|Appearance|Оформление/ }),
  });
  const file = path.join(OUT, `${name}.png`);
  if (await panel.count()) {
    await panel.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await panel.first().screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  console.log('✓', file);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const adminSession = await resolveSession(
    process.env.TEST_ADMIN ?? 'admin',
    process.env.TEST_PASS ?? process.env.ADMIN_INITIAL_PASSWORD ?? 'admin123',
  );
  console.log('[OK] Admin sessiya:', adminSession.user.username);

  let workerSession = null;
  if (process.env.TEST_WORKER?.trim()) {
    try {
      const workerUser = await fetchUserFromDb(process.env.TEST_WORKER.trim());
      workerSession = {
        user: {
          id: workerUser.id,
          username: workerUser.username,
          name: workerUser.name,
          role: workerUser.role,
        },
        token: signSession(workerUser),
      };
      console.log('[OK] Ishchi sessiya:', workerUser.username);
    } catch (error) {
      console.warn('[!] TEST_WORKER:', error instanceof Error ? error.message : error);
    }
  }

  if (!workerSession) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (url && key) {
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase
        .from('users')
        .select('id, username, name, role')
        .eq('role', 'worker')
        .limit(1)
        .maybeSingle();
      if (data) {
        workerSession = {
          user: {
            id: data.id,
            username: data.username,
            name: data.name,
            role: data.role,
          },
          token: signSession(data),
        };
        console.log('[OK] Ishchi sessiya:', data.username);
      }
    }
  }

  const browser = await chromium.launch({ headless: true });

  try {
    try {
      const loginPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await loginPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await loginPage.waitForTimeout(1000);
      const openBtn = loginPage.locator('.book-open-hitarea, [aria-label="Ochish"], .book-cover-drag');
      if (await openBtn.count()) {
        await openBtn.first().click({ force: true });
        await loginPage.waitForTimeout(600);
      }
      await shot(loginPage, '00-login-page');
      await loginPage.close();
    } catch (loginErr) {
      console.warn('[!] Login skrinshot:', loginErr instanceof Error ? loginErr.message : loginErr);
    }

    const adminContext = await createAuthedContext(
      browser,
      adminSession,
      { width: 1440, height: 900 },
    );
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await adminPage.waitForSelector('nav, [data-testid="app-shell"], .font-display', { timeout: 30000 });
    await adminPage.waitForTimeout(2000);
    await shot(adminPage, '01-admin-dashboard');

    async function scrollToAppearance(page) {
      await page.evaluate(() => {
        const shell = document.querySelector('.ui-page-shell');
        const heading = Array.from(document.querySelectorAll('h2')).find((el) =>
          /Ko'rinish|Appearance|Оформление/.test(el.textContent ?? ''),
        );
        if (heading) {
          heading.scrollIntoView({ block: 'start', behavior: 'instant' });
        } else if (shell instanceof HTMLElement) {
          shell.scrollTop = shell.scrollHeight;
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      });
      await page.waitForTimeout(800);
    }

    await adminPage.goto(`${BASE}/admin/settings`, { waitUntil: 'domcontentloaded' });
    await scrollToAppearance(adminPage);
    await shotAppearancePanel(adminPage, '02-admin-settings-appearance');

    await adminPage.evaluate(() => {
      localStorage.setItem('kamol_cursor_trail', '1');
      localStorage.setItem('kamol_cursor_trail_style', 'line');
      localStorage.setItem('kamol_cursor_trail_color', 'rgb');
    });
    await adminPage.reload({ waitUntil: 'domcontentloaded' });
    await scrollToAppearance(adminPage);
    await shotAppearancePanel(adminPage, '02b-settings-rgb-cursor');

    await adminPage.goto(`${BASE}/admin/leaderboard`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1500);
    await shot(adminPage, '03-admin-leaderboard-gamification');

    const workerRow = adminPage.locator('button').filter({ has: adminPage.locator('.font-medium') }).first();
    try {
      if (await workerRow.count()) {
        await workerRow.click({ timeout: 5000 });
        await adminPage.waitForTimeout(1200);
        await shot(adminPage, '04-worker-profile-gamification');
        await adminPage.keyboard.press('Escape');
      }
    } catch (profileErr) {
      console.warn('[!] Ishchi profili skrinshoti:', profileErr instanceof Error ? profileErr.message : profileErr);
    }

    await adminContext.close();

    if (workerSession) {
      const workerContext = await createAuthedContext(
        browser,
        workerSession,
        { width: 390, height: 844 },
      );
      const workerPage = await workerContext.newPage();
      await workerPage.goto(`${BASE}/worker`, { waitUntil: 'networkidle', timeout: 60000 });
      await workerPage.waitForTimeout(1200);
      await shot(workerPage, '05-worker-mobile-dashboard');
      await workerPage.goto(`${BASE}/worker/leaderboard`, { waitUntil: 'networkidle' });
      await workerPage.waitForTimeout(1200);
      await shot(workerPage, '06-worker-mobile-leaderboard');
      await workerContext.close();
    } else {
      console.warn('[!] Ishchi topilmadi — worker skrinshotlari o\'tkazib yuborildi');
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
