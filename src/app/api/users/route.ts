import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, writeStore } from '@/lib/store';
import { hashPassword } from '@/lib/password';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';
import { releaseWorkerProjects } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  const store = await readStore();
  const workers = store.users
    .filter((u) => u.role === 'worker')
    .map(({ id, name, username, telegramId }) => ({ id, name, username, telegramId }));

  return NextResponse.json({ workers });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await readStore();

    if (store.users.some((u) => u.username === body.username)) {
      return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
    }

    const worker = {
      id: uuidv4(),
      username: body.username,
      password: await hashPassword(body.password),
      name: body.name,
      role: 'worker' as const,
      telegramId: body.telegramId || undefined,
    };

    store.users.push(worker);
    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      worker: { id: worker.id, name: worker.name, username: worker.username, telegramId: worker.telegramId },
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await readStore();
    const idx = store.users.findIndex((u) => u.id === body.id && u.role === 'worker');

    if (idx === -1) {
      return NextResponse.json({ error: 'Ishchi topilmadi' }, { status: 404 });
    }

    if (body.name) store.users[idx].name = body.name;
    if (body.username && body.username !== store.users[idx].username) {
      if (store.users.some((u) => u.username === body.username && u.id !== body.id)) {
        return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
      }
      store.users[idx].username = body.username;
    }
    if (body.telegramId !== undefined) store.users[idx].telegramId = body.telegramId || undefined;
    if (body.password) store.users[idx].password = await hashPassword(body.password);

    await writeStore(store, { tables: ['users'] });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 });

    const store = await readStore();
    const user = store.users.find((u) => u.id === id && u.role === 'worker');

    if (!user) {
      return NextResponse.json({ error: 'Ishchi topilmadi' }, { status: 404 });
    }

    releaseWorkerProjects(store, id);

    store.users = store.users.filter((u) => u.id !== id);
    store.notifications = store.notifications.filter((n) => n.userId !== id);
    await writeStore(store, { tables: ['users', 'projects', 'notifications'] });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
