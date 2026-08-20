'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AnimationType } from '@/lib/randomAssign';

interface AssignAnimationProps {
  type: AnimationType;
  workerName: string;
  projectLabel: string;
  workerCandidates: string[];
  projectCandidates: string[];
  onComplete: () => void;
}

function usePicker(
  candidates: string[],
  winner: string,
  durationMs: number,
  delayMs = 0,
) {
  const [display, setDisplay] = useState(candidates[0] ?? winner);

  useEffect(() => {
    let frame = 0;
    let interval = 40;
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        frame += 1;
        if (frame > durationMs / interval) {
          clearInterval(intervalId);
          setDisplay(winner);
          return;
        }
        if (frame > durationMs / interval * 0.65) interval = 90;
        else if (frame > durationMs / interval * 0.4) interval = 55;
        const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? winner;
        setDisplay(pick);
      }, interval);
    }, delayMs);

    const finish = setTimeout(() => setDisplay(winner), delayMs + durationMs + 120);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(finish);
      clearInterval(intervalId);
    };
  }, [candidates, winner, durationMs, delayMs]);

  return display;
}

function WheelAnimation({
  workerName,
  projectLabel,
  workerCandidates,
  projectCandidates,
}: Omit<AssignAnimationProps, 'type' | 'onComplete'>) {
  const worker = usePicker(workerCandidates, workerName, 2600, 0);
  const project = usePicker(projectCandidates, projectLabel, 2200, 1400);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSpinning(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative">
        <div
          className={cn(
            'flex h-52 w-52 items-center justify-center rounded-full border-4 border-app-accent/40 bg-app-card shadow-xl transition-transform duration-[3200ms] ease-out dark:ring-2 dark:ring-metallic-green/30',
            spinning && 'animate-random-wheel',
          )}
          style={{
            background: `conic-gradient(from 0deg, var(--app-accent) 0 72deg, var(--app-card-soft) 72deg 144deg, var(--app-accent) 144deg 216deg, var(--app-card-soft) 216deg 288deg, var(--app-accent) 288deg 360deg)`,
          }}
        >
          <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-app-card px-3 text-center shadow-inner">
            <p className="text-[10px] uppercase tracking-widest text-app-muted">Ishchi</p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-app-text">{worker}</p>
          </div>
        </div>
        <div className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[10px] border-b-[16px] border-x-transparent border-b-app-accent" />
      </div>
      <div className="rounded-2xl border border-app-border bg-app-card px-8 py-4 text-center shadow-md">
        <p className="text-xs uppercase tracking-widest text-app-muted">Manzil</p>
        <p className="mt-1 text-lg font-semibold text-app-accent">{project}</p>
      </div>
    </div>
  );
}

