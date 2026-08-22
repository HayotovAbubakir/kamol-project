import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAuth } from '@/lib/session';
import { createWorkerReplyAndNotify, isWorkerReplyAllowed } from '@/lib/workerReplies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session) || session!.role !== 'worker') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { projectId, message } = body as { projectId?: string; message?: string };

    if (!projectId || !message?.trim()) {
      return NextResponse.json({ error: 'Loyiha va izoh matni kerak' }, { status: 400 });
    }

    const store = await readStore();
    const project = store.projects.find((p) => p.id === projectId);

    if (!project) {
      return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    }

    if (!isWorkerReplyAllowed(project, session!.id)) {
      return NextResponse.json(
        { error: 'Faqat sizga biriktirilgan qaytarilgan loyihaga javob yozish mumkin' },
        { status: 403 },
      );
    }

    const reply = createWorkerReplyAndNotify(store, {
      projectId,
      workerId: session!.id,
      message: message.trim(),
    });

    await writeStore(store, { tables: ['worker_replies', 'notifications'] });

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server xatoligi';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
