export type UserRole = 'admin' | 'worker';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  telegramId?: string;
  phone?: string;
  /** Adminni kim yaratgan (faqat adminlar uchun) */
  createdBy?: string;
}

export type ProjectStatus = 'pending' | 'in_progress' | 'pending_review' | 'completed' | 'rejected' | 'returned';

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

export interface Payment {
  id: string;
  projectId: string;
  amount: number;
  paidAt: string;
  note?: string;
}

export type RatingEntryType =
  | 'completion'
  | 'rejection'
  | 'completion_reversed'
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
  | 'deadline_warning'
  | 'unassigned_warning'
  | 'worker_reply'
  | 'rating_changed'
  | 'monthly_winner';

export interface WorkerReply {
  id: string;
  projectId: string;
  workerId: string;
  message: string;
  createdAt: string;
}

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

export interface MonthlyWinner {
  id: string;
  workerId: string;
  month: string;
  rank: 1 | 2 | 3;
  totalPoints: number;
  createdAt: string;
}

export interface UsedCongratsCombo {
  id: string;
  workerId: string;
  rank: 1 | 2 | 3;
  aIndex: number;
  bIndex: number;
  cIndex: number;
  month: string;
  createdAt: string;
}

export interface MonthlySettlement {
  id: string;
  month: string;
  settledAt: string;
}

export interface MonthlyWinnerView {
  id: string;
  workerId: string;
  month: string;
  seenAt: string;
}

export interface RatingHistoryItem {
  id: string;
  projectId: string;
  projectLabel: string;
  type: RatingEntryType;
  points: number;
  createdAt: string;
  daysToComplete?: number;
}

export interface MonthlyWinRecord {
  month: string;
  rank: 1 | 2 | 3;
  points: number;
  live?: boolean;
}

export interface LocalizedText {
  uz: string;
  ru: string;
  en: string;
}

export interface UnlockedPerk {
  id: string;
  points: number;
  icon: string;
  labelKey: string;
  descKey: string;
  label?: LocalizedText;
  description?: LocalizedText;
  feature?: string;
  unlocked: boolean;
}

export interface WorkerTitleInfo {
  id: string;
  icon: string;
  labelKey: string;
  label?: LocalizedText;
  kind: 'rank' | 'special';
}

export interface WorkerGamificationProfile {
  lifetimePoints: number;
  monthlyWins: MonthlyWinRecord[];
  firstPlaceCount: number;
  currentMonthRank: number | null;
  currentMonthPoints: number;
  lifetimeRank: number | null;
  title: WorkerTitleInfo;
  specialTitles: WorkerTitleInfo[];
  nextTitle: { id: string; labelKey: string; icon: string; minPoints: number } | null;
  perks: UnlockedPerk[];
  nextPerk: UnlockedPerk | null;
  activeFeatures: string[];
  completionStreak: number;
  isLegend: boolean;
  isCurrentMonthChampion: boolean;
  isPointsKing: boolean;
  avatarFrame: 'default' | 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'champion';
  avatarBadge: string;
  designPassFrameClass?: string | null;
  designPassFrameColor?: string | null;
  designPass?: import('@/lib/designPass').DesignPassProfile;
}

export interface HallOfFameEntry {
  workerId: string;
  workerName: string;
  firstPlaceWins: number;
  winMonths: string[];
  lifetimePoints: number;
  lifetimeRank: number | null;
  isLegend: boolean;
  isPointsKing: boolean;
  title: WorkerTitleInfo;
  specialTitles: WorkerTitleInfo[];
  avatarFrame: WorkerGamificationProfile['avatarFrame'];
  avatarBadge: string;
}

export interface MonthlyLeaderboardEntry {
  workerId: string;
  workerName: string;
  monthlyPoints: number;
  rank: number;
  firstPlaceWins?: number;
  lifetimePoints?: number;
  lifetimeRank?: number | null;
  isLegend?: boolean;
  isPointsKing?: boolean;
  isCurrentMonthChampion?: boolean;
  winMonths?: string[];
  title?: WorkerTitleInfo;
  specialTitles?: WorkerTitleInfo[];
  avatarFrame?: WorkerGamificationProfile['avatarFrame'];
  avatarBadge?: string;
}

export interface PendingCongrats {
  month: string;
  rank: 1 | 2 | 3;
  totalPoints: number;
}

export interface DataStore {
  version?: number;
  foundedYear?: number;
  users: User[];
  projects: Project[];
  notifications: AppNotification[];
  ratingEntries: RatingEntry[];
  comments: ProjectComment[];
  payments: Payment[];
  workerReplies: WorkerReply[];
  monthlyWinners: MonthlyWinner[];
  usedCongratsCombos: UsedCongratsCombo[];
  monthlySettlements: MonthlySettlement[];
  monthlyWinnerViews: MonthlyWinnerView[];
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
  phone?: string;
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
  gamification: WorkerGamificationProfile;
  inProgress: WorkerProfileProject[];
  completed: WorkerProfileProject[];
  returned: WorkerProfileProject[];
  ratingHistory: RatingHistoryItem[];
}
