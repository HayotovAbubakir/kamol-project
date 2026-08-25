import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, writeStore } from '@/lib/store';
import { hashPassword } from '@/lib/password';
import { validatePassword } from '@/lib/passwordPolicy';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  const store = await readStore();
  const admins = store.users
    .filter((u) => u.role === 'admin')
    .map(({ id, name, username, createdBy }) => ({
      id,
      name,
      username,
      createdBy: createdBy ?? null,
      canDelete: id !== session!.id,
      canEdit: id !== session!.id,
    }));

  return NextResponse.json({ admins });
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || username.length > 128) {
      return NextResponse.json({ error: 'Login kerak' }, { status: 400 });
    }
    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Ism 2–80 belgi bo\'lishi kerak' }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
    }

    const admin = {
      id: uuidv4(),
      username,
      password: await hashPassword(password),
      name,
      role: 'admin' as const,
      createdBy: session!.id,
    };

    store.users.push(admin);
    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      admin: { id: admin.id, name: admin.name, username: admin.username, createdBy: admin.createdBy },
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
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 });
    if (id === session!.id) {
      return NextResponse.json(
        { error: 'O\'z akkauntingizni «Mening akkauntim» bo\'limidan tahrirlang' },
        { status: 400 },
      );
    }

    const store = await readStore();
    const admin = store.users.find((u) => u.id === id && u.role === 'admin');
    if (!admin) {
      return NextResponse.json({ error: 'Admin topilmadi' }, { status: 404 });
    }

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (username && username.length > 128) {
      return NextResponse.json({ error: 'Login juda uzun' }, { status: 400 });
    }
    if (name && (name.length < 2 || name.length > 80)) {
      return NextResponse.json({ error: 'Ism 2–80 belgi bo\'lishi kerak' }, { status: 400 });
    }
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
      admin.password = await hashPassword(password);
    }
    if (username && username.toLowerCase() !== admin.username.toLowerCase()) {
      if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== admin.id)) {
        return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
      }
      admin.username = username;
    }
    if (name) admin.name = name;

    if (!username && !name && !password) {
      return NextResponse.json({ error: 'O\'zgartirish uchun ma\'lumot kiriting' }, { status: 400 });
    }

    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      ok: true,
      admin: { id: admin.id, name: admin.name, username: admin.username, createdBy: admin.createdBy ?? null },
    });
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

    if (id === session!.id) {
      return NextResponse.json({ error: 'O\'zingizni o\'chira olmaysiz' }, { status: 400 });
    }

    const store = await readStore();
    const target = store.users.find((u) => u.id === id && u.role === 'admin');
    if (!target) {
      return NextResponse.json({ error: 'Admin topilmadi' }, { status: 404 });
    }

    const adminCount = store.users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Oxirgi adminni o\'chirib bo\'lmaydi' }, { status: 400 });
    }

    store.users = store.users.filter((u) => u.id !== id);
    store.notifications = store.notifications.filter((n) => n.userId !== id);
    await writeStore(store, { tables: ['users', 'notifications'] });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
