import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, writeStore } from '@/lib/store';
import { hashPassword } from '@/lib/password';
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
    .map(({ id, name, username }) => ({ id, name, username }));

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

    if (!username || username.length < 3 || username.length > 40) {
      return NextResponse.json({ error: 'Login 3–40 belgi bo\'lishi kerak' }, { status: 400 });
    }
    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'Ism 2–80 belgi bo\'lishi kerak' }, { status: 400 });
    }
    if (!password || password.length < 4 || password.length > 128) {
      return NextResponse.json({ error: 'Parol kamida 4 belgi bo\'lishi kerak' }, { status: 400 });
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
    };

    store.users.push(admin);
    await writeStore(store, { tables: ['users'] });

    return NextResponse.json({
      admin: { id: admin.id, name: admin.name, username: admin.username },
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
