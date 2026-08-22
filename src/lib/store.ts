import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { STORE_VERSION } from '@/data/initialStore';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import {
  commentFromDb,
  commentToDb,
  monthlySettlementFromDb,
  monthlySettlementToDb,
  monthlyWinnerFromDb,
  monthlyWinnerToDb,
  monthlyWinnerViewFromDb,
  monthlyWinnerViewToDb,
  notificationFromDb,
  notificationToDb,
  paymentFromDb,
  paymentToDb,
  workerReplyFromDb,
  workerReplyToDb,
  projectFromDb,
  projectToDb,
  ratingEntryFromDb,
  ratingEntryToDb,
  usedCongratsFromDb,
  usedCongratsToDb,
  userFromDb,
  userToDb,
  type DbComment,
  type DbMonthlySettlement,
  type DbMonthlyWinner,
  type DbMonthlyWinnerView,
  type DbNotification,
  type DbPayment,
  type DbWorkerReply,
  type DbProject,
  type DbRatingEntry,
  type DbSettings,
  type DbUsedCongrats,
  type DbUser,
} from '@/lib/supabase/mappers';
import { syncStoreAdvancePayments } from '@/lib/payments';
import type { DataStore, AppNotification, Payment, Project, ProjectComment, RatingEntry } from '@/types';

const LEGACY_STORE_PATH = process.env.VERCEL
  ? path.join('/tmp', 'kamol-project', 'store.json')
  : path.join(process.cwd(), 'data', 'store.json');

let cachedStore: DataStore | null = null;
let cacheExpiry = 0;
// Last successfully fetched store, preserved across cache TTL expiry so we can
// serve stale-while-error when Supabase is temporarily slow/unreachable.
let lastGoodStore: DataStore | null = null;
const CACHE_TTL = 15_000;

export type StoreTable =
  | 'users'
  | 'projects'
  | 'notifications'
  | 'rating_entries'
  | 'project_comments'
  | 'payments'
  | 'worker_replies'
  | 'monthly_winners'
  | 'used_congrats_combos'
  | 'monthly_settlements'
  | 'monthly_winner_views';

function getCachedStore(): DataStore | null {
  if (cachedStore && Date.now() < cacheExpiry) return cachedStore;
  return null;
}

function setCachedStore(store: DataStore): void {
  cachedStore = store;
  lastGoodStore = store;
  cacheExpiry = Date.now() + CACHE_TTL;
}

export function invalidateStoreCache(): void {
  cachedStore = null;
  lastGoodStore = null;
  cacheExpiry = 0;
}

/** Default seed account from older dev builds — never re-create or restore. */
function isSeedTestWorker(user: { role: string; username: string; name: string }): boolean {
  return user.role === 'worker' && user.username === 'worker' && user.name === 'Test Worker';
}

function stripSeedTestWorkers(store: DataStore): DataStore {
  store.users = store.users.filter((u) => !isSeedTestWorker(u));
  return store;
}

async function deleteLegacyStoreFile(): Promise<void> {
  try {
    await fs.unlink(LEGACY_STORE_PATH);
  } catch {
    // file may not exist
  }
}

async function createFreshStore(): Promise<DataStore> {
  const adminPassword = await bcrypt.hash('admin123', 10);
  return {
    version: STORE_VERSION,
    users: [
      {
        id: uuidv4(),
        username: 'admin',
        password: adminPassword,
        name: 'Administrator',
        role: 'admin',
      },
    ],
    projects: [],
    notifications: [],
    ratingEntries: [],
    comments: [],
    payments: [],
    workerReplies: [],
    monthlyWinners: [],
    usedCongratsCombos: [],
    monthlySettlements: [],
    monthlyWinnerViews: [],
  };
}

async function migratePasswords(store: DataStore): Promise<DataStore> {
  let changed = false;
  for (const user of store.users) {
    if (!user.password.startsWith('$2')) {
      user.password = await bcrypt.hash(user.password, 10);
      changed = true;
    }
  }
  if (changed) await writeStore(store);
  return store;
}

