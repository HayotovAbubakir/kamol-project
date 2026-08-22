import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, writeStore } from '@/lib/store';
import { releaseProject } from '@/lib/notifications';
import { getSessionFromRequest, requireAdmin } from '@/lib/session';
import { createRandomPairs } from '@/lib/randomAssign';
import { formatAddress, isInProgressStatus, isTerminalStatus } from '@/lib/utils';
import type { AppNotification, DataStore, Project } from '@/types';

function pushAssignNotification(store: DataStore, project: Project, workerId: string) {
  const notification: AppNotification = {
    id: uuidv4(),
    userId: workerId,
    message: `Sizga yangi loyiha biriktirildi: ${formatAddress(project)}`,
    createdAt: new Date().toISOString(),
    read: false,
    type: 'info',
    event: 'project_assigned',
    projectId: project.id,
  };
  store.notifications.unshift(notification);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await readStore();
    const workers = store.users.filter((u) => u.role === 'worker');

    if (workers.length === 0) {
      return NextResponse.json({ error: 'Avval ishchi qo\'shing' }, { status: 400 });
    }

    if (body.mode === 'unassign') {
      const { projectId } = body as { projectId?: string };
      if (!projectId) {
        return NextResponse.json({ error: 'Loyiha ID kerak' }, { status: 400 });
      }

      const idx = store.projects.findIndex((p) => p.id === projectId);
      if (idx === -1) {
        return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
      }

      if (!isInProgressStatus(store.projects[idx].status)) {
        return NextResponse.json({ error: 'Faqat jarayondagi loyihani olib qo\'yish mumkin' }, { status: 400 });
      }

      if (!releaseProject(store, projectId)) {
        return NextResponse.json({ error: 'Loyihani olib qo\'yib bo\'lmadi' }, { status: 400 });
      }

      await writeStore(store, { tables: ['projects'] });
      return NextResponse.json({ project: store.projects[idx], mode: 'unassign' });
    }

    if (body.mode === 'batch') {
      const assignments = body.assignments as { projectId: string; workerId: string }[] | undefined;
      if (!assignments?.length) {
        return NextResponse.json({ error: 'Tayinlashlar bo\'sh' }, { status: 400 });
      }

      let assigned = 0;
      for (const { projectId, workerId } of assignments) {
        const idx = store.projects.findIndex((p) => p.id === projectId);
        const worker = workers.find((w) => w.id === workerId);
        if (idx === -1 || !worker) continue;
        if (store.projects[idx].status !== 'pending') continue;

        store.projects[idx] = {
          ...store.projects[idx],
          assignedTo: workerId,
          status: 'in_progress',
          assignedAt: new Date().toISOString(),
        };
        pushAssignNotification(store, store.projects[idx], workerId);
        assigned++;
      }

      if (assigned === 0) {
        return NextResponse.json({ error: 'Tayinlash uchun kutilayotgan loyiha topilmadi' }, { status: 400 });
      }

      await writeStore(store, { tables: ['projects', 'notifications'] });
      return NextResponse.json({ assigned, mode: 'batch' });
    }

    if (body.mode === 'random') {
      const pending = store.projects.filter((p) => p.status === 'pending');
      const pairs = createRandomPairs(
        pending,
        workers.map((w) => ({ id: w.id, name: w.name })),
      );
      let assigned = 0;

      for (const pair of pairs) {
        const idx = store.projects.findIndex((p) => p.id === pair.projectId);
        if (idx !== -1) {
          store.projects[idx] = {
            ...store.projects[idx],
            assignedTo: pair.workerId,
            status: 'in_progress',
            assignedAt: new Date().toISOString(),
          };
          pushAssignNotification(store, store.projects[idx], pair.workerId);
          assigned++;
        }
      }

      await writeStore(store, { tables: ['projects', 'notifications'] });
      return NextResponse.json({ assigned, mode: 'random' });
    }

    const { projectId, workerId } = body;
    const idx = store.projects.findIndex((p) => p.id === projectId);

    if (idx === -1) {
      return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    }

    if (isTerminalStatus(store.projects[idx].status)) {
      return NextResponse.json({ error: 'Bu loyiha holati o\'zgartirilmaydi' }, { status: 400 });
    }

    const worker = workers.find((w) => w.id === workerId);
    if (!worker) {
      return NextResponse.json({ error: 'Ishchi topilmadi' }, { status: 404 });
    }

    const previousWorkerId = store.projects[idx].assignedTo;
    store.projects[idx] = {
      ...store.projects[idx],
      assignedTo: workerId,
      status: 'in_progress',
      assignedAt: new Date().toISOString(),
    };
    if (previousWorkerId !== workerId) {
      pushAssignNotification(store, store.projects[idx], workerId);
    }

    await writeStore(store, { tables: ['projects', 'notifications'] });
    return NextResponse.json({ project: store.projects[idx] });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
