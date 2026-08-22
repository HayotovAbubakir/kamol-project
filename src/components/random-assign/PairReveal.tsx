'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PairRevealProps {
  workerName: string;
  projectLabel: string;
  onDone: () => void;
}

export function PairReveal({ workerName, projectLabel, onDone }: PairRevealProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="flex w-full max-w-sm flex-col items-center overflow-hidden px-2 text-center"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="w-full rounded-2xl border border-app-accent/40 bg-app-accent/10 px-5 py-5"
        initial={{ y: 12 }}
        animate={{ y: 0 }}
      >
        <motion.span
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-app-accent text-xl text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        >
          ✓
        </motion.span>
        <p className="font-display text-lg font-bold text-app-text">{workerName}</p>
        <p className="mt-2 text-sm font-medium text-app-accent">{projectLabel}</p>
      </motion.div>
    </motion.div>
  );
}
