'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

const FRAME_MS = 33;
const POINTER_MS = 40;

type Dust = {
  x: number;
  y: number;
  r: number;
  s: number;
  a: number;
  drift: number;
  phase: number;
};

export function DustField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const view = {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      dark: document.documentElement.classList.contains('dark'),
    };

    const pointer = { x: view.width / 2, y: view.height / 2 };
    let particles: Dust[] = [];
    let raf = 0;
    let hidden = document.hidden;
    let lastPaint = 0;
    let lastPointer = 0;
    const lightPrefix = 'rgba(88, 113, 95, ';
    const darkPrefix = 'rgba(181, 231, 205, ';

    function spawn() {
      const count = view.width < 640 ? 44 : 64;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * view.width,
        y: Math.random() * view.height,
        r: 1 + Math.random() * 2.2,
        s: 0.15 + Math.random() * 0.45,
        a: 0.12 + Math.random() * 0.25,
        drift: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      const cnv = canvas!;
      const c = ctx!;
      view.width = window.innerWidth;
      view.height = window.innerHeight;
      view.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cnv.width = Math.round(view.width * view.dpr);
      cnv.height = Math.round(view.height * view.dpr);
      cnv.style.width = `${view.width}px`;
      cnv.style.height = `${view.height}px`;
      c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      spawn();
    }

    function syncTheme() {
      view.dark = document.documentElement.classList.contains('dark');
    }

    function onMove(event: PointerEvent) {
      const now = performance.now();
      if (now - lastPointer < POINTER_MS) return;
      lastPointer = now;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function draw(now: number) {
      const c = ctx!;
      const { width, height } = view;
      c.clearRect(0, 0, width, height);

      const prefix = view.dark ? darkPrefix : lightPrefix;
      const time = now / 900;

      for (const p of particles) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 25600) {
          const dist = Math.sqrt(dist2) || 1;
          p.x += (dx / dist) * 0.8;
          p.y += (dy / dist) * 0.8;
        }

        p.y -= p.s;
        p.x += Math.sin(time + p.phase + p.y * 0.005) * p.drift;

        if (p.y < -8) {
          p.y = height + 8;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;

        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fillStyle = `${prefix}${p.a})`;
        c.fill();
      }
    }

    function tick(now: number) {
      if (hidden) return;
      raf = requestAnimationFrame(tick);
      if (now - lastPaint < FRAME_MS) return;
      lastPaint = now;
      draw(now);
    }

    function onVisibilityChange() {
      hidden = document.hidden;
      if (hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      lastPaint = 0;
      raf = requestAnimationFrame(tick);
    }

    resize();
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reduced]);

  if (reduced) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
