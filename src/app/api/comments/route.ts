import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/store';
import {
  getProjectComment,
  replaceAdminCommentRating,
  shouldApplyCommentRating,
  upsertProjectComment,
} from '@/lib/comments';
import { getSessionFromRequest, requireAdmin, requireAuth } from '@/lib/session';
import { getWorkerRating, notifyStarRatingChange } from '@/lib/rating';
import { sendSms } from '@/lib/sms';
import { formatAddress } from '@/lib/utils';
import type { CommentSentiment, DataStore, Project } from '@/types';

function commentSmsText(project: Project, sentiment: CommentSentiment, text: string): string {
  const kind = sentiment === 'positive' ? 'Ijobiy izoh' : 'Salbiy izoh';
  const label = formatAddress(project) || project.title;
  const short = text.trim().slice(0, 90);
  return `${kind}: ${label}. "${short}"`;
}

async function afterAdminComment(
  store: DataStore,
  project: Project,
  sentiment: CommentSentiment,
  text: string,
  applyRating: boolean,
) {
  if (applyRating && project.assignedTo) {
    const prev = getWorkerRating(project.assignedTo, store.ratingEntries ?? []).rating;
    replaceAdminCommentRating(store, project.id, project.assignedTo, sentiment);
    notifyStarRatingChange(store, project.assignedTo, prev);
  }

  const worker = store.users.find((u) => u.id === project.assignedTo);
  await sendSms(worker?.phone, commentSmsText(project, sentiment, text));
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 });
  }

  try {
    const store = await readStore();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workerId = searchParams.get('workerId');

    let comments = store.comments ?? [];
    if (projectId) comments = comments.filter((c) => c.projectId === projectId);
    if (workerId) comments = comments.filter((c) => c.workerId === workerId);

    // Workers may only see their own comments.
    if (!requireAdmin(session)) {
      comments = comments.filter((c) => c.workerId === session!.id);
    }

    return NextResponse.json({ comments });
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
    const { projectId, text, sentiment } = body as {
      projectId: string;
      text: string;
      sentiment: CommentSentiment;
    };

    if (!projectId || !text?.trim() || !sentiment) {
      return NextResponse.json({ error: 'Barcha maydonlar kerak' }, { status: 400 });
    }

    const store = await readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project || !project.assignedTo) {
      return NextResponse.json({ error: 'Loyiha topilmadi yoki ishchi tayinlanmagan' }, { status: 404 });
    }

    const existing = getProjectComment(store, projectId);
    const sentimentChanged = !existing || existing.sentiment !== sentiment;

    const comment = upsertProjectComment(store, {
      projectId,
      workerId: project.assignedTo,
      authorId: session!.id,
      text: text.trim(),
      sentiment,
    });

    if (shouldApplyCommentRating(project.status) && (!existing || sentimentChanged)) {
      await afterAdminComment(store, project, sentiment, text.trim(), true);
    } else {
      await afterAdminComment(store, project, sentiment, text.trim(), false);
    }

    await writeStore(store, { tables: ['project_comments', 'rating_entries', 'notifications'] });
    return NextResponse.json({ comment, updated: !!existing });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { projectId, text, sentiment } = body as {
      projectId: string;
      text: string;
      sentiment: CommentSentiment;
    };

    if (!projectId || !text?.trim() || !sentiment) {
      return NextResponse.json({ error: 'Barcha maydonlar kerak' }, { status: 400 });
    }

    const store = await readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project || !project.assignedTo) {
      return NextResponse.json({ error: 'Loyiha topilmadi yoki ishchi tayinlanmagan' }, { status: 404 });
    }

    const existing = getProjectComment(store, projectId);
    if (!existing) {
      return NextResponse.json({ error: 'Izoh topilmadi' }, { status: 404 });
    }

    const sentimentChanged = existing.sentiment !== sentiment;

    const comment = upsertProjectComment(store, {
      projectId,
      workerId: project.assignedTo,
      authorId: session!.id,
      text: text.trim(),
      sentiment,
    });

    if (shouldApplyCommentRating(project.status) && sentimentChanged) {
      await afterAdminComment(store, project, sentiment, text.trim(), true);
    } else {
      await afterAdminComment(store, project, sentiment, text.trim(), false);
    }

    await writeStore(store, { tables: ['project_comments', 'rating_entries', 'notifications'] });
    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
