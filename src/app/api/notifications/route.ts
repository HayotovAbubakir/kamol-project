import { NextRequest, NextResponse } from 'next/server';
import { invalidateStoreCache, readStore, writeStore } from '@/lib/store';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import { notificationFromDb, type DbNotification } from '@/lib/supabase/mappers';

async function markNotificationsRead(options: { id?: string; userId?: string; markAllRead?: boolean }) {
  const { id, userId, markAllRead } = options;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    if (markAllRead && userId) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);
      if (error) throw error;
    } else if (id) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    } else {
      throw new Error('Noto\'g\'ri so\'rov');
    }

    invalidateStoreCache();
    return;
  }

  const store = await readStore();

  if (markAllRead && userId) {
    store.notifications = store.notifications.map((n) =>
      n.userId === userId || n.userId === 'all' ? { ...n, read: true } : n,
    );
  } else if (id) {
    const idx = store.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) store.notifications[idx].read = true;
  } else {
    throw new Error('Noto\'g\'ri so\'rov');
  }

  await writeStore(store, { tables: ['notifications'] });
}

async function fetchNotifications(userId: string | null) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as DbNotification[]).map(notificationFromDb);
  }

  const store = await readStore();
  let notifications = [...store.notifications];
  if (userId) {
    notifications = notifications.filter((n) => n.userId === userId || n.userId === 'all');
  }
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return notifications.slice(0, 50);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const notifications = await fetchNotifications(userId);
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, markAllRead, userId } = await request.json();
    await markNotificationsRead({ id, userId, markAllRead });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