function SlotAnimation({
  workerName,
  projectLabel,
  workerCandidates,
  projectCandidates,
}: Omit<AssignAnimationProps, 'type' | 'onComplete'>) {
  const worker = usePicker(workerCandidates, workerName, 2400);
  const project = usePicker(projectCandidates, projectLabel, 2400, 300);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3">
        {['Ishchi', 'Manzil'].map((label, col) => (
          <div key={label} className="overflow-hidden rounded-2xl border-2 border-app-accent/50 bg-[#111] shadow-lg">
            <div className="border-b border-app-accent/30 bg-app-accent/20 px-4 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-app-accent">
              {label}
            </div>
            <div className="flex h-28 w-40 items-center justify-center px-3">
              <p className="animate-random-slot text-center text-base font-bold text-white">
                {col === 0 ? worker : project}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-app-accent" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

function DiceAnimation({
  workerName,
  projectLabel,
  workerCandidates,
  projectCandidates,
}: Omit<AssignAnimationProps, 'type' | 'onComplete'>) {
  const worker = usePicker(workerCandidates, workerName, 2500);
  const project = usePicker(projectCandidates, projectLabel, 2500, 400);
  const [rolling, setRolling] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setRolling(false), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex gap-6">
        {[
          { label: 'Ishchi', value: worker },
          { label: 'Manzil', value: project },
        ].map((dice) => (
          <div key={dice.label} className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-app-border bg-app-card p-3 text-center shadow-lg',
                rolling && 'animate-random-dice',
              )}
            >
              <p className="line-clamp-3 text-sm font-bold leading-tight text-app-text">{dice.value}</p>
            </div>
            <span className="text-xs uppercase tracking-wider text-app-muted">{dice.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShuffleAnimation({
  workerName,
  projectLabel,
  workerCandidates,
  projectCandidates,
}: Omit<AssignAnimationProps, 'type' | 'onComplete'>) {
  const worker = usePicker(workerCandidates, workerName, 2600);
  const project = usePicker(projectCandidates, projectLabel, 2600, 500);
  const [flip, setFlip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFlip((f) => f + 1), 280);
    const stop = setTimeout(() => clearInterval(id), 3000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex gap-5 perspective-[800px]">
        {[
          { label: 'Ishchi', value: worker },
          { label: 'Manzil', value: project },
        ].map((card) => (
          <div key={card.label} className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'flex h-36 w-32 items-center justify-center rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-card-soft p-3 text-center shadow-xl transition-transform duration-300',
                flip % 2 === 0 && 'animate-random-flip',
              )}
            >
              <p className="line-clamp-4 text-sm font-semibold text-app-text">{card.value}</p>
            </div>
            <span className="text-xs uppercase tracking-wider text-app-muted">{card.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LotteryAnimation({
  workerName,
  projectLabel,
  workerCandidates,
}: Omit<AssignAnimationProps, 'type' | 'onComplete'>) {
  const worker = usePicker(workerCandidates, workerName, 2800);
  const [phase, setPhase] = useState<'mix' | 'reveal'>('mix');

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), 2600);
    return () => clearTimeout(t);
  }, []);

  const balls = useMemo(
    () =>
      workerCandidates.slice(0, 8).map((name, i) => ({
        name,
        x: 20 + (i % 4) * 22,
        y: 15 + Math.floor(i / 4) * 35,
        delay: i * 0.08,
      })),
    [workerCandidates],
  );

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative h-44 w-64 overflow-hidden rounded-3xl border-2 border-app-accent/40 bg-app-card-soft shadow-inner dark:bg-[#111]">
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-app-bg/80 to-transparent" />
        {phase === 'mix' &&
          balls.map((ball) => (
            <span
              key={ball.name}
              className="absolute flex h-10 w-10 animate-random-ball items-center justify-center rounded-full bg-app-accent text-[8px] font-bold text-white shadow-md"
              style={{ left: `${ball.x}%`, top: `${ball.y}%`, animationDelay: `${ball.delay}s` }}
            >
              {ball.name.slice(0, 3)}
            </span>
          ))}
        {phase === 'reveal' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
            <span className="rounded-full bg-app-accent px-5 py-2 text-sm font-bold text-white shadow-lg animate-random-pop">
              {worker}
            </span>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-app-border bg-app-card px-6 py-3 text-center">
        <p className="text-xs uppercase tracking-wider text-app-muted">Manzil</p>
        <p className="mt-1 font-semibold text-app-accent">{projectLabel}</p>
      </div>
    </div>
  );
}

const DURATION: Record<AnimationType, number> = {
  wheel: 3800,
  slot: 3200,
  dice: 3400,
  shuffle: 3600,
  lottery: 3800,
};

export function AssignAnimation({
  type,
  workerName,
  projectLabel,
  workerCandidates,
  projectCandidates,
  onComplete,
}: AssignAnimationProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, DURATION[type]);
    return () => clearTimeout(t);
  }, [type, onComplete]);

  const props = { workerName, projectLabel, workerCandidates, projectCandidates };

  switch (type) {
    case 'wheel':
      return <WheelAnimation {...props} />;
    case 'slot':
      return <SlotAnimation {...props} />;
    case 'dice':
      return <DiceAnimation {...props} />;
    case 'shuffle':
      return <ShuffleAnimation {...props} />;
    case 'lottery':
      return <LotteryAnimation {...props} />;
    default:
      return null;
  }
}

export function AnimationTypeIcon({ type }: { type: AnimationType }) {
  const icons: Record<AnimationType, string> = {
    wheel: '🎡',
    slot: '🎰',
    dice: '🎲',
    shuffle: '🃏',
    lottery: '🎱',
  };
  return <span className="text-3xl">{icons[type]}</span>;
}
