import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/store';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  const store = await readStore();
  const admin = store.users.find((u) => u.id === session!.id && u.role === 'admin');
  if (!admin) {
    return NextResponse.json({ error: 'Admin topilmadi' }, { status: 404 });
  }

  return NextResponse.json({
    account: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await readStore();
    const idx = store.users.findIndex((u) => u.id === session!.id && u.role === 'admin');

    if (idx === -1) {
      return NextResponse.json({ error: 'Admin topilmadi' }, { status: 404 });
    }

    const admin = store.users[idx];
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const newPassword = typeof body.password === 'string' ? body.password : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';

    if (username && (username.length < 3 || username.length > 40)) {
      return NextResponse.json({ error: 'Login 3–40 belgi bo\'lishi kerak' }, { status: 400 });
    }
    if (name && (name.length < 2 || name.length > 80)) {
      return NextResponse.json({ error: 'Ism 2–80 belgi bo\'lishi kerak' }, { status: 400 });
    }
    if (newPassword && (newPassword.length < 4 || newPassword.length > 128)) {
      return NextResponse.json({ error: 'Yangi parol kamida 4 belgi bo\'lishi kerak' }, { status: 400 });
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Joriy parolni kiriting' }, { status: 400 });
      }
      if (!(await verifyPassword(currentPassword, admin.password))) {
        return NextResponse.json({ error: 'Joriy parol noto\'g\'ri' }, { status: 400 });
      }
      admin.password = await hashPassword(newPassword);
    }

    if (username && username.toLowerCase() !== admin.username.toLowerCase()) {
      if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== admin.id)) {
        return NextResponse.json({ error: 'Bu login band' }, { status: 400 });
      }
      admin.username = username;
    }

    if (name) admin.name = name;

    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      ok: true,
      account: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
