'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type Dust = { x: number; y: number; r: number; s: number; a: number };

export function DustField() {
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
    let particles: Dust[] = [];
    let raf = 0;

    function spawn() {
      particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 1 + Math.random() * 2.2,
        s: 0.15 + Math.random() * 0.45,
        a: 0.12 + Math.random() * 0.25,
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

    function draw(now: number) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 160) {
          p.x += (dx / dist) * 0.8;
          p.y += (dy / dist) * 0.8;
        }
        p.y -= p.s;
        p.x += Math.sin(now / 900 + p.y) * 0.2;
        if (p.y < -8) {
          p.y = h + 8;
          p.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88, 113, 95, ${p.a})`;
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
