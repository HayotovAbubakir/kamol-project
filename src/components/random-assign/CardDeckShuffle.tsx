'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CARD_W = 100;
const CARD_H = 140;
const CARD_COUNT = 10;

function CardBack() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg border-2 border-white/25 bg-gradient-to-br from-[#1a4d3a] via-[#2a6349] to-[#122820] shadow-lg">
      <div
        className="absolute inset-1.5 rounded-md border border-white/15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-2xl text-white/20">♠</div>
    </div>
  );
}

function CardFace({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-app-accent/50 bg-gradient-to-br from-app-card to-app-card-soft p-2 shadow-lg">
      <span className="line-clamp-4 text-center text-[11px] font-bold leading-snug text-app-text">{text}</span>
    </div>
  );
}

type Phase = 'split' | 'riffle' | 'stack' | 'lift' | 'flip';

interface CardDeckShuffleProps {
  label: string;
  winner: string;
  onComplete: () => void;
}

export function CardDeckShuffle({ label, winner, onComplete }: CardDeckShuffleProps) {
  const [phase, setPhase] = useState<Phase>('split');
  const [riffleStep, setRiffleStep] = useState(0);

  const cardIds = useMemo(() => Array.from({ length: CARD_COUNT }, (_, i) => i), []);

  /** Chap va o'ng destadan navbatma-navbat markazga tushirish tartibi */
  const dropOrder = useMemo(() => {
    const left = cardIds.slice(0, CARD_COUNT / 2);
    const right = cardIds.slice(CARD_COUNT / 2);
    const order: number[] = [];
    for (let i = 0; i < CARD_COUNT; i += 1) {
      order.push(i % 2 === 0 ? left[Math.floor(i / 2)] : right[Math.floor(i / 2)]);
    }
    return order;
  }, [cardIds]);

  useEffect(() => {
    if (phase !== 'split') return;
    const t = setTimeout(() => setPhase('riffle'), 700);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'riffle') return;
    if (riffleStep < CARD_COUNT) {
      const t = setTimeout(() => setRiffleStep((s) => s + 1), 120);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase('stack'), 350);
    return () => clearTimeout(t);
  }, [phase, riffleStep]);

  useEffect(() => {
    if (phase !== 'stack') return;
    const t = setTimeout(() => setPhase('lift'), 500);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'lift') return;
    const t = setTimeout(() => setPhase('flip'), 450);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'flip') return;
    const t = setTimeout(onComplete, 900);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  function cardMotion(id: number) {
    const isLeft = id < CARD_COUNT / 2;
    const stackIndex = dropOrder.indexOf(id);
    const dropped = phase !== 'split' && phase !== 'riffle' ? true : riffleStep > stackIndex;
    const isTop = id === dropOrder[riffleStep - 1] || (phase !== 'riffle' && stackIndex === CARD_COUNT - 1);

    if (phase === 'split') {
      return {
        x: isLeft ? -58 : 58,
        y: (id % (CARD_COUNT / 2)) * 3,
        rotate: isLeft ? -10 : 10,
        zIndex: id,
      };
    }

    if (phase === 'riffle' && !dropped) {
      return {
        x: isLeft ? -58 : 58,
        y: (id % (CARD_COUNT / 2)) * 3,
        rotate: isLeft ? -10 : 10,
        zIndex: id,
      };
    }

    if (phase === 'riffle' && dropped) {
      return {
        x: 0,
        y: -stackIndex * 2,
        rotate: (stackIndex % 2 === 0 ? 1 : -1) * 3,
        zIndex: 10 + stackIndex,
      };
    }

    if (phase === 'stack') {
      return {
        x: 0,
        y: -stackIndex * 2,
        rotate: 0,
        zIndex: 10 + stackIndex,
      };
    }

    if (phase === 'lift' || phase === 'flip') {
      if (stackIndex === CARD_COUNT - 1) {
        return {
          x: 0,
          y: -36,
          rotate: phase === 'lift' ? -3 : 0,
          zIndex: 50,
        };
      }
      return {
        x: 0,
        y: -stackIndex * 2,
        rotate: 0,
        zIndex: 10 + stackIndex,
      };
    }

    return { x: 0, y: 0, rotate: 0, zIndex: id };
  }

  const topCardId = dropOrder[CARD_COUNT - 1];

  return (
    <div className="flex w-full flex-col items-center overflow-hidden">
      <span className="mb-3 text-xs font-semibold text-app-accent">{label}</span>
      <div
        className="relative overflow-hidden"
        style={{ width: 220, height: 220, perspective: 900 }}
      >
        <AnimatePresence mode="popLayout">
          {phase !== 'flip' &&
            cardIds.map((id) => {
              const m = cardMotion(id);
              if (id === topCardId && phase === 'lift') return null;
              return (
                <motion.div
                  key={`back-${id}`}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    marginLeft: -CARD_W / 2,
                    marginTop: -CARD_H / 2,
                    zIndex: m.zIndex,
                  }}
                  animate={{ x: m.x, y: m.y, rotate: m.rotate }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                >
                  <CardBack />
                </motion.div>
              );
            })}

          {(phase === 'lift' || phase === 'flip') && (
            <motion.div
              key="flip-card"
              className="absolute left-1/2 top-1/2"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_H / 2,
                transformStyle: 'preserve-3d',
                zIndex: 50,
              }}
              initial={{ x: 0, y: 0, rotateY: 0 }}
              animate={{
                x: 0,
                y: -36,
                rotateY: phase === 'flip' ? 180 : 0,
              }}
              transition={{ duration: phase === 'flip' ? 0.65 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                  <CardBack />
                </div>
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <CardFace text={winner} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
