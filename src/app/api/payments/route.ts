import { NextRequest, NextResponse } from 'next/server';
import {
  addPayment,
  ensureAdvancePayment,
  getPaymentsForProject,
  getRemainingPrice,
  getTotalPaidFromList,
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
    const payments = getPaymentsForProject(store, projectId);
    const project = store.projects.find((p) => p.id === projectId);
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
      amount?: number;
      note?: string;
    };

    if (!projectId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Loyiha va summa kerak' }, { status: 400 });
    }

    const store = await readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    }
    if (project.price == null || project.price <= 0) {
      return NextResponse.json({ error: 'Loyiha narxi kiritilmagan' }, { status: 400 });
    }

    const existing = getPaymentsForProject(store, projectId);
    const remainingBefore = getRemainingPrice(project, existing) ?? project.price;
    const roundedAmount = Math.round(amount);

    if (roundedAmount > remainingBefore) {
      return NextResponse.json(
        {
          error: `Kiritilgan summa qolgan narxdan (${remainingBefore.toLocaleString('uz-UZ')} so'm) katta`,
          remaining: remainingBefore,
        },
        { status: 400 },
      );
    }

    addPayment(store, {
      projectId,
      amount: roundedAmount,
      note: note?.trim() || undefined,
    });

    if (project.advancePaid && project.advanceAmount && !existing.some((p) => p.note === 'Avans')) {
      ensureAdvancePayment(store, project);
    }

    await writeStore(store, { tables: ['payments'] });

    const payments = getPaymentsForProject(store, projectId);
    const remaining = getRemainingPrice(project, payments);

    return NextResponse.json({
      payments,
      totalPaid: getTotalPaidFromList(payments),
      remaining,
      fullyPaid: remaining != null && remaining <= 0,
    });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
