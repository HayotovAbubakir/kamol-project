import { v4 as uuidv4 } from 'uuid';
import type { DataStore, Project } from '@/types';
import { formatAddress, getDeadlineUrgency, isInProgressStatus, isTerminalStatus } from '@/lib/utils';

export function syncDeadlineNotifications(store: DataStore): { store: DataStore; changed: boolean } {
  const now = new Date();
  let changed = false;

  for (const project of store.projects) {
    if (isTerminalStatus(project.status)) continue;

    const urgency = getDeadlineUrgency(project.orderDate, project.status);
    if (!urgency || urgency === 'green') continue;

    const adminId = store.users.find((u) => u.role === 'admin')?.id;
    if (!adminId) continue;

    // Include read notifications too: once we've notified the admin about this
    // (project, urgency), never re-notify — reading the notification does not
    // reset the "warned" state.
    const exists = store.notifications.some(
      (n) =>
        n.projectId === project.id &&
        n.userId === adminId &&
        n.type === (urgency === 'red' ? 'danger' : 'warning'),
    );

    if (!exists) {
      const message =
        urgency === 'red'
          ? `MUDDAT O'TDI: ${formatAddress(project)}`
          : `Diqqat: ${formatAddress(project)} — 3-kun muddat yaqinlashmoqda`;

      store.notifications.unshift({
        id: uuidv4(),
        userId: adminId,
        message,
        createdAt: now.toISOString(),
        read: false,
        type: urgency === 'red' ? 'danger' : 'warning',
        event: urgency === 'red' ? 'deadline_overdue' : 'deadline_warning',
        projectId: project.id,
      });
      changed = true;
    }
  }

  return { store, changed };
}

let lastDeadlineSyncAt = 0;
const DEADLINE_SYNC_MS = 60_000;

/** Muddat bildirishnomalarini kamida 60 soniyada bir marta sinxronlaydi */
export function maybeSyncDeadlineNotifications(store: DataStore): { store: DataStore; changed: boolean } {
  if (Date.now() - lastDeadlineSyncAt < DEADLINE_SYNC_MS) {
    return { store, changed: false };
  }
  const result = syncDeadlineNotifications(store);
  if (result.changed) lastDeadlineSyncAt = Date.now();
  return result;
}

export function getWorkerActiveCount(store: DataStore, workerId: string): number {
  return store.projects.filter(
    (p) => p.assignedTo === workerId && isInProgressStatus(p.status),
  ).length;
}

export function releaseProject(store: DataStore, projectId: string): boolean {
  const idx = store.projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return false;

  const project = store.projects[idx];
  if (!isInProgressStatus(project.status)) return false;

  store.projects[idx] = {
    ...project,
    status: 'pending',
    assignedTo: undefined,
    assignedAt: undefined,
  };
  return true;
}

export function releaseWorkerProjects(store: DataStore, workerId: string): number {
  let released = 0;
  for (const project of store.projects) {
    if (project.assignedTo !== workerId || !isInProgressStatus(project.status)) continue;
    if (releaseProject(store, project.id)) released++;
  }
  return released;
}

export function sanitizeProject(project: Project) {
  return project;
}
