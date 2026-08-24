import { NextRequest, NextResponse } from 'next/server';
import {
  addPayment,
  ensureAdvancePayment,
  getPaymentsForProject,
  getRemainingPrice,
  getTotalPaidFromList,
  validatePaymentAmount,
} from '@/lib/payments';
import { readStore, writeStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId kerak' }, { status: 400 });
    }

    const store = await readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (project) {
      ensureAdvancePayment(store, project);
    }
    const payments = getPaymentsForProject(store, projectId);
    const remaining = project ? getRemainingPrice(project, payments) : null;

    return NextResponse.json({
      payments,
      totalPaid: getTotalPaidFromList(payments),
      remaining,
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { projectId, amount, note } = body as {
      projectId?: string;
      amount?: unknown;
      note?: string;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'Loyiha va summa kerak' }, { status: 400 });
    }

    const store = await readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    }

    ensureAdvancePayment(store, project);
    const existing = getPaymentsForProject(store, projectId);
    const validation = validatePaymentAmount(project, existing, amount);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, remaining: validation.remaining },
        { status: 400 },
      );
    }

    addPayment(store, {
      projectId,
      amount: validation.amount,
      note: note?.trim() || undefined,
    });

    await writeStore(store, { tables: ['payments'] });

    const payments = getPaymentsForProject(store, projectId);
    const remaining = getRemainingPrice(project, payments);
    const totalPaid = getTotalPaidFromList(payments);

    return NextResponse.json({
      payments,
      totalPaid,
      remaining,
      fullyPaid: remaining != null && remaining <= 0,
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
