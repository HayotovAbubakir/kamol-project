'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FortuneWheel } from '@/components/random-assign/FortuneWheel';
import { CardDeckShuffle } from '@/components/random-assign/CardDeckShuffle';
import { PairReveal } from '@/components/random-assign/PairReveal';
import { SlotReel } from '@/components/random-assign/SlotReel';
import type { AnimationType } from '@/lib/randomAssign';

interface AssignAnimationProps {
  type: AnimationType;
  workerName: string;
  projectLabel: string;
  workerCandidates: string[];
  projectCandidates: string[];
  workerLabel: string;
  projectLabelTitle: string;
  onComplete: () => void;
}

function AutoAdvance({ delay, onDone }: { delay: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, delay);
    return () => clearTimeout(t);
  }, [delay, onDone]);
  return null;
}

function SceneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full max-w-lg flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  );
}

function WheelScene(props: AssignAnimationProps) {
  const [phase, setPhase] = useState<'worker' | 'project' | 'reveal'>('worker');

  if (phase === 'worker') {
    return (
      <motion.div key="wheel-worker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <FortuneWheel
          label={props.workerLabel}
          candidates={props.workerCandidates}
          winner={props.workerName}
          onComplete={() => setPhase('project')}
        />
      </motion.div>
    );
  }

  if (phase === 'project') {
    return (
      <motion.div key="wheel-project" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <SlotReel
          label={props.projectLabelTitle}
          items={props.projectCandidates}
          winner={props.projectLabel}
          duration={2.8}
          onComplete={() => setPhase('reveal')}
        />
      </motion.div>
    );
  }

  return (
    <motion.div key="wheel-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PairReveal workerName={props.workerName} projectLabel={props.projectLabel} onDone={props.onComplete} />
    </motion.div>
  );
}

