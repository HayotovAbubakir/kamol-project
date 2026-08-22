import { NextRequest, NextResponse } from 'next/server';
import { invalidateStoreCache, readStore, writeStore } from '@/lib/store';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import { notificationFromDb, type DbNotification } from '@/lib/supabase/mappers';
import { getSessionFromRequest, requireAdmin, requireAuth } from '@/lib/session';

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
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    // Non-admin users may only fetch their own notifications.
    const userId = requireAdmin(session)
      ? requestedUserId
      : session!.id;
    const notifications = await fetchNotifications(userId);
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 });
  }

  try {
    const { id, markAllRead, userId: rawUserId } = await request.json();
    // Non-admin users may only affect their own notifications.
    const userId = requireAdmin(session) ? rawUserId : session!.id;

    if (id && !requireAdmin(session)) {
      // Confirm this notification belongs to the caller before marking read.
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('notifications')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();
        if (error || !data || data.user_id !== session!.id) {
          return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
        }
      } else {
        const store = await readStore();
        const target = store.notifications.find((n) => n.id === id);
        if (!target || (target.userId !== session!.id && target.userId !== 'all')) {
          return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
        }
      }
    }

    await markNotificationsRead({ id, userId, markAllRead });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
