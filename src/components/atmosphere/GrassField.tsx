'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type Blade = {
  x: number;
  h: number;
  w: number;
  hue: number;
  sat: number;
  lit: number;
  phase: number;
  speed: number;
  bend: number;
  layer: number;
};

export function GrassField() {
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

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight, vx: 0 };
    let prevX = pointer.x;
    let blades: Blade[] = [];
    let fieldH = 260;
    let raf = 0;

    function spawn() {
      const w = window.innerWidth;
      const count = Math.min(520, Math.max(220, Math.floor(w * 0.42)));
      blades = [];
      for (let i = 0; i < count; i += 1) {
        const layer = i % 3;
        blades.push({
          x: Math.random() * w,
          h: 48 + Math.random() * 70 + layer * 28,
          w: 1.1 + layer * 0.65 + Math.random() * 1.05,
          hue: 92 + Math.random() * 40,
          sat: 38 + Math.random() * 28,
          lit: 18 + layer * 10 + Math.random() * 8,
          phase: Math.random() * Math.PI * 2,
          speed: 0.7 + Math.random() * 1.6,
          bend: 0,
          layer,
        });
      }
      blades.sort((a, b) => a.layer - b.layer || a.x - b.x);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      fieldH = Math.max(220, Math.round(window.innerHeight * 0.34));
      canvas.width = window.innerWidth * dpr;
      canvas.height = fieldH * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${fieldH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    }

    function onMove(e: PointerEvent) {
      pointer.vx = e.clientX - prevX;
      prevX = e.clientX;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }

    function draw(now: number) {
      const w = window.innerWidth;
      const h = fieldH;
      ctx.clearRect(0, 0, w, h);

      const soil = ctx.createLinearGradient(0, h * 0.4, 0, h);
      soil.addColorStop(0, 'rgba(40, 72, 38, 0)');
      soil.addColorStop(0.55, 'rgba(36, 62, 34, 0.18)');
      soil.addColorStop(1, 'rgba(28, 48, 26, 0.42)');
      ctx.fillStyle = soil;
      ctx.fillRect(0, 0, w, h);

      const t = now / 1000;
      const fieldTop = window.innerHeight - h;
      const mouseInField = pointer.y > fieldTop - 80;
      pointer.vx *= 0.92;

      for (const blade of blades) {
        const distX = pointer.x - blade.x;
        const dist = Math.abs(distX);
        const radius = 70 + blade.layer * 28;
        const near = mouseInField ? Math.exp(-(dist * dist) / (2 * radius * radius)) : 0;
        const dir = distX === 0 ? 0 : distX > 0 ? -1 : 1;
        const ambient = Math.sin(t * blade.speed + blade.phase) * (7 + blade.layer * 3);
        const gust = pointer.vx * near * 0.55;
        const target = ambient + dir * near * (36 + blade.layer * 14) + gust;
        blade.bend += (target - blade.bend) * 0.16;

        const baseY = h + 6;
        const tipX = blade.x + blade.bend;
        const tipY = baseY - blade.h;
        const ctrlX = blade.x + blade.bend * 0.62;
        const ctrlY = baseY - blade.h * 0.42;

        ctx.beginPath();
        ctx.moveTo(blade.x - blade.w, baseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX + blade.w * 0.35, ctrlY, blade.x + blade.w, baseY);
        ctx.closePath();
        ctx.fillStyle = `hsla(${blade.hue}, ${blade.sat}%, ${blade.lit}%, ${0.62 + blade.layer * 0.14})`;
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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[15]"
      aria-hidden
    />
  );
}
