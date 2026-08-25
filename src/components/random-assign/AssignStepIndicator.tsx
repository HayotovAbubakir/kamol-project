'use client';

import { cn } from '@/lib/utils';

export type AssignStep = 'select' | 'preview' | 'animate' | 'done';

const STEPS: AssignStep[] = ['select', 'preview', 'animate', 'done'];

interface AssignStepIndicatorProps {
  current: AssignStep;
  labels: Record<AssignStep, string>;
}

export function AssignStepIndicator({ current, labels }: AssignStepIndicatorProps) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <nav aria-label="Progress" className="mx-auto w-full max-w-3xl">
      <ol className="flex items-start justify-between gap-1 sm:items-center sm:gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={step} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                    done && 'border-app-accent bg-app-accent text-white',
                    active && 'border-app-accent bg-app-accent/15 text-app-accent',
                    !done && !active && 'border-app-border bg-app-card text-app-muted',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span
                  className={cn(
                    'max-w-full truncate text-center text-[9px] font-medium leading-tight xs:text-[10px] sm:block sm:text-xs',
                    active ? 'text-app-accent' : done ? 'text-app-text' : 'text-app-muted',
                  )}
                >
                  {labels[step]}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mb-6 hidden h-0.5 flex-1 sm:block',
                    index < currentIndex ? 'bg-app-accent' : 'bg-app-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