async function loadLegacyJsonStore(): Promise<DataStore | null> {
  try {
    const raw = await fs.readFile(LEGACY_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DataStore;
    const userCountBefore = parsed.users?.length ?? 0;
    if (!parsed.users?.length) return null;
    if (!parsed.ratingEntries) parsed.ratingEntries = [];
    if (!parsed.comments) parsed.comments = [];
    if (!parsed.payments) parsed.payments = [];
    if (!parsed.workerReplies) parsed.workerReplies = [];
    if (!parsed.monthlyWinners) parsed.monthlyWinners = [];
    if (!parsed.usedCongratsCombos) parsed.usedCongratsCombos = [];
    if (!parsed.monthlySettlements) parsed.monthlySettlements = [];
    if (!parsed.monthlyWinnerViews) parsed.monthlyWinnerViews = [];
    stripSeedTestWorkers(parsed);
    if (userCountBefore !== parsed.users.length) {
      await saveLegacyJsonStore(parsed);
    }
    if (!parsed.users.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveLegacyJsonStore(store: DataStore): Promise<void> {
  await fs.mkdir(path.dirname(LEGACY_STORE_PATH), { recursive: true });
  await fs.writeFile(LEGACY_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

async function readLocalStore(): Promise<DataStore> {
  const legacy = await loadLegacyJsonStore();
  const store = legacy ?? (await createFreshStore());
  if (!legacy) await saveLegacyJsonStore(store);
  return migratePasswords(stripSeedTestWorkers(store));
}

async function fetchSettings(): Promise<Pick<DataStore, 'foundedYear' | 'version'>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('app_settings')
    .select('founded_year, version')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;

  const row = data as DbSettings | null;
  return {
    foundedYear: row?.founded_year ?? undefined,
    version: row?.version ?? STORE_VERSION,
  };
}

async function syncRows(
  table:
    | 'users'
    | 'projects'
    | 'notifications'
    | 'rating_entries'
    | 'project_comments'
    | 'payments'
    | 'worker_replies'
    | 'monthly_winners'
    | 'used_congrats_combos'
    | 'monthly_settlements'
    | 'monthly_winner_views',
  rows: Record<string, unknown>[],
  keepIds: string[],
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  const { data: existing, error: fetchError } = await supabase.from(table).select('id');
  if (fetchError) throw fetchError;

  const toDelete = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.includes(id));

  if (toDelete.length > 0) {
    const { error: delError } = await supabase.from(table).delete().in('id', toDelete);
    if (delError) throw delError;
  }
}

// Cap how long we'll wait for Supabase before failing over to the stale
// snapshot. Any single query stalling for more than this triggers the fallback
// instead of hanging the whole request.
const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Supabase timeout: ${label}`));
    }, SUPABASE_FETCH_TIMEOUT_MS);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchAllFromSupabase(): Promise<DataStore> {
  const supabase = getSupabaseAdmin();

  const [usersRes, projectsRes, notificationsRes, ratingRes, commentsRes, paymentsRes, repliesRes, winnersRes, congratsRes, settlementsRes, viewsRes, settings] =
    await Promise.all([
    withTimeout(supabase.from('users').select('*').order('created_at', { ascending: true }), 'users'),
    withTimeout(supabase.from('projects').select('*').order('order_date', { ascending: false }), 'projects'),
    withTimeout(supabase.from('notifications').select('*').order('created_at', { ascending: false }), 'notifications'),
    withTimeout(supabase.from('rating_entries').select('*').order('created_at', { ascending: false }), 'rating_entries'),
    withTimeout(supabase.from('project_comments').select('*').order('created_at', { ascending: false }), 'project_comments'),
    withTimeout(supabase.from('payments').select('*').order('paid_at', { ascending: true }), 'payments'),
    withTimeout(supabase.from('worker_replies').select('*').order('created_at', { ascending: false }), 'worker_replies'),
    withTimeout(supabase.from('monthly_winners').select('*'), 'monthly_winners'),
    withTimeout(supabase.from('used_congrats_combos').select('*'), 'used_congrats_combos'),
    withTimeout(supabase.from('monthly_settlements').select('*'), 'monthly_settlements'),
    withTimeout(supabase.from('monthly_winner_views').select('*'), 'monthly_winner_views'),
    withTimeout(fetchSettings(), 'settings'),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (notificationsRes.error) throw notificationsRes.error;

  return {
    version: settings.version,
    foundedYear: settings.foundedYear,
    users: (usersRes.data as DbUser[]).map(userFromDb),
    projects: (projectsRes.data as DbProject[]).map(projectFromDb),
    notifications: (notificationsRes.data as DbNotification[]).map(notificationFromDb),
    ratingEntries: ratingRes.error ? [] : (ratingRes.data as DbRatingEntry[]).map(ratingEntryFromDb),
    comments: commentsRes.error ? [] : (commentsRes.data as DbComment[]).map(commentFromDb),
    payments: paymentsRes.error ? [] : (paymentsRes.data as DbPayment[]).map(paymentFromDb),
    workerReplies: repliesRes.error ? [] : (repliesRes.data as DbWorkerReply[]).map(workerReplyFromDb),
    monthlyWinners: winnersRes.error ? [] : (winnersRes.data as DbMonthlyWinner[]).map(monthlyWinnerFromDb),
    usedCongratsCombos: congratsRes.error ? [] : (congratsRes.data as DbUsedCongrats[]).map(usedCongratsFromDb),
    monthlySettlements: settlementsRes.error ? [] : (settlementsRes.data as DbMonthlySettlement[]).map(monthlySettlementFromDb),
    monthlyWinnerViews: viewsRes.error ? [] : (viewsRes.data as DbMonthlyWinnerView[]).map(monthlyWinnerViewFromDb),
  };
}

export async function readStore(): Promise<DataStore> {
  const cached = getCachedStore();
  if (cached) return cached;

  if (process.env.VERCEL && !isSupabaseConfigured()) {
    throw new Error(
      'Vercel da Supabase majburiy. Settings → Environment Variables ga NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY qo\'shing.',
    );
  }

  let store: DataStore;

  try {
    if (!isSupabaseConfigured()) {
      store = await readLocalStore();
    } else {
      store = await fetchAllFromSupabase();
      if (store.users.length === 0) {
        // Empty DB after cleanup — seed admin only; do not restore legacy JSON (it may contain the old test worker).
        store = await createFreshStore();
        await writeStore(store);
        store = await migratePasswords(store);
      } else {
        store = await migratePasswords(store);
      }
    }
  } catch (err) {
    // Supabase transient failure — serve the last-known-good snapshot rather
    // than returning a 500 to the client. This keeps the app usable while
    // the network hiccup resolves. Errors are still logged for diagnostics.
    if (lastGoodStore) {
      console.error('[readStore] fetch failed, serving stale snapshot:', err);
      cachedStore = lastGoodStore;
      cacheExpiry = Date.now() + 5_000;
      return lastGoodStore;
    }
    throw err;
  }

  if (!store.payments) store.payments = [];
  if (!store.workerReplies) store.workerReplies = [];
  if (!store.monthlyWinners) store.monthlyWinners = [];
  if (!store.usedCongratsCombos) store.usedCongratsCombos = [];
  if (!store.monthlySettlements) store.monthlySettlements = [];
  if (!store.monthlyWinnerViews) store.monthlyWinnerViews = [];
  syncStoreAdvancePayments(store);

  setCachedStore(store);
  return store;
}

const ALL_STORE_TABLES: StoreTable[] = [
  'users',
  'projects',
  'notifications',
  'rating_entries',
  'project_comments',
  'payments',
  'worker_replies',
  'monthly_winners',
  'used_congrats_combos',
  'monthly_settlements',
  'monthly_winner_views',
];

function enrichDbError(error: { message?: string }, table: string): Error {
  const msg = error.message ?? 'Ma\'lumotlar bazasi xatoligi';
  if (msg.includes('projects_status_check') || msg.includes('pending_review')) {
    return new Error(
      'Baza sxemasi yangilanmagan. Supabase SQL Editor da supabase/schema.sql faylini ishga tushiring.',
    );
  }
  return new Error(`${table}: ${msg}`);
}

export type StorePatch = {
  projects?: Project[];
  notifications?: AppNotification[];
  ratingEntries?: RatingEntry[];
  comments?: ProjectComment[];
  payments?: Payment[];
};

/** PATCH kabi operatsiyalar uchun — faqat o'zgargan qatorlarni yozadi (butun jadvalni sync qilmaydi). */
export async function persistStorePatch(store: DataStore, patch: StorePatch): Promise<void> {
  store.version = STORE_VERSION;
  setCachedStore(store);

  if (!isSupabaseConfigured()) {
    await saveLegacyJsonStore(store);
    return;
  }

  const supabase = getSupabaseAdmin();

  if (patch.projects?.length) {
    const { error } = await supabase
      .from('projects')
      .upsert(patch.projects.map((p) => projectToDb(p)), { onConflict: 'id' });
    if (error) throw enrichDbError(error, 'projects');
  }

  if (patch.notifications?.length) {
    const { error } = await supabase
      .from('notifications')
      .insert(patch.notifications.map((n) => notificationToDb(n)));
    if (error) throw enrichDbError(error, 'notifications');
  }

  if (patch.ratingEntries?.length) {
    const { error } = await supabase
      .from('rating_entries')
      .insert(patch.ratingEntries.map((r) => ratingEntryToDb(r)));
    if (error) {
      // rating_entries jadvali hali bo'lmasa — e'tiborsiz qoldiramiz
      if (!String(error.message).includes('does not exist')) throw enrichDbError(error, 'rating_entries');
    }
  }

  if (patch.comments?.length) {
    const { error } = await supabase
      .from('project_comments')
      .upsert(patch.comments.map((c) => commentToDb(c)), { onConflict: 'id' });
    if (error) {
      if (!String(error.message).includes('does not exist')) throw enrichDbError(error, 'project_comments');
    }
  }

  if (patch.payments?.length) {
    const { error } = await supabase
      .from('payments')
      .upsert(patch.payments.map((p) => paymentToDb(p)), { onConflict: 'id' });
    if (error) {
      if (!String(error.message).includes('does not exist')) throw enrichDbError(error, 'payments');
    }
  }
}

export async function writeStore(
  store: DataStore,
  options?: { tables?: StoreTable[] },
): Promise<void> {
  store.version = STORE_VERSION;
  setCachedStore(store);

  if (!isSupabaseConfigured()) {
    await saveLegacyJsonStore(store);
    return;
  }

  const tables = options?.tables ?? ALL_STORE_TABLES;
  const supabase = getSupabaseAdmin();

  const { error: settingsError } = await supabase.from('app_settings').upsert({
    id: 1,
    founded_year: store.foundedYear ?? null,
    version: STORE_VERSION,
    updated_at: new Date().toISOString(),
  });
  if (settingsError) throw settingsError;

  if (tables.includes('users')) {
    await syncRows(
      'users',
      store.users.map((u) => userToDb(u) as unknown as Record<string, unknown>),
      store.users.map((u) => u.id),
    );
  }

  if (tables.includes('projects')) {
    await syncRows(
      'projects',
      store.projects.map((p) => projectToDb(p) as unknown as Record<string, unknown>),
      store.projects.map((p) => p.id),
    );
  }

  if (tables.includes('notifications')) {
    await syncRows(
      'notifications',
      store.notifications.map((n) => notificationToDb(n) as unknown as Record<string, unknown>),
      store.notifications.map((n) => n.id),
    );
  }

  if (tables.includes('rating_entries')) {
    try {
      await syncRows(
        'rating_entries',
        (store.ratingEntries ?? []).map((r) => ratingEntryToDb(r) as unknown as Record<string, unknown>),
        (store.ratingEntries ?? []).map((r) => r.id),
      );
    } catch {
      // rating_entries table may not exist yet
    }
  }

  if (tables.includes('project_comments')) {
    try {
      await syncRows(
        'project_comments',
        (store.comments ?? []).map((c) => commentToDb(c) as unknown as Record<string, unknown>),
        (store.comments ?? []).map((c) => c.id),
      );
    } catch {
      // project_comments table may not exist yet
    }
  }

  if (tables.includes('payments')) {
    try {
      await syncRows(
        'payments',
        (store.payments ?? []).map((p) => paymentToDb(p) as unknown as Record<string, unknown>),
        (store.payments ?? []).map((p) => p.id),
      );
    } catch {
      // payments table may not exist yet
    }
  }

  if (tables.includes('worker_replies')) {
    try {
      await syncRows(
        'worker_replies',
        (store.workerReplies ?? []).map((r) => workerReplyToDb(r) as unknown as Record<string, unknown>),
        (store.workerReplies ?? []).map((r) => r.id),
      );
    } catch {
      // worker_replies table may not exist yet
    }
  }

  if (tables.includes('monthly_winners')) {
    try {
      await syncRows(
        'monthly_winners',
        (store.monthlyWinners ?? []).map((r) => monthlyWinnerToDb(r) as unknown as Record<string, unknown>),
        (store.monthlyWinners ?? []).map((r) => r.id),
      );
    } catch {
      // monthly_winners table may not exist yet
    }
  }

  if (tables.includes('used_congrats_combos')) {
    try {
      await syncRows(
        'used_congrats_combos',
        (store.usedCongratsCombos ?? []).map((r) => usedCongratsToDb(r) as unknown as Record<string, unknown>),
        (store.usedCongratsCombos ?? []).map((r) => r.id),
      );
    } catch {
      // used_congrats_combos table may not exist yet
    }
  }

  if (tables.includes('monthly_settlements')) {
    try {
      await syncRows(
        'monthly_settlements',
        (store.monthlySettlements ?? []).map((r) => monthlySettlementToDb(r) as unknown as Record<string, unknown>),
        (store.monthlySettlements ?? []).map((r) => r.id),
      );
    } catch {
      // monthly_settlements table may not exist yet
    }
  }

  if (tables.includes('monthly_winner_views')) {
    try {
      await syncRows(
        'monthly_winner_views',
        (store.monthlyWinnerViews ?? []).map((r) => monthlyWinnerViewToDb(r) as unknown as Record<string, unknown>),
        (store.monthlyWinnerViews ?? []).map((r) => r.id),
      );
    } catch {
      // monthly_winner_views table may not exist yet
    }
  }
}

export async function resetStore(): Promise<DataStore> {
  invalidateStoreCache();
  await deleteLegacyStoreFile();

  if (!isSupabaseConfigured()) {
    const store = await createFreshStore();
    await saveLegacyJsonStore(store);
    setCachedStore(store);
    return store;
  }

  const supabase = getSupabaseAdmin();

  await supabase.from('project_comments').delete().gte('created_at', '1970-01-01');
  await supabase.from('payments').delete().gte('paid_at', '1970-01-01');
  await supabase.from('worker_replies').delete().gte('created_at', '1970-01-01');
  await supabase.from('rating_entries').delete().gte('created_at', '1970-01-01');
  await supabase.from('notifications').delete().gte('created_at', '1970-01-01');
  await supabase.from('monthly_winners').delete().gte('created_at', '1970-01-01');
  await supabase.from('used_congrats_combos').delete().gte('created_at', '1970-01-01');
  await supabase.from('monthly_settlements').delete().gte('settled_at', '1970-01-01');
  await supabase.from('monthly_winner_views').delete().gte('seen_at', '1970-01-01');
  await supabase.from('projects').delete().gte('created_at', '1970-01-01');
  await supabase.from('users').delete().gte('created_at', '1970-01-01');

  const store = await createFreshStore();
  await writeStore(store);
  return store;
}
