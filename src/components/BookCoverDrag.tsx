'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';
import { cn } from '@/lib/utils';

interface BookCoverDragProps {
  children: React.ReactNode;
  openLabel: string;
  dragHint: string;
  onOpen: () => void;
  opened: boolean;
}

export function BookCoverDrag({
  children,
  openLabel,
  dragHint,
  onOpen,
  opened,
}: BookCoverDragProps) {
  const openingRef = useRef(false);
  const reduced = usePrefersReducedMotion();

  const open = useCallback(() => {
    if (opened || openingRef.current) return;
    openingRef.current = true;
    onOpen();
  }, [onOpen, opened]);

  useEffect(() => {
    if (opened) openingRef.current = false;
  }, [opened]);

  useEffect(() => {
    if (opened) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 8 || e.deltaX > 8) {
        e.preventDefault();
        open();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [opened, open]);

  return (
    <div
      role="button"
      tabIndex={opened ? -1 : 0}
      aria-label={openLabel}
      aria-disabled={opened}
      onClick={() => {
        if (!opened) open();
      }}
      onKeyDown={(e) => {
        if (!opened && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        'book-cover select-none overflow-hidden rounded-[18px] text-left xs:rounded-[22px] sm:rounded-[28px]',
        reduced && 'motion-reduce',
        opened && 'is-open',
      )}
    >
      <div className="pointer-events-none relative h-full w-full">{children}</div>
      <span className="book-drag-handle pointer-events-none" aria-hidden>
        <span className="book-drag-handle-icon" />
        <span className="min-w-0 truncate">{dragHint}</span>
      </span>
    </div>
  );
}
