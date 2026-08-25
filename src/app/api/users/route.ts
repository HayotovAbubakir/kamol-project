import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, writeStore } from '@/lib/store';
import { hashPassword } from '@/lib/password';
import { validatePassword } from '@/lib/passwordPolicy';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';
import { releaseWorkerProjects } from '@/lib/notifications';
import { extractUzbekMobileDigits, normalizePhone } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  const store = await readStore();
    const workers = store.users
    .filter((u) => u.role === 'worker')
    .map(({ id, name, username, telegramId, phone }) => ({ id, name, username, telegramId, phone }));

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

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const name = (firstName ? `${firstName} ${lastName}`.trim() : '')
      || (typeof body.name === 'string' ? body.name.trim() : '');
    const password = typeof body.password === 'string' ? body.password : '';
    const phone = extractUzbekMobileDigits(body.phone);

    if (!username || username.length > 128) {
      return NextResponse.json({ error: 'Login kerak' }, { status: 400 });
    }
    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Ism kiritilishi shart' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Telefon raqam kiritilishi shart' }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
    }

    const worker = {
      id: uuidv4(),
      username,
      password: await hashPassword(password),
      name,
      role: 'worker' as const,
      telegramId: body.telegramId || undefined,
      phone: normalizePhone(phone),
    };

    store.users.push(worker);
    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      worker: { id: worker.id, name: worker.name, username: worker.username, telegramId: worker.telegramId, phone: worker.phone },
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

    if (body.name !== undefined || body.firstName !== undefined || body.lastName !== undefined) {
      const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
      const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
      const name = (firstName ? `${firstName} ${lastName}`.trim() : '')
        || (typeof body.name === 'string' ? body.name.trim() : '');
      if (!name || name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: 'Ism kiritilishi shart' }, { status: 400 });
      }
      store.users[idx].name = name;
    }
    if (body.username !== undefined) {
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      if (!username || username.length > 128) {
        return NextResponse.json({ error: 'Login kerak' }, { status: 400 });
      }
      if (username.toLowerCase() !== store.users[idx].username.toLowerCase()) {
        if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== body.id)) {
          return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
        }
        store.users[idx].username = username;
      }
    }
    if (body.telegramId !== undefined) store.users[idx].telegramId = body.telegramId || undefined;
    if (body.phone !== undefined) {
      const phone = extractUzbekMobileDigits(body.phone);
      if (!phone) {
        return NextResponse.json({ error: 'Telefon raqam kiritilishi shart' }, { status: 400 });
      }
      store.users[idx].phone = normalizePhone(phone);
    }
    if (body.password) {
      const passwordError = validatePassword(body.password);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
      store.users[idx].password = await hashPassword(body.password);
    }

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
