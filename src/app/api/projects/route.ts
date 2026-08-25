import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readStore, persistStorePatch, writeStore } from '@/lib/store';
import { ADVANCE_PAYMENT_NOTE } from '@/lib/payments';
import { getProjectComment } from '@/lib/comments';
import { maybeSyncDeadlineNotifications } from '@/lib/notifications';
import { getSessionFromRequest, requireAdmin, requireAuth } from '@/lib/session';
import { applyReturnRatingEntries, createRatingEntry, getWorkerRating, notifyStarRatingChange } from '@/lib/rating';
import { getWorkerName } from '@/lib/notificationHelpers';
import { isInProgressStatus, isTerminalStatus, isWorkerCompletedStatus, isWorkerLockedStatus, formatAddress, joinProjectPhones, parseClientFullName, parseOptionalNumber, sortReturnedProjects, sortWorkerActiveProjects, validateProjectPricing } from '@/lib/utils';
import { ensureAdvancePayment } from '@/lib/payments';
import { upsertProjectComment, replaceAdminCommentRating } from '@/lib/comments';
import type { Project, ProjectStatus } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 });
  }

  try {
    let store = await readStore();
    const synced = maybeSyncDeadlineNotifications(store);
    if (synced.changed) {
      await writeStore(synced.store, { tables: ['notifications'] });
    }
    store = synced.store;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Workers may only see their own projects, regardless of what they ask for.
    const isAdmin = requireAdmin(session);
    const effectiveRole = isAdmin ? searchParams.get('role') : 'worker';
    const effectiveUserId = isAdmin ? searchParams.get('userId') : session!.id;

    let projects = [...store.projects];

    if (effectiveRole === 'worker' && effectiveUserId) {
      projects = projects.filter((p) => p.assignedTo === effectiveUserId);
    }

    if (status === 'completed') {
      projects = projects.filter((p) =>
        isAdmin ? p.status === 'completed' : isWorkerCompletedStatus(p.status),
      );
    } else if (status === 'review') {
      projects = projects.filter((p) => p.status === 'pending_review');
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

    const clientName = parseClientFullName(body);
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const phone = joinProjectPhones([body.phone, body.phone2]);
    if (!clientName || !address) {
      return NextResponse.json({ error: 'Ism, familiya va manzil kiritilishi shart' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Kamida bitta telefon raqam kiritilishi shart' }, { status: 400 });
    }

    const project: Project = {
      id: uuidv4(),
      title: (typeof body.title === 'string' && body.title.trim()) || clientName,
      clientName,
      address,
      phone,
      price: parseOptionalNumber(body.price),
      advancePaid: !!body.advancePaid,
      advanceAmount: body.advancePaid ? parseOptionalNumber(body.advanceAmount) : undefined,
      orderDate: new Date().toISOString(),
      status: 'pending',
      description: typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : undefined,
    };

    const pricingError = validateProjectPricing(project);
    if (pricingError) {
      return NextResponse.json({ error: pricingError }, { status: 400 });
    }

    store.projects.push(project);
    ensureAdvancePayment(store, project);

    await writeStore(store, { tables: ['projects', 'payments'] });
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
    const notificationsBefore = store.notifications.length;
    const ratingEntriesBefore = (store.ratingEntries ?? []).length;

    if (idx === -1) {
      return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    }

    const project = store.projects[idx];

    if (body.action === 'resubmit') {
      if (session!.role !== 'admin') {
        return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
      }
      if (!project.returnedAt) {
        return NextResponse.json({ error: 'Faqat qaytarilgan loyiha qayta topshiriladi' }, { status: 400 });
      }

      store.projects[idx] = {
        ...project,
        status: 'in_progress',
        assignedAt: new Date().toISOString(),
        returnedAt: undefined,
        completedAt: undefined,
      };

      await persistStorePatch(store, { projects: [store.projects[idx]] });
      return NextResponse.json({ project: store.projects[idx] });
    }

    if (session!.role === 'worker' && project.assignedTo !== session!.id) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const updates: Partial<Project> = {};
    const isReturnAction = body.status === 'returned';

    if (isReturnAction) {
      if (session!.role !== 'admin') {
        return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
      }
      if (project.status !== 'completed' && project.status !== 'pending_review') {
        return NextResponse.json(
          { error: 'Faqat tugallangan yoki ko\'rib chiqilmagan loyihani qaytarish mumkin' },
          { status: 400 },
        );
      }
      if (!body.notes?.trim()) {
        return NextResponse.json({ error: 'Qaytarish sababi majburiy' }, { status: 400 });
      }
      updates.status = 'in_progress';
      updates.returnedAt = new Date().toISOString();
      updates.completedAt = undefined;
      updates.notes = body.notes.trim();
    } else if (body.status) {
      if (session!.role === 'worker') {
        if (body.status !== 'completed') {
          return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
        }
        if (!isInProgressStatus(project.status)) {
          return NextResponse.json({ error: 'Bu loyihani tugatib bo\'lmaydi' }, { status: 400 });
        }
        updates.status = 'pending_review';
        updates.completedAt = new Date().toISOString();
      } else {
        if (body.status === 'completed') {
          if (project.status !== 'pending_review') {
            return NextResponse.json(
              { error: 'Faqat ko\'rib chiqilishi kerak bo\'lgan loyihani tasdiqlash mumkin' },
              { status: 400 },
            );
          }
          updates.status = 'completed';
          updates.completedAt = project.completedAt ?? new Date().toISOString();
          updates.returnedAt = undefined;
        } else {
          if (isWorkerLockedStatus(project.status) && body.status !== project.status) {
            return NextResponse.json({ error: 'Bu loyiha holati o\'zgartirilmaydi' }, { status: 400 });
          }
          if (isTerminalStatus(project.status) && body.status !== project.status) {
            return NextResponse.json({ error: 'Bu loyiha holati o\'zgartirilmaydi' }, { status: 400 });
          }
          updates.status = body.status as ProjectStatus;
          if (isTerminalStatus(body.status)) {
            updates.completedAt = new Date().toISOString();
          }
        }
      }
    }

    if (body.notes !== undefined && !isReturnAction) {
      if (session!.role === 'worker') {
        return NextResponse.json(
          { error: 'Ishchi izohi faqat qaytarilgan loyiha sahifasidan yuboriladi' },
          { status: 403 },
        );
      }
      updates.notes = typeof body.notes === 'string' ? body.notes.trim() : body.notes;
    }

    if (body.description !== undefined) {
      if (session!.role === 'worker') {
        return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
      }
      if (session!.role === 'admin') {
        updates.description = body.description;
      }
    }

    if (body.assignedTo !== undefined && session!.role === 'admin') {
      updates.assignedTo = body.assignedTo;
    }

    if (session!.role === 'admin') {
      if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
      if (
        typeof body.clientName === 'string' ||
        typeof body.firstName === 'string' ||
        typeof body.lastName === 'string'
      ) {
        const clientName = parseClientFullName(body);
        if (!clientName) {
          return NextResponse.json({ error: 'Ism va familiya kiritilishi shart' }, { status: 400 });
        }
        updates.clientName = clientName;
        if (!updates.title) updates.title = clientName;
      }
      if (typeof body.address === 'string' && body.address.trim()) updates.address = body.address.trim();
      if (body.phone !== undefined || body.phone2 !== undefined) {
        const phone = joinProjectPhones([body.phone, body.phone2]);
        if (!phone) {
          return NextResponse.json({ error: 'Kamida bitta telefon raqam kiritilishi shart' }, { status: 400 });
        }
        updates.phone = phone;
      }
      if (body.price !== undefined) updates.price = parseOptionalNumber(body.price);
      if (body.advancePaid !== undefined) updates.advancePaid = !!body.advancePaid;
      if (body.advanceAmount !== undefined) {
        updates.advanceAmount = parseOptionalNumber(body.advanceAmount);
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
    ensureAdvancePayment(store, updated);
    const statusChanged = isReturnAction || (body.status && (
      session!.role === 'worker' && body.status === 'completed'
        ? project.status !== 'pending_review'
        : body.status !== project.status
    ));

    if (statusChanged && updated.status === 'completed' && updated.assignedTo && !isReturnAction) {
      if (!store.ratingEntries) store.ratingEntries = [];
      const workerId = updated.assignedTo;
      // Idempotency: avoid duplicate completion entries for the same project
      // if two near-simultaneous requests both flip the status to completed.
      const alreadyRated = store.ratingEntries.some(
        (e) =>
          e.projectId === updated.id &&
          e.workerId === workerId &&
          e.type === 'completion',
      );
      if (!alreadyRated) {
        const prevRating = getWorkerRating(workerId, store.ratingEntries).rating;
        const ratingProject =
          body.status === 'completed' && project.returnedAt
            ? { ...updated, returnedAt: project.returnedAt }
            : updated;
        store.ratingEntries.push(createRatingEntry(ratingProject, store));
        notifyStarRatingChange(store, workerId, prevRating);
      }
    }

    if (isReturnAction && updated.assignedTo) {
      const prevRating = getWorkerRating(updated.assignedTo, store.ratingEntries ?? []).rating;
      applyReturnRatingEntries(store, updated);

      upsertProjectComment(store, {
        projectId: updated.id,
        workerId: updated.assignedTo,
        authorId: session!.id,
        text: body.notes.trim(),
        sentiment: 'negative',
      });
      replaceAdminCommentRating(store, updated.id, updated.assignedTo, 'negative');
      notifyStarRatingChange(store, updated.assignedTo, prevRating);

      const workerName = getWorkerName(store.users, updated.assignedTo) ?? 'Ishchi';
      const admin = store.users.find((u) => u.role === 'admin');

      store.notifications.unshift({
        id: uuidv4(),
        userId: updated.assignedTo,
        message: `Loyiha qaytarildi: ${formatAddress(updated)} — ${body.notes.trim()}`,
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
          message: `${formatAddress(updated)} qaytarildi · Ishchi: ${workerName} · ${body.notes.trim()}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'warning',
          event: 'project_returned',
          projectId: updated.id,
        });
      }
    }

    if (statusChanged && updated.status === 'pending_review' && updated.assignedTo) {
      const workerName = getWorkerName(store.users, updated.assignedTo) ?? 'Ishchi';
      for (const admin of store.users.filter((u) => u.role === 'admin')) {
        store.notifications.unshift({
          id: uuidv4(),
          userId: admin.id,
          message: `${formatAddress(updated)} ko'rib chiqish uchun · Ishchi: ${workerName}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'info',
          event: 'project_completed',
          projectId: updated.id,
        });
      }
    }

    if (statusChanged && updated.status === 'completed' && project.status === 'pending_review') {
      const admin = store.users.find((u) => u.role === 'admin');
      if (admin) {
        const workerName = getWorkerName(store.users, updated.assignedTo) ?? 'Ishchi';
        store.notifications.unshift({
          id: uuidv4(),
          userId: admin.id,
          message: `${formatAddress(updated)} tugallandi · Ishchi: ${workerName}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'info',
          event: 'project_completed',
          projectId: updated.id,
        });
      }
    }

    const addedNotifications = store.notifications.slice(0, store.notifications.length - notificationsBefore);
    const addedRatingEntries = (store.ratingEntries ?? []).slice(ratingEntriesBefore);
    const touchedComment = isReturnAction ? getProjectComment(store, updated.id) : undefined;
    const advancePayment = (store.payments ?? []).find(
      (p) => p.projectId === updated.id && p.note === ADVANCE_PAYMENT_NOTE,
    );

    await persistStorePatch(store, {
      projects: [store.projects[idx]],
      ...(addedNotifications.length ? { notifications: addedNotifications } : {}),
      ...(addedRatingEntries.length ? { ratingEntries: addedRatingEntries } : {}),
      ...(touchedComment ? { comments: [touchedComment] } : {}),
      ...(advancePayment ? { payments: [advancePayment] } : {}),
    });
    return NextResponse.json({ project: store.projects[idx] });
  } catch (err) {
    console.error('[PATCH /api/projects]', err);
    const message = err instanceof Error ? err.message : 'Server xatoligi';
    return NextResponse.json({ error: message }, { status: 500 });
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
    store.payments = (store.payments ?? []).filter((p) => p.projectId !== id);
    store.workerReplies = (store.workerReplies ?? []).filter((r) => r.projectId !== id);
    await writeStore(store, {
      tables: ['projects', 'notifications', 'rating_entries', 'project_comments', 'payments', 'worker_replies'],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
