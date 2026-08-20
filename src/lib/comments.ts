import { v4 as uuidv4 } from 'uuid';
import { RATING_POINTS } from './ratingConfig';
import type { CommentSentiment, DataStore, ProjectComment, RatingEntryType } from '@/types';

export function getProjectComment(store: DataStore, projectId: string): ProjectComment | undefined {
  return (store.comments ?? []).find((c) => c.projectId === projectId);
}

export function upsertProjectComment(
  store: DataStore,
  data: {
    projectId: string;
    workerId: string;
    authorId: string;
    text: string;
    sentiment: CommentSentiment;
  },
): ProjectComment {
  if (!store.comments) store.comments = [];
  const now = new Date().toISOString();
  const existingIdx = store.comments.findIndex((c) => c.projectId === data.projectId);

  if (existingIdx !== -1) {
    const prev = store.comments[existingIdx];
    store.comments[existingIdx] = {
      ...prev,
      text: data.text,
      sentiment: data.sentiment,
      authorId: data.authorId,
      updatedAt: now,
    };
    return store.comments[existingIdx];
  }

  const comment: ProjectComment = {
    id: uuidv4(),
    projectId: data.projectId,
    workerId: data.workerId,
    authorId: data.authorId,
    text: data.text,
    sentiment: data.sentiment,
    createdAt: now,
  };
  store.comments.push(comment);
  return comment;
}

export function replaceAdminCommentRating(
  store: DataStore,
  projectId: string,
  workerId: string,
  sentiment: CommentSentiment,
): void {
  if (!store.ratingEntries) store.ratingEntries = [];

  store.ratingEntries = store.ratingEntries.filter(
    (r) =>
      !(
        r.projectId === projectId &&
        (r.type === 'admin_comment_positive' || r.type === 'admin_comment_negative')
      ),
  );

  const type: RatingEntryType =
    sentiment === 'positive' ? 'admin_comment_positive' : 'admin_comment_negative';
  const points =
    sentiment === 'positive' ? RATING_POINTS.COMMENT_POSITIVE : RATING_POINTS.COMMENT_NEGATIVE;

  store.ratingEntries.push({
    id: uuidv4(),
    workerId,
    projectId,
    points,
    type,
    createdAt: new Date().toISOString(),
  });
}

export function shouldApplyCommentRating(projectStatus: string): boolean {
  return projectStatus === 'completed';
}
