import { v4 as uuidv4 } from 'uuid';
import type { DataStore, WorkerReply } from '@/types';
import { formatAddress } from '@/lib/utils';
import { sendAdminSms } from '@/lib/sms';
import type { WorkerReplyNotificationPayload } from '@/lib/notificationHelpers';

export function isWorkerReplyAllowed(
  project: { assignedTo?: string; returnedAt?: string },
  workerId: string,
): boolean {
  return project.assignedTo === workerId && project.returnedAt != null;
}

export function createWorkerReplyAndNotify(
  store: DataStore,
  params: { projectId: string; workerId: string; message: string },
): WorkerReply {
  if (!store.workerReplies) store.workerReplies = [];

  const project = store.projects.find((p) => p.id === params.projectId);
  if (!project) throw new Error('Loyiha topilmadi');
  if (!isWorkerReplyAllowed(project, params.workerId)) {
    throw new Error('Faqat qaytarilgan loyihaga javob yozish mumkin');
  }

  const worker = store.users.find((u) => u.id === params.workerId);
  const createdAt = new Date().toISOString();

  const reply: WorkerReply = {
    id: uuidv4(),
    projectId: params.projectId,
    workerId: params.workerId,
    message: params.message.trim(),
    createdAt,
  };

  store.workerReplies.push(reply);

  const admin = store.users.find((u) => u.role === 'admin');
  if (admin) {
    const payload: WorkerReplyNotificationPayload = {
      workerName: worker?.name ?? 'Ishchi',
      projectTitle: project.title,
      clientName: project.clientName,
      address: formatAddress(project) || project.clientName || project.title,
      returnReason: project.notes?.trim() ?? '',
      reply: reply.message,
      repliedAt: createdAt,
    };

    store.notifications.unshift({
      id: uuidv4(),
      userId: admin.id,
      message: JSON.stringify(payload),
      createdAt,
      read: false,
      type: 'info',
      event: 'worker_reply',
      projectId: project.id,
    });

    const smsText = [
      `Javob: ${payload.workerName}`,
      payload.address,
      payload.returnReason ? `Sabab: ${payload.returnReason}` : '',
      `"${payload.reply}"`,
      createdAt.slice(0, 16).replace('T', ' '),
    ]
      .filter(Boolean)
      .join('\n');

    void sendAdminSms(smsText);
  }

  return reply;
}
