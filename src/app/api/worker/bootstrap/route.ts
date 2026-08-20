import { NextRequest, NextResponse } from 'next/server';
import { getWorkerRating } from '@/lib/rating';
import { readStore } from '@/lib/store';
import { getSessionFromRequest, requireAuth } from '@/lib/session';
import {
  isInProgressStatus,
  sortReturnedProjects,
  sortWorkerActiveProjects,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session) || session!.role !== 'worker') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const store = await readStore();
    const workerId = session!.id;

    const mine = store.projects.filter((p) => p.assignedTo === workerId);

    const activeProjects = sortWorkerActiveProjects(
      mine.filter((p) => isInProgressStatus(p.status)),
    );
    const completedProjects = mine
      .filter((p) => p.status === 'completed')
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    const returnedProjects = sortReturnedProjects(mine.filter((p) => p.returnedAt != null));

    const comments = (store.comments ?? []).filter((c) => c.workerId === workerId);
    const rating = getWorkerRating(workerId, store.ratingEntries ?? []);

    return NextResponse.json(
      {
        activeProjects,
        completedProjects,
        returnedProjects,
        comments,
        rating,
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
