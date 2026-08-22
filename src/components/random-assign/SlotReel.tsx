'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { shuffleArray } from '@/lib/utils';

const ITEM_H = 52;
const VISIBLE = 3;

interface SlotReelProps {
  label: string;
  items: string[];
  winner: string;
  delay?: number;
  duration?: number;
  onComplete?: () => void;
}

export function SlotReel({
  label,
  items,
  winner,
  delay = 0,
  duration = 2.6,
  onComplete,
}: SlotReelProps) {
  const strip = useMemo(() => {
    const base = items.length > 0 ? items : [winner];
    const repeated: string[] = [];
    for (let r = 0; r < 10; r += 1) {
      repeated.push(...shuffleArray(base));
    }
    repeated.push(winner);
    return repeated;
  }, [items, winner]);

  const winIndex = strip.length - 1;
  const centerOffset = ITEM_H;
  const targetY = -(winIndex * ITEM_H - centerOffset);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-app-accent">{label}</span>
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-app-accent/45 bg-[#0c1010] shadow-[inset_0_4px_24px_rgba(0,0,0,0.65)]"
        style={{ width: 168, height: ITEM_H * VISIBLE }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[52px] -translate-y-1/2 border-y-2 border-app-accent/70 bg-app-accent/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-[#0c1010] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[#0c1010] to-transparent" />
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: targetY }}
          transition={{
            delay,
            duration,
            ease: [0.12, 0.85, 0.22, 1],
          }}
          onAnimationComplete={onComplete}
        >
          {strip.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className="flex items-center justify-center px-2 text-center text-sm font-bold leading-tight text-white"
              style={{ height: ITEM_H }}
            >
              <span className="line-clamp-2">{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
