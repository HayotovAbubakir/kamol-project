import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';
import { formatAddress, formatDate, getDeadlineUrgency, getStatusLabel, isInProgressStatus, isTerminalStatus } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const store = await readStore();
    const workers = store.users.filter((u) => u.role === 'worker');

    const summary = workers.map((worker) => {
      const projects = store.projects.filter((p) => p.assignedTo === worker.id);
      const active = projects.filter((p) => isInProgressStatus(p.status));
      const completed = projects.filter((p) => isTerminalStatus(p.status));

      return {
        worker: worker.name,
        telegramId: worker.telegramId,
        activeCount: active.length,
        completedCount: completed.length,
        activeProjects: active.map((p) => ({
          title: p.title,
          address: formatAddress(p),
          status: getStatusLabel(p.status),
          urgency: getDeadlineUrgency(p.orderDate, p.status),
          orderDate: formatDate(p.orderDate),
        })),
        recentCompleted: completed.slice(0, 3).map((p) => ({
          title: p.title,
          address: formatAddress(p),
          completedAt: p.completedAt ? formatDate(p.completedAt) : '-',
        })),
      };
    });

    return NextResponse.json({ summary, totalProjects: store.projects.length });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
