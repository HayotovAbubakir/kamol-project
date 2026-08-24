import type { NotificationEvent } from '@/types';

export function inferNotificationEvent(message: string): NotificationEvent | undefined {
  if (message.startsWith('{') && message.includes('"reply"')) return 'worker_reply';
  if (message.includes('qaytarildi')) return 'project_returned';
  if (message.includes('tugallandi')) return 'project_completed';
  if (message.startsWith('Yangi buyurtma')) return 'new_order';
  if (message.includes('biriktirildi')) return 'project_assigned';
  if (message.startsWith('MUDDAT')) return 'deadline_overdue';
  if (message.includes('ishchiga biriktirilmagan')) return 'unassigned_warning';
  if (message.startsWith('Diqqat:')) return 'deadline_warning';
  if (message.includes('Reytingingiz yangilandi')) return 'rating_changed';
  if (message.includes('Tabriklaymiz') || message.includes('TOP-3') || message.includes('🥇') || message.includes('🥈') || message.includes('🥉') || message.includes('🏆')) {
    return 'monthly_winner';
  }
  return undefined;
}

export function getWorkerName(
  users: { id: string; name: string }[],
  workerId?: string,
): string | undefined {
  if (!workerId) return undefined;
  return users.find((u) => u.id === workerId)?.name;
}

export interface ParsedNotificationMessage {
  headline: string;
  workerName?: string;
  notes?: string;
  action?: 'completed' | 'returned';
}

export interface WorkerReplyNotificationPayload {
  workerName: string;
  projectTitle: string;
  clientName: string;
  address: string;
  returnReason: string;
  reply: string;
  repliedAt: string;
}

export function parseWorkerReplyNotification(
  message: string,
): WorkerReplyNotificationPayload | null {
  try {
    const data = JSON.parse(message) as WorkerReplyNotificationPayload;
    if (!data?.workerName || !data?.reply) return null;
    return data;
  } catch {
    return null;
  }
}

import { getPersonInitials } from '@/lib/personAvatar';

function workerInitials(name: string): string {
  return getPersonInitials(name);
}

export function getWorkerInitials(name: string): string {
  return workerInitials(name);
}

/** Eski va yangi formatdagi xabarlarni card uchun ajratadi */
export function parseNotificationMessage(message: string): ParsedNotificationMessage {
  const workerMatch = message.match(/·\s*Ishchi:\s*(.+?)(?:\s*·\s*|$)/i);
  const workerName = workerMatch?.[1]?.trim() || undefined;
  let body = message;
  if (workerMatch) {
    body = message.replace(/\s*·\s*Ishchi:\s*.+?(?=\s*·\s*|$)/i, '').trim();
  }

  const workerReturn = body.match(/^Loyiha qaytarildi:\s*(.+?)\s*—\s*(.+)$/i);
  if (workerReturn) {
    return {
      headline: `${workerReturn[1].trim()} qaytarildi`,
      notes: workerReturn[2].trim(),
      action: 'returned',
      workerName,
    };
  }

  const completed = body.match(/^(.+?)\s+tugallandi(?:\s*—\s*(.+))?$/i);
  if (completed) {
    const left = completed[1].trim();
    const afterDash = completed[2]?.trim();
    const address = afterDash || left;
    return {
      headline: `${address} tugallandi`,
      action: 'completed',
      workerName,
    };
  }

  const returned = body.match(/^(.+?)\s+qaytarildi(?:\s*—\s*(.+))?$/i);
  if (returned) {
    const left = returned[1].trim();
    const after = returned[2]?.trim();
    if (after) {
      const parts = after.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
      const address = parts[0] || left;
      const notes = parts.slice(1).join(' · ') || undefined;
      return {
        headline: `${address} qaytarildi`,
        notes,
        action: 'returned',
        workerName,
      };
    }
    return {
      headline: `${left} qaytarildi`,
      action: 'returned',
      workerName,
    };
  }

  return { headline: message, workerName };
}
