import type {
  AppNotification,
  CommentSentiment,
  MonthlySettlement,
  MonthlyWinner,
  MonthlyWinnerView,
  NotificationEvent,
  NotificationType,
  Project,
  ProjectComment,
  ProjectStatus,
  Payment,
  RatingEntry,
  UsedCongratsCombo,
  WorkerReply,
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
  phone?: string | null;
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
    phone: normalizePhone(row.phone ?? undefined),
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
    phone: user.phone ?? null,
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

export interface DbPayment {
  id: string;
  project_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
}

export function paymentFromDb(row: DbPayment): Payment {
  return {
    id: row.id,
    projectId: row.project_id,
    amount: row.amount,
    paidAt: row.paid_at,
    note: row.note ?? undefined,
  };
}

export function paymentToDb(payment: Payment): DbPayment {
  return {
    id: payment.id,
    project_id: payment.projectId,
    amount: payment.amount,
    paid_at: payment.paidAt,
    note: payment.note ?? null,
  };
}

export interface DbWorkerReply {
  id: string;
  project_id: string;
  worker_id: string;
  message: string;
  created_at: string;
}

export function workerReplyFromDb(row: DbWorkerReply): WorkerReply {
  return {
    id: row.id,
    projectId: row.project_id,
    workerId: row.worker_id,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function workerReplyToDb(reply: WorkerReply): DbWorkerReply {
  return {
    id: reply.id,
    project_id: reply.projectId,
    worker_id: reply.workerId,
    message: reply.message,
    created_at: reply.createdAt,
  };
}

export interface DbMonthlyWinner {
  id: string;
  worker_id: string;
  month: string;
  rank: number;
  total_points: number;
  created_at: string;
}

export function monthlyWinnerFromDb(row: DbMonthlyWinner): MonthlyWinner {
  return {
    id: row.id,
    workerId: row.worker_id,
    month: row.month,
    rank: row.rank as 1 | 2 | 3,
    totalPoints: row.total_points,
    createdAt: row.created_at,
  };
}

export function monthlyWinnerToDb(row: MonthlyWinner): DbMonthlyWinner {
  return {
    id: row.id,
    worker_id: row.workerId,
    month: row.month,
    rank: row.rank,
    total_points: row.totalPoints,
    created_at: row.createdAt,
  };
}

export interface DbUsedCongrats {
  id: string;
  worker_id: string;
  rank: number;
  a_index: number;
  b_index: number;
  c_index: number;
  month: string;
  created_at: string;
}

export function usedCongratsFromDb(row: DbUsedCongrats): UsedCongratsCombo {
  return {
    id: row.id,
    workerId: row.worker_id,
    rank: row.rank as 1 | 2 | 3,
    aIndex: row.a_index,
    bIndex: row.b_index,
    cIndex: row.c_index,
    month: row.month,
    createdAt: row.created_at,
  };
}

export function usedCongratsToDb(row: UsedCongratsCombo): DbUsedCongrats {
  return {
    id: row.id,
    worker_id: row.workerId,
    rank: row.rank,
    a_index: row.aIndex,
    b_index: row.bIndex,
    c_index: row.cIndex,
    month: row.month,
    created_at: row.createdAt,
  };
}

export interface DbMonthlySettlement {
  id: string;
  month: string;
  settled_at: string;
}

export function monthlySettlementFromDb(row: DbMonthlySettlement): MonthlySettlement {
  return { id: row.id, month: row.month, settledAt: row.settled_at };
}

export function monthlySettlementToDb(row: MonthlySettlement): DbMonthlySettlement {
  return { id: row.id, month: row.month, settled_at: row.settledAt };
}

export interface DbMonthlyWinnerView {
  id: string;
  worker_id: string;
  month: string;
  seen_at: string;
}

export function monthlyWinnerViewFromDb(row: DbMonthlyWinnerView): MonthlyWinnerView {
  return { id: row.id, workerId: row.worker_id, month: row.month, seenAt: row.seen_at };
}

export function monthlyWinnerViewToDb(row: MonthlyWinnerView): DbMonthlyWinnerView {
  return { id: row.id, worker_id: row.workerId, month: row.month, seen_at: row.seenAt };
}
