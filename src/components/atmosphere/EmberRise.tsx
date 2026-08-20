'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number };

export function EmberRise() {
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

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const sparks: Spark[] = [];
    let raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      for (let i = 0; i < 3; i += 1) {
        sparks.push({
          x: pointer.x + (Math.random() - 0.5) * 24,
          y: pointer.y + (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.2 - Math.random() * 1.4,
          life: 1,
          size: 2 + Math.random() * 3,
        });
      }
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (Math.random() > 0.6) {
        sparks.push({
          x: Math.random() * w,
          y: h + 6,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -1 - Math.random(),
          life: 1,
          size: 2 + Math.random() * 3,
        });
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.008;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 140, 50, ${s.life * 0.7})`;
        ctx.fill();
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