function SlotScene(props: AssignAnimationProps) {
  const [phase, setPhase] = useState<'spin' | 'reveal'>('spin');
  const [workerDone, setWorkerDone] = useState(false);
  const [projectDone, setProjectDone] = useState(false);

  const onWorkerDone = useCallback(() => setWorkerDone(true), []);
  const onProjectDone = useCallback(() => setProjectDone(true), []);

  useEffect(() => {
    if (workerDone && projectDone) setPhase('reveal');
  }, [workerDone, projectDone]);

  if (phase === 'spin') {
    return (
      <motion.div
        key="slot-spin"
        className="flex flex-col items-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex gap-4 sm:gap-6">
          <SlotReel
            label={props.workerLabel}
            items={props.workerCandidates}
            winner={props.workerName}
            duration={3.2}
            onComplete={onWorkerDone}
          />
          <SlotReel
            label={props.projectLabelTitle}
            items={props.projectCandidates}
            winner={props.projectLabel}
            delay={0.35}
            duration={3.5}
            onComplete={onProjectDone}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="slot-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PairReveal workerName={props.workerName} projectLabel={props.projectLabel} onDone={props.onComplete} />
    </motion.div>
  );
}

function DiceRoll({
  label,
  value,
  candidates,
  onComplete,
}: {
  label: string;
  value: string;
  candidates: string[];
  onComplete: () => void;
}) {
  const items = candidates.length > 0 ? candidates : [value];
  const [display, setDisplay] = useState(items[0] ?? value);

  return (
    <motion.div
      className="flex flex-col items-center gap-3 overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <span className="text-xs font-semibold text-app-accent">{label}</span>
      <motion.div
        className="relative flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-app-border bg-gradient-to-br from-app-card to-app-card-soft p-3 text-center shadow-xl"
        animate={{
          rotateX: [0, 360, 720, 1080],
          rotateY: [0, 180, 360, 540],
          rotateZ: [0, 45, 90, 120],
        }}
        transition={{ duration: 2.8, ease: [0.15, 0.8, 0.25, 1] }}
        onAnimationComplete={() => {
          setDisplay(value);
          setTimeout(onComplete, 450);
        }}
        style={{ transformStyle: 'preserve-3d', perspective: 600 }}
      >
        <motion.p key={display} className="line-clamp-4 text-sm font-bold leading-snug text-app-text">
          {display}
        </motion.p>
      </motion.div>
      <Ticker items={items} onTick={setDisplay} duration={2600} />
    </motion.div>
  );
}

function Ticker({
  items,
  onTick,
  duration,
}: {
  items: string[];
  onTick: (v: string) => void;
  duration: number;
}) {
  useEffect(() => {
    let frame = 0;
    const total = Math.floor(duration / 80);
    const id = setInterval(() => {
      frame += 1;
      onTick(items[Math.floor(Math.random() * items.length)] ?? items[0]);
      if (frame >= total) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [items, onTick, duration]);
  return null;
}

function DiceScene(props: AssignAnimationProps) {
  const [phase, setPhase] = useState<'worker' | 'project' | 'reveal'>('worker');

  if (phase === 'worker') {
    return (
      <DiceRoll
        key="dice-worker"
        label={props.workerLabel}
        value={props.workerName}
        candidates={props.workerCandidates}
        onComplete={() => setPhase('project')}
      />
    );
  }

  if (phase === 'project') {
    return (
      <DiceRoll
        key="dice-project"
        label={props.projectLabelTitle}
        value={props.projectLabel}
        candidates={props.projectCandidates}
        onComplete={() => setPhase('reveal')}
      />
    );
  }

  return (
    <motion.div key="dice-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PairReveal workerName={props.workerName} projectLabel={props.projectLabel} onDone={props.onComplete} />
    </motion.div>
  );
}

function ShuffleScene(props: AssignAnimationProps) {
  const [phase, setPhase] = useState<'worker' | 'project' | 'reveal'>('worker');

  if (phase === 'worker') {
    return (
      <motion.div key="shuffle-worker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <CardDeckShuffle label={props.workerLabel} winner={props.workerName} onComplete={() => setPhase('project')} />
      </motion.div>
    );
  }

  if (phase === 'project') {
    return (
      <motion.div key="shuffle-project" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <CardDeckShuffle label={props.projectLabelTitle} winner={props.projectLabel} onComplete={() => setPhase('reveal')} />
      </motion.div>
    );
  }

  return (
    <motion.div key="shuffle-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PairReveal workerName={props.workerName} projectLabel={props.projectLabel} onDone={props.onComplete} />
    </motion.div>
  );
}

function LotteryScene(props: AssignAnimationProps) {
  const [phase, setPhase] = useState<'mix' | 'pick' | 'reveal'>('mix');
  const balls = props.workerCandidates.slice(0, 12);

  if (phase === 'mix') {
    return (
      <motion.div key="lottery-mix" className="flex flex-col items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="mb-3 text-xs font-semibold text-app-accent">{props.workerLabel}</span>
        <div className="relative h-44 w-64 overflow-hidden rounded-[2rem] border-4 border-app-accent/35 bg-gradient-to-b from-slate-800/90 to-slate-950 shadow-inner">
          {balls.map((name, i) => (
            <motion.span
              key={name}
              className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-app-accent to-metallic-green text-[9px] font-bold text-white shadow-md"
              initial={{
                left: `${15 + (i % 4) * 20}%`,
                top: `${20 + Math.floor(i / 4) * 28}%`,
              }}
              animate={{
                left: [`${15 + (i % 4) * 20}%`, `${25 + ((i + 2) % 4) * 18}%`, `${12 + ((i + 1) % 4) * 22}%`],
                top: [`${20 + Math.floor(i / 4) * 28}%`, `${35 + ((i + 1) % 3) * 18}%`, `${15 + (i % 3) * 25}%`],
              }}
              transition={{ duration: 2.4, ease: 'easeInOut' }}
            >
              {name.slice(0, 4)}
            </motion.span>
          ))}
        </div>
        <AutoAdvance delay={2600} onDone={() => setPhase('pick')} />
      </motion.div>
    );
  }

  if (phase === 'pick') {
    return (
      <motion.div key="lottery-pick" className="flex flex-col items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          className="flex h-44 w-64 flex-col items-center justify-center rounded-[2rem] border-4 border-app-accent/50 bg-slate-900/90 shadow-xl"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <motion.span
            className="rounded-full bg-app-accent px-5 py-2.5 text-sm font-bold text-white shadow-lg"
            initial={{ scale: 0, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.2 }}
          >
            {props.workerName}
          </motion.span>
          <motion.p
            className="mt-3 px-4 text-center text-sm font-semibold text-app-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {props.projectLabel}
          </motion.p>
        </motion.div>
        <AutoAdvance delay={1800} onDone={() => setPhase('reveal')} />
      </motion.div>
    );
  }

  return (
    <motion.div key="lottery-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PairReveal workerName={props.workerName} projectLabel={props.projectLabel} onDone={props.onComplete} />
    </motion.div>
  );
}

export function AssignAnimation(props: AssignAnimationProps) {
  const scene = (() => {
    switch (props.type) {
      case 'wheel':
        return <WheelScene {...props} />;
      case 'slot':
        return <SlotScene {...props} />;
      case 'dice':
        return <DiceScene {...props} />;
      case 'shuffle':
        return <ShuffleScene {...props} />;
      case 'lottery':
        return <LotteryScene {...props} />;
      default:
        return null;
    }
  })();

  return <SceneShell>{scene}</SceneShell>;
}

export function AnimationTypeIcon({ type }: { type: AnimationType }) {
  const icons: Record<AnimationType, string> = {
    wheel: '🎡',
    slot: '🎰',
    dice: '🎲',
    shuffle: '🃏',
    lottery: '🎱',
  };
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-accent/15 text-2xl">
      {icons[type]}
    </span>
  );
}
