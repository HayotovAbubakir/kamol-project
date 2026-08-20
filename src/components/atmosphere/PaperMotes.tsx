'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
};

export function PaperMotes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    const pointer = { x: -999, y: -999 };
    let motes: Mote[] = [];
    let raf = 0;

    function spawn() {
      const count = 48;
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: -0.25 + Math.random() * 0.5,
        vy: 0.35 + Math.random() * 0.7,
        size: 6 + Math.random() * 12,
        rot: Math.random() * Math.PI,
        vr: -0.02 + Math.random() * 0.04,
      }));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    }

    function onMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const mote of motes) {
        const dx = mote.x - pointer.x;
        const dy = mote.y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 140) {
          const force = (140 - dist) / 140;
          mote.vx += (dx / dist) * force * 0.55;
          mote.vy += (dy / dist) * force * 0.55;
        }

        mote.x += mote.vx;
        mote.y += mote.vy;
        mote.rot += mote.vr;
        mote.vx *= 0.98;
        mote.vy = mote.vy * 0.98 + 0.04;

        if (mote.y > h + 20) {
          mote.y = -20;
          mote.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(mote.x, mote.y);
        ctx.rotate(mote.rot);
        ctx.fillStyle = 'rgba(88, 113, 95, 0.28)';
        ctx.fillRect(-mote.size / 2, -mote.size * 0.65, mote.size, mote.size * 1.3);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
