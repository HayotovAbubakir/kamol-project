'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type TracePoint = {
  x: number;
  y: number;
  t: number;
};

const FADE_MS = 5200;

export function BlueprintGrid() {
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
    const traces: TracePoint[] = [];
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
      const now = performance.now();
      const last = traces[traces.length - 1];
      if (!last || Math.hypot(e.clientX - last.x, e.clientY - last.y) > 2.5) {
        traces.push({ x: e.clientX, y: e.clientY, t: now });
      }
      if (traces.length > 220) traces.shift();
    }

    function pointAlpha(now: number, t: number) {
      const raw = Math.max(0, 1 - (now - t) / FADE_MS);
      return raw * raw;
    }

    function draw(now: number) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dark = document.documentElement.classList.contains('dark');

      while (traces.length > 0 && now - traces[0].t > FADE_MS) {
        traces.shift();
      }

      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = dark ? 'rgba(92, 184, 138, 0.1)' : 'rgba(88, 113, 95, 0.16)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 10, pointer.x, pointer.y, 280);
      glow.addColorStop(0, dark ? 'rgba(92, 184, 138, 0.16)' : 'rgba(88, 113, 95, 0.22)');
      glow.addColorStop(1, 'rgba(88, 113, 95, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < traces.length; i += 1) {
        const prev = traces[i - 1];
        const curr = traces[i];
        const alphaPrev = pointAlpha(now, prev.t);
        const alphaCurr = pointAlpha(now, curr.t);
        const alpha = Math.min(alphaPrev, alphaCurr) * (dark ? 0.58 : 0.48);
        if (alpha <= 0.008) continue;

        const grad = ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
        const c = dark ? '92, 184, 138' : '88, 113, 95';
        grad.addColorStop(0, `rgba(${c}, ${alphaPrev * (dark ? 0.58 : 0.48)})`);
        grad.addColorStop(1, `rgba(${c}, ${alphaCurr * (dark ? 0.58 : 0.48)})`);

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6 + alpha * 1.6;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('pointermove', onMove, { passive: true });
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
