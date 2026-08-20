import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { getWorkerRating, getWeeklyRanks } from '@/lib/rating';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';
import { isInProgressStatus, sortWorkerActiveProjects } from '@/lib/utils';
import type { CommentWithAuthor, Project, WorkerProfile, WorkerProfileProject } from '@/types';

function mapProject(
  project: Project,
  comments: CommentWithAuthor[],
): WorkerProfileProject {
  return {
    ...project,
    comments: comments.filter((c) => c.projectId === project.id),
  };
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    if (!workerId) {
      return NextResponse.json({ error: 'workerId kerak' }, { status: 400 });
    }

    const store = await readStore();
    const worker = store.users.find((u) => u.id === workerId && u.role === 'worker');
    if (!worker) {
      return NextResponse.json({ error: 'Ishchi topilmadi' }, { status: 404 });
    }

    const rating = getWorkerRating(workerId, store.ratingEntries ?? []);
    const weeklyRank =
      getWeeklyRanks(store).find((entry) => entry.workerId === workerId)?.weeklyRank ?? null;

    const commentsWithAuthors: CommentWithAuthor[] = (store.comments ?? []).map((c) => ({
      ...c,
      authorUsername: store.users.find((u) => u.id === c.authorId)?.username ?? 'admin',
    }));

    const assigned = store.projects.filter((p) => p.assignedTo === workerId);
    const inProgress = sortWorkerActiveProjects(
      assigned.filter((p) => isInProgressStatus(p.status)),
    ).map((p) => mapProject(p, commentsWithAuthors));
    const completed = assigned
      .filter((p) => p.status === 'completed')
      .map((p) => mapProject(p, commentsWithAuthors));
    const returned = assigned
      .filter((p) => p.returnedAt != null)
      .map((p) => mapProject(p, commentsWithAuthors));

    const profile: WorkerProfile = {
      worker: {
        id: worker.id,
        name: worker.name,
        username: worker.username,
        telegramId: worker.telegramId,
      },
      rating,
      weeklyRank,
      inProgress,
      completed,
      returned,
    };

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
