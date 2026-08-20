import type { NotificationEvent } from '@/types';

export function inferNotificationEvent(message: string): NotificationEvent | undefined {
  if (message.includes('qaytarildi')) return 'project_returned';
  if (message.includes('tugallandi')) return 'project_completed';
  if (message.startsWith('Yangi buyurtma')) return 'new_order';
  if (message.includes('biriktirildi')) return 'project_assigned';
  if (message.startsWith('MUDDAT')) return 'deadline_overdue';
  if (message.startsWith('Diqqat:')) return 'deadline_warning';
  return undefined;
}

export function getWorkerName(
  users: { id: string; name: string }[],
  workerId?: string,
): string | undefined {
  if (!workerId) return undefined;
  return users.find((u) => u.id === workerId)?.name;
}
