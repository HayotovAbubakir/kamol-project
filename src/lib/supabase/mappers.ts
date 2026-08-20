import type {
  AppNotification,
  CommentSentiment,
  NotificationEvent,
  NotificationType,
  Project,
  ProjectComment,
  ProjectStatus,
  RatingEntry,
  RatingEntryType,
  User,
  UserRole,
} from '@/types';
import { normalizePhone } from '@/lib/utils';

export interface DbUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  telegram_id: string | null;
}

export interface DbProject {
  id: string;
  title: string;
  client_name: string;
  address: string;
  phone: string | null;
  price: number | null;
  advance_paid: boolean;
  advance_amount: number | null;
  order_date: string;
  assigned_to: string | null;
  status: ProjectStatus;
  completed_at: string | null;
  assigned_at: string | null;
  returned_at: string | null;
  description: string | null;
  notes: string | null;
}

export interface DbRatingEntry {
  id: string;
  worker_id: string;
  project_id: string;
  points: number;
  type: RatingEntryType;
  created_at: string;
}

export interface DbComment {
  id: string;
  project_id: string;
  worker_id: string;
  author_id: string;
  text: string;
  sentiment: CommentSentiment;
  created_at: string;
  updated_at?: string | null;
}

export interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read: boolean;
  type: NotificationType;
  project_id: string | null;
  event: string | null;
}

export interface DbSettings {
  id: number;
  founded_year: number | null;
  version: number;
}

export function userFromDb(row: DbUser): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name,
    role: row.role,
    telegramId: row.telegram_id ?? undefined,
  };
}

export function userToDb(user: User): DbUser {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    name: user.name,
    role: user.role,
    telegram_id: user.telegramId ?? null,
  };
}

export function projectFromDb(row: DbProject): Project {
  return {
    id: row.id,
    title: row.title,
    clientName: row.client_name,
    address: row.address,
    phone: normalizePhone(row.phone ?? undefined),
    price: row.price ?? undefined,
    advancePaid: row.advance_paid,
    advanceAmount: row.advance_amount ?? undefined,
    orderDate: row.order_date,
    assignedTo: row.assigned_to ?? undefined,
    status: row.status,
    completedAt: row.completed_at ?? undefined,
    assignedAt: row.assigned_at ?? undefined,
    returnedAt: row.returned_at ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function projectToDb(project: Project): DbProject {
  return {
    id: project.id,
    title: project.title,
    client_name: project.clientName,
    address: project.address,
    phone: project.phone ?? null,
    price: project.price ?? null,
    advance_paid: project.advancePaid,
    advance_amount: project.advanceAmount ?? null,
    order_date: project.orderDate,
    assigned_to: project.assignedTo ?? null,
    status: project.status,
    completed_at: project.completedAt ?? null,
    assigned_at: project.assignedAt ?? null,
    returned_at: project.returnedAt ?? null,
    description: project.description ?? null,
    notes: project.notes ?? null,
  };
}

export function notificationFromDb(row: DbNotification): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    createdAt: row.created_at,
    read: row.read,
    type: row.type,
    projectId: row.project_id ?? undefined,
    event: (row.event as NotificationEvent | null) ?? undefined,
  };
}

export function notificationToDb(n: AppNotification): DbNotification {
  return {
    id: n.id,
    user_id: n.userId,
    message: n.message,
    created_at: n.createdAt,
    read: n.read,
    type: n.type,
    project_id: n.projectId ?? null,
    event: n.event ?? null,
  };
}

export function ratingEntryFromDb(row: DbRatingEntry): RatingEntry {
  return {
    id: row.id,
    workerId: row.worker_id,
    projectId: row.project_id,
    points: row.points,
    type: row.type,
    createdAt: row.created_at,
  };
}

export function ratingEntryToDb(entry: RatingEntry): DbRatingEntry {
  return {
    id: entry.id,
    worker_id: entry.workerId,
    project_id: entry.projectId,
    points: entry.points,
    type: entry.type,
    created_at: entry.createdAt,
  };
}

export function commentFromDb(row: DbComment): ProjectComment {
  return {
    id: row.id,
    projectId: row.project_id,
    workerId: row.worker_id,
    authorId: row.author_id,
    text: row.text,
    sentiment: row.sentiment,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function commentToDb(c: ProjectComment): DbComment {
  return {
    id: c.id,
    project_id: c.projectId,
    worker_id: c.workerId,
    author_id: c.authorId,
    text: c.text,
    sentiment: c.sentiment,
    created_at: c.createdAt,
    updated_at: c.updatedAt ?? null,
  };
}
