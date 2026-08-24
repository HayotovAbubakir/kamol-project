import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { getWorkerRating, getWeeklyRanks, getWorkerRatingHistory } from '@/lib/rating';
import { getSessionFromRequest, requireAdmin, requireAuth } from '@/lib/session';
import { isInProgressStatus, sortWorkerActiveProjects } from '@/lib/utils';
import type { CommentWithAuthor, Project, WorkerProfile, WorkerProfileProject } from '@/types';

function mapProject(
  project: Project,
  commentsByProject: Map<string, CommentWithAuthor[]>,
  includeComments: boolean,
): WorkerProfileProject {
  return {
    ...project,
    comments: includeComments ? (commentsByProject.get(project.id) ?? []) : [],
  };
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
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

    const isAdmin = requireAdmin(session);
    const isOwner = session!.id === workerId;
    const fullAccess = isAdmin || isOwner;

    const rating = getWorkerRating(workerId, store.ratingEntries ?? []);
    const weeklyRank =
      getWeeklyRanks(store).find((entry) => entry.workerId === workerId)?.weeklyRank ?? null;

    const usersById = new Map<string, (typeof store.users)[number]>();
    for (const u of store.users) usersById.set(u.id, u);

    const commentsByProject = new Map<string, CommentWithAuthor[]>();
    if (fullAccess) {
      for (const c of store.comments ?? []) {
        const enriched: CommentWithAuthor = {
          ...c,
          authorUsername: usersById.get(c.authorId)?.username ?? 'admin',
        };
        const list = commentsByProject.get(c.projectId) ?? [];
        list.push(enriched);
        commentsByProject.set(c.projectId, list);
      }
    }

    const assigned = store.projects.filter((p) => p.assignedTo === workerId);

    let inProgress: WorkerProfileProject[] = [];
    let completed: WorkerProfileProject[] = [];
    let returned: WorkerProfileProject[] = [];

    if (fullAccess) {
      inProgress = sortWorkerActiveProjects(
        assigned.filter((p) => isInProgressStatus(p.status)),
      ).map((p) => mapProject(p, commentsByProject, true));
      completed = assigned
        .filter((p) => p.status === 'completed')
        .map((p) => mapProject(p, commentsByProject, true));
      returned = assigned
        .filter((p) => p.returnedAt != null)
        .map((p) => mapProject(p, commentsByProject, true));
    }

    const profile: WorkerProfile = {
      worker: {
        id: worker.id,
        name: worker.name,
        username: worker.username,
        telegramId: fullAccess ? worker.telegramId : undefined,
        phone: fullAccess ? worker.phone : undefined,
      },
      rating,
      weeklyRank,
      inProgress,
      completed,
      returned,
      ratingHistory: getWorkerRatingHistory(store, workerId),
    };

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
