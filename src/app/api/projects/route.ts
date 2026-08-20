import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, writeStore } from '@/lib/store';
import { maybeSyncDeadlineNotifications } from '@/lib/notifications';
import { getSessionFromRequest, requireAdmin, requireAuth } from '@/lib/session';
import { createRatingEntry } from '@/lib/rating';
import { getWorkerName } from '@/lib/notificationHelpers';
import { isInProgressStatus, isTerminalStatus, normalizePhone, sortReturnedProjects, sortWorkerActiveProjects, validateProjectPricing } from '@/lib/utils';
import { upsertProjectComment } from '@/lib/comments';
import type { Project, ProjectStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    let store = await readStore();
    const synced = maybeSyncDeadlineNotifications(store);
    if (synced.changed) {
      await writeStore(synced.store, { tables: ['notifications'] });
    }
    store = synced.store;

    const session = await getSessionFromRequest(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let projects = [...store.projects];

    if (role === 'worker' && userId) {
      projects = projects.filter((p) => p.assignedTo === userId);
    }

    if (status === 'completed') {
      projects = projects.filter((p) => p.status === 'completed');
    } else if (status === 'finished') {
      projects = projects.filter((p) => p.status === 'completed' || p.status === 'returned');
    } else if (status === 'returned') {
      projects = projects.filter((p) => p.returnedAt != null);
      projects = sortReturnedProjects(projects);
    } else if (status === 'active') {
      projects = projects.filter((p) => isInProgressStatus(p.status));
      projects = sortWorkerActiveProjects(projects);
    } else if (status === 'pending') {
      projects = projects.filter((p) => p.status === 'pending');
    }

    if (status !== 'active' && status !== 'returned') {
      projects.sort(
        (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
      );
    }

    const workers = store.users
      .filter((u) => u.role === 'worker')
      .map(({ id, name, username }) => ({ id, name, username }));

    return NextResponse.json({ projects, workers, session: session?.role ?? null });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await readStore();

    const project: Project = {
      id: uuidv4(),
      title: body.title || body.clientName,
      clientName: body.clientName,
      address: body.address,
      phone: normalizePhone(body.phone) || undefined,
      price: body.price ? Number(body.price) : undefined,
      advancePaid: !!body.advancePaid,
      advanceAmount: body.advancePaid && body.advanceAmount ? Number(body.advanceAmount) : undefined,
      orderDate: new Date().toISOString(),
      status: 'pending',
      description: body.description || undefined,
    };

    const pricingError = validateProjectPricing(project);
    if (pricingError) {
      return NextResponse.json({ error: pricingError }, { status: 400 });
    }

    store.projects.push(project);

    await writeStore(store, { tables: ['projects'] });
    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const store = await readStore();
    const idx = store.projects.findIndex((p) => p.id === body.id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    }

    const project = store.projects[idx];

    if (session!.role === 'worker' && project.assignedTo !== session!.id) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const updates: Partial<Project> = {};
    const isReturnAction = body.status === 'returned';

    if (isReturnAction) {
      if (session!.role !== 'admin') {
        return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
      }
      if (project.status !== 'completed') {
        return NextResponse.json({ error: 'Faqat tugallangan loyihani qaytarish mumkin' }, { status: 400 });
      }
      if (!body.notes?.trim()) {
        return NextResponse.json({ error: 'Qaytarish sababi majburiy' }, { status: 400 });
      }
      updates.status = 'in_progress';
      updates.returnedAt = new Date().toISOString();
      updates.completedAt = undefined;
      updates.notes = body.notes.trim();
    } else if (body.status) {
      if (session!.role === 'worker' && body.status !== 'completed') {
        return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
      }
      if (isTerminalStatus(project.status) && body.status !== project.status) {
        return NextResponse.json({ error: 'Bu loyiha holati o\'zgartirilmaydi' }, { status: 400 });
      }
      updates.status = body.status as ProjectStatus;
      if (body.status === 'completed') {
        updates.completedAt = new Date().toISOString();
        updates.returnedAt = undefined;
      } else if (isTerminalStatus(body.status)) {
        updates.completedAt = new Date().toISOString();
      }
    }

    if (body.notes !== undefined && !isReturnAction) {
      if (session!.role === 'worker') {
        // Ishchi izohi qaytarish sababini o'chirmasligi uchun description ga yoziladi
        updates.description = typeof body.notes === 'string' ? body.notes.trim() : '';
      } else {
        updates.notes = typeof body.notes === 'string' ? body.notes.trim() : body.notes;
      }
    }

    if (body.description !== undefined) {
      if (session!.role === 'admin' || session!.role === 'worker') {
        updates.description = body.description;
      }
    }

    if (body.assignedTo !== undefined && session!.role === 'admin') {
      updates.assignedTo = body.assignedTo;
    }

    if (session!.role === 'admin') {
      if (body.title) updates.title = body.title;
      if (body.clientName) updates.clientName = body.clientName;
      if (body.address) updates.address = body.address;
      if (body.phone !== undefined) updates.phone = normalizePhone(body.phone) || undefined;
      if (body.price !== undefined) updates.price = body.price ? Number(body.price) : undefined;
      if (body.advancePaid !== undefined) updates.advancePaid = !!body.advancePaid;
      if (body.advanceAmount !== undefined) {
        updates.advanceAmount = body.advanceAmount ? Number(body.advanceAmount) : undefined;
      }
      if (updates.advancePaid === false) {
        updates.advanceAmount = undefined;
      }
    }

    const mergedForValidation = { ...project, ...updates };
    if (!mergedForValidation.advancePaid) {
      mergedForValidation.advanceAmount = undefined;
    }
    if (
      session!.role === 'admin' &&
      (body.price !== undefined || body.advancePaid !== undefined || body.advanceAmount !== undefined)
    ) {
      const pricingError = validateProjectPricing(mergedForValidation);
      if (pricingError) {
        return NextResponse.json({ error: pricingError }, { status: 400 });
      }
    }

    store.projects[idx] = mergedForValidation;
    if (isReturnAction) {
      delete store.projects[idx].completedAt;
    } else if (body.status === 'completed') {
      delete store.projects[idx].returnedAt;
    }
    const updated = store.projects[idx];
    const statusChanged = isReturnAction || (body.status && body.status !== project.status);

    if (statusChanged && isTerminalStatus(updated.status) && updated.assignedTo && !isReturnAction) {
      if (!store.ratingEntries) store.ratingEntries = [];
      store.ratingEntries.push(createRatingEntry(updated, store));
    }

    if (isReturnAction && updated.assignedTo) {
      if (!store.ratingEntries) store.ratingEntries = [];
      store.ratingEntries = store.ratingEntries.filter((e) => e.projectId !== updated.id);
      store.ratingEntries.push(
        createRatingEntry({ ...updated, status: 'returned' }, store),
      );

      upsertProjectComment(store, {
        projectId: updated.id,
        workerId: updated.assignedTo,
        authorId: session!.id,
        text: body.notes.trim(),
        sentiment: 'negative',
      });

      const workerName = getWorkerName(store.users, updated.assignedTo) ?? 'Ishchi';
      const admin = store.users.find((u) => u.role === 'admin');

      store.notifications.unshift({
        id: uuidv4(),
        userId: updated.assignedTo,
        message: `Loyiha qaytarildi: ${updated.clientName} — ${body.notes.trim()}`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'warning',
        event: 'project_returned',
        projectId: updated.id,
      });

      if (admin) {
        store.notifications.unshift({
          id: uuidv4(),
          userId: admin.id,
          message: `${updated.clientName} qaytarildi — ${updated.address} · Ishchi: ${workerName} · ${body.notes.trim()}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'warning',
          event: 'project_returned',
          projectId: updated.id,
        });
      }
    }

    if (statusChanged && body.status === 'completed') {
      const admin = store.users.find((u) => u.role === 'admin');
      if (admin) {
        const workerName = getWorkerName(store.users, updated.assignedTo) ?? 'Ishchi';
        store.notifications.unshift({
          id: uuidv4(),
          userId: admin.id,
          message: `${updated.clientName} tugallandi — ${updated.address} · Ishchi: ${workerName}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'info',
          event: 'project_completed',
          projectId: updated.id,
        });
      }
    }

    await writeStore(store, {
      tables: ['projects', 'notifications', 'rating_entries', 'project_comments'],
    });
    return NextResponse.json({ project: store.projects[idx] });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 });

    const store = await readStore();
    store.projects = store.projects.filter((p) => p.id !== id);
    store.notifications = store.notifications.filter((n) => n.projectId !== id);
    store.ratingEntries = (store.ratingEntries ?? []).filter((r) => r.projectId !== id);
    store.comments = (store.comments ?? []).filter((c) => c.projectId !== id);
    await writeStore(store, {
      tables: ['projects', 'notifications', 'rating_entries', 'project_comments'],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
