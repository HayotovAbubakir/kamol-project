import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { verifyPassword } from '@/lib/password';
import type { SessionUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const store = await readStore();
    const user = store.users.find((u) => u.username === username);

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'Login yoki parol noto\'g\'ri' }, { status: 401 });
    }

    const session: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    return NextResponse.json({ user: session });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
