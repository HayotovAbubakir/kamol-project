'use client';

import { cn } from '@/lib/utils';

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-app-border/60 dark:bg-metallic-green/10',
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="ui-glass-card rounded-2xl p-5 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-3/4" />
          <Bone className="h-3.5 w-1/2" />
        </div>
        <Bone className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 space-y-2.5">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-5/6" />
        <Bone className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="ui-glass-card rounded-2xl p-5 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <Bone className="h-3 w-20" />
      <Bone className="mt-3 h-8 w-12" />
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ui-glass-card overflow-hidden rounded-2xl shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <div className="border-b border-app-border px-5 py-3">
        <Bone className="h-3 w-full" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-app-border px-5 py-4 last:border-0">
          <Bone className="h-4 w-1/4" />
          <Bone className="h-4 w-1/5" />
          <Bone className="h-4 w-1/6" />
          <Bone className="ml-auto h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonNotifications() {
  return (
    <div className="ui-glass-card rounded-2xl p-5 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <Bone className="mb-4 h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Bone className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-full" />
              <Bone className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard({
  withNotifications = true,
  compact = false,
}: {
  withNotifications?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="dashboard-page">
        <Bone className="h-7 w-48 shrink-0" />
        <SkeletonStats />
        <div className="dashboard-bottom">
          <div className="grid min-h-0 gap-1.5 sm:grid-cols-2 lg:col-span-2">
            <Bone className="min-h-0 rounded-2xl" />
            <Bone className="min-h-0 rounded-2xl" />
          </div>
          {withNotifications ? <Bone className="min-h-0 rounded-2xl" /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-72" />
      </div>
      <SkeletonStats />
      <div className={cn('grid gap-5', withNotifications ? 'lg:grid-cols-3' : '')}>
        <div className={cn('space-y-4', withNotifications ? 'lg:col-span-2' : '')}>
          <Bone className="h-5 w-28" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Bone className="h-44 rounded-2xl" />
            <Bone className="h-44 rounded-2xl" />
          </div>
        </div>
        {withNotifications ? <SkeletonNotifications /> : null}
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-72" />
      </div>
      <SkeletonCards count={6} />
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-app-accent/20 border-t-app-accent" />
        <div className="absolute inset-1.5 animate-spin rounded-full border-2 border-transparent border-b-app-accent/50" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }} />
      </div>
    </div>
  );
}
