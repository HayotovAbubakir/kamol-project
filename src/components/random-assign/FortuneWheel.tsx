'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

const SEGMENT_COLORS = [
  'rgba(92, 184, 138, 0.95)',
  'rgba(61, 107, 82, 0.95)',
  'rgba(126, 196, 160, 0.9)',
  'rgba(45, 74, 58, 0.95)',
  'rgba(108, 160, 130, 0.92)',
  'rgba(72, 120, 96, 0.95)',
  'rgba(140, 210, 175, 0.88)',
  'rgba(52, 88, 70, 0.95)',
];

interface FortuneWheelProps {
  label: string;
  candidates: string[];
  winner: string;
  onComplete: () => void;
}

export function FortuneWheel({ label, candidates, winner, onComplete }: FortuneWheelProps) {
  const items = useMemo(
    () => (candidates.length > 0 ? candidates : [winner]),
    [candidates, winner],
  );
  const n = items.length;
  const winIdx = Math.max(0, items.indexOf(winner));
  const segmentAngle = 360 / n;

  const gradient = useMemo(() => {
    const stops = items
      .map((_, i) => {
        const start = i * segmentAngle;
        const end = (i + 1) * segmentAngle;
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        return `${color} ${start}deg ${end}deg`;
      })
      .join(', ');
    return `conic-gradient(from -${segmentAngle / 2}deg, ${stops})`;
  }, [items, segmentAngle]);

  const fullSpins = 5 + Math.min(n, 3);
  const targetRotation = fullSpins * 360 + (360 - winIdx * segmentAngle - segmentAngle / 2);

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-app-accent">{label}</span>
      <div className="relative">
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[12px] border-b-[20px] border-x-transparent border-b-app-accent drop-shadow-md" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-app-accent/30 shadow-[0_0_0_6px_rgba(92,184,138,0.12)]" />
        <motion.div
          className="relative flex h-56 w-56 items-center justify-center rounded-full shadow-2xl"
          style={{ background: gradient }}
          initial={{ rotate: 0 }}
          animate={{ rotate: targetRotation }}
          transition={{ duration: 4.2, ease: [0.12, 0.75, 0.18, 1] }}
          onAnimationComplete={onComplete}
        >
          {items.map((name, i) => {
            const angle = i * segmentAngle + segmentAngle / 2;
            return (
              <div
                key={`${name}-${i}`}
                className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="absolute -translate-x-1/2 truncate text-center text-[10px] font-bold leading-tight text-white drop-shadow"
                  style={{ top: -88, width: 72 }}
                >
                  {name}
                </span>
              </div>
            );
          })}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/30 bg-app-card shadow-inner">
            <span className="text-xl">🎯</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
