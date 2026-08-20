import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { STORE_VERSION } from '@/data/initialStore';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import {
  commentFromDb,
  commentToDb,
  notificationFromDb,
  notificationToDb,
  projectFromDb,
  projectToDb,
  ratingEntryFromDb,
  ratingEntryToDb,
  userFromDb,
  userToDb,
  type DbComment,
  type DbNotification,
  type DbProject,
  type DbRatingEntry,
  type DbSettings,
  type DbUser,
} from '@/lib/supabase/mappers';
import type { DataStore } from '@/types';

const LEGACY_STORE_PATH = process.env.VERCEL
  ? path.join('/tmp', 'kamol-project', 'store.json')
  : path.join(process.cwd(), 'data', 'store.json');

let cachedStore: DataStore | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 15_000;

export type StoreTable =
  | 'users'
  | 'projects'
  | 'notifications'
  | 'rating_entries'
  | 'project_comments';

function getCachedStore(): DataStore | null {
  if (cachedStore && Date.now() < cacheExpiry) return cachedStore;
  return null;
}

function setCachedStore(store: DataStore): void {
  cachedStore = store;
  cacheExpiry = Date.now() + CACHE_TTL;
}

export function invalidateStoreCache(): void {
  cachedStore = null;
  cacheExpiry = 0;
}

async function createFreshStore(): Promise<DataStore> {
  const [adminPassword, workerPassword] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('worker123', 10),
  ]);
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
      {
        id: uuidv4(),
        username: 'worker',
        password: workerPassword,
        name: 'Test Worker',
        role: 'worker',
      },
    ],
    projects: [],
    notifications: [],
    ratingEntries: [],
    comments: [],
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
    if (!parsed.users?.length) return null;
    if (!parsed.ratingEntries) parsed.ratingEntries = [];
    if (!parsed.comments) parsed.comments = [];
    return parsed;
  } catch {
    return null;
  }
}

async function saveLegacyJsonStore(store: DataStore): Promise<void> {
  await fs.mkdir(path.dirname(LEGACY_STORE_PATH), { recursive: true });
  await fs.writeFile(LEGACY_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

async function ensureTestWorker(store: DataStore): Promise<DataStore> {
  if (store.users.some((u) => u.username === 'worker')) return store;

  store.users.push({
    id: uuidv4(),
    username: 'worker',
    password: await bcrypt.hash('worker123', 10),
    name: 'Test Worker',
    role: 'worker',
  });
  await writeStore(store);
  return store;
}

async function readLocalStore(): Promise<DataStore> {
  const legacy = await loadLegacyJsonStore();
  const store = legacy ?? (await createFreshStore());
  if (!legacy) await saveLegacyJsonStore(store);
  return ensureTestWorker(await migratePasswords(store));
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
  table: 'users' | 'projects' | 'notifications' | 'rating_entries' | 'project_comments',
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

async function fetchAllFromSupabase(): Promise<DataStore> {
  const supabase = getSupabaseAdmin();

  const [usersRes, projectsRes, notificationsRes, ratingRes, commentsRes, settings] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: true }),
    supabase.from('projects').select('*').order('order_date', { ascending: false }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('rating_entries').select('*').order('created_at', { ascending: false }),
    supabase.from('project_comments').select('*').order('created_at', { ascending: false }),
    fetchSettings(),
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

  if (!isSupabaseConfigured()) {
    store = await readLocalStore();
  } else {
    store = await fetchAllFromSupabase();
    if (store.users.length === 0) {
      const legacy = await loadLegacyJsonStore();
      store = legacy ?? (await createFreshStore());
      await writeStore(store);
      store = await ensureTestWorker(await migratePasswords(store));
    } else {
      store = await ensureTestWorker(await migratePasswords(store));
    }
  }

  setCachedStore(store);
  return store;
}

const ALL_STORE_TABLES: StoreTable[] = [
  'users',
  'projects',
  'notifications',
  'rating_entries',
  'project_comments',
];

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
}

export async function resetStore(): Promise<DataStore> {
  if (!isSupabaseConfigured()) {
    const store = await createFreshStore();
    await saveLegacyJsonStore(store);
    return store;
  }

  const supabase = getSupabaseAdmin();

  await supabase.from('project_comments').delete().gte('created_at', '1970-01-01');
  await supabase.from('rating_entries').delete().gte('created_at', '1970-01-01');
  await supabase.from('notifications').delete().gte('created_at', '1970-01-01');
  await supabase.from('projects').delete().gte('created_at', '1970-01-01');
  await supabase.from('users').delete().gte('created_at', '1970-01-01');

  const store = await createFreshStore();
  await writeStore(store);
  return store;
}
