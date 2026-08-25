'use client';

import { useEffect, useState } from 'react';
import { LeaderboardView } from '@/components/LeaderboardView';
import { WorkerProfileModal } from '@/components/WorkerProfileModal';
import { SkeletonPage } from '@/components/Skeleton';
import { useAdminData } from '@/hooks/useAdminData';
import { apiFetch } from '@/lib/auth';
import { monthKey } from '@/lib/monthKey';
import type { HallOfFameEntry, MonthlyLeaderboardEntry } from '@/types';

export default function AdminLeaderboardPage() {
  const { workers, loadData } = useAdminData();
  const [month, setMonth] = useState(monthKey());
  const [months, setMonths] = useState<string[]>([monthKey()]);
  const [entries, setEntries] = useState<MonthlyLeaderboardEntry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<{ month: string; months: string[]; entries: MonthlyLeaderboardEntry[]; hallOfFame: HallOfFameEntry[] }>(
      `/api/leaderboard?month=${month}`,
    )
      .then((res) => {
        if (cancelled) return;
        setMonth(res.month);
        setMonths(res.months);
        setEntries(res.entries);
        setHallOfFame(res.hallOfFame ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (loading && entries.length === 0) return <SkeletonPage />;

  return (
    <>
      <LeaderboardView
        month={month}
        months={months}
        entries={entries}
        hallOfFame={hallOfFame}
        loading={loading}
        onMonthChange={setMonth}
        onSelectWorker={setProfileId}
      />
      <WorkerProfileModal
        workerId={profileId}
        workers={workers}
        onClose={() => setProfileId(null)}
        onUpdated={() => loadData({ silent: true })}
      />
    </>
  );
}
