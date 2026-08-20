export type UserRole = 'admin' | 'worker';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  telegramId?: string;
}

export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'returned';

export interface Project {
  id: string;
  title: string;
  clientName: string;
  address: string;
  phone?: string;
  price?: number;
  advancePaid: boolean;
  advanceAmount?: number;
  orderDate: string;
  assignedTo?: string;
  status: ProjectStatus;
  completedAt?: string;
  assignedAt?: string;
  returnedAt?: string;
  description?: string;
  notes?: string;
}

export type RatingEntryType =
  | 'completion'
  | 'rejection'
  | 'admin_comment_positive'
  | 'admin_comment_negative';

export interface RatingEntry {
  id: string;
  workerId: string;
  projectId: string;
  points: number;
  type: RatingEntryType;
  createdAt: string;
}

export interface WorkerRating {
  workerId: string;
  totalPoints: number;
  totalCount: number;
  rating: number;
}

export interface WeeklyLeaderboardEntry {
  workerId: string;
  workerName: string;
  weeklyPoints: number;
  rejectionCount: number;
  allTimeRating: number;
}

export interface WeeklyRankEntry {
  workerId: string;
  workerName: string;
  weeklyRank: number | null;
}

export type NotificationType = 'info' | 'warning' | 'danger';

export type NotificationEvent =
  | 'project_completed'
  | 'project_returned'
  | 'new_order'
  | 'project_assigned'
  | 'deadline_overdue'
  | 'deadline_warning';

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: NotificationType;
  projectId?: string;
  event?: NotificationEvent;
}

export type CommentSentiment = 'positive' | 'negative';

export interface ProjectComment {
  id: string;
  projectId: string;
  workerId: string;
  authorId: string;
  text: string;
  sentiment: CommentSentiment;
  createdAt: string;
  updatedAt?: string;
}

export interface DataStore {
  version?: number;
  foundedYear?: number;
  users: User[];
  projects: Project[];
  notifications: AppNotification[];
  ratingEntries: RatingEntry[];
  comments: ProjectComment[];
}

export type DeadlineUrgency = 'green' | 'yellow' | 'red';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface WorkerSummary {
  id: string;
  name: string;
  username: string;
  telegramId?: string;
}

export interface CommentWithAuthor extends ProjectComment {
  authorUsername: string;
}

export interface WorkerProfileProject extends Project {
  comments: CommentWithAuthor[];
}

export interface WorkerProfile {
  worker: WorkerSummary;
  rating: WorkerRating;
  weeklyRank: number | null;
  inProgress: WorkerProfileProject[];
  completed: WorkerProfileProject[];
  returned: WorkerProfileProject[];
}
