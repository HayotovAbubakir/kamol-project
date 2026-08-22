import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { parseDateParam, toDateParam } from '@/lib/completedDateFilter';
import { getSessionFromRequest, requireAuth } from '@/lib/session';
import type { Project } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function completedAtMs(project: Project): number | null {
  if (!project.completedAt) return null;
  const ms = new Date(project.completedAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!requireAuth(session) || session!.role !== 'worker') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startRaw = searchParams.get('start_date');
    const endRaw = searchParams.get('end_date');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
    );

    if (!startRaw || !endRaw) {
      return NextResponse.json({ error: 'start_date va end_date kerak' }, { status: 400 });
    }

    const startDate = parseDateParam(startRaw);
    const endDate = parseDateParam(endRaw);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Noto\'g\'ri sana formati' }, { status: 400 });
    }

    let rangeStart = startOfDay(startDate);
    let rangeEnd = endOfDay(endDate);
    if (rangeStart.getTime() > rangeEnd.getTime()) {
      [rangeStart, rangeEnd] = [startOfDay(endDate), endOfDay(startDate)];
    }

    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();

    const store = await readStore();
    const workerId = session!.id;

    const filtered = store.projects
      .filter((p) => p.assignedTo === workerId && (p.status === 'completed' || p.status === 'pending_review'))
      .filter((p) => {
        const ms = completedAtMs(p);
        return ms != null && ms >= startMs && ms <= endMs;
      })
      .sort((a, b) => (completedAtMs(b) ?? 0) - (completedAtMs(a) ?? 0));

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const projects = filtered.slice(offset, offset + limit);
    const hasMore = offset + projects.length < total;

    return NextResponse.json(
      {
        projects,
        total,
        page,
        limit,
        hasMore,
        startDate: toDateParam(rangeStart),
        endDate: toDateParam(rangeEnd),
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
