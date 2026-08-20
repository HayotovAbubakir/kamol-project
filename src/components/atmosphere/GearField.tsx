'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type Gear = {
  x: number;
  y: number;
  r: number;
  teeth: number;
  speed: number;
  angle: number;
};

export function GearField() {
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
    const gears: Gear[] = [
      { x: 0.08, y: 0.18, r: 120, teeth: 16, speed: 0.012, angle: 0 },
      { x: 0.22, y: 0.38, r: 72, teeth: 12, speed: -0.02, angle: 0.4 },
      { x: 0.86, y: 0.16, r: 88, teeth: 14, speed: 0.016, angle: 1 },
      { x: 0.94, y: 0.42, r: 54, teeth: 10, speed: -0.026, angle: 0.2 },
      { x: 0.5, y: 0.5, r: 150, teeth: 20, speed: 0.01, angle: 0 },
      { x: 0.62, y: 0.72, r: 70, teeth: 12, speed: -0.022, angle: 0.7 },
      { x: 0.12, y: 0.78, r: 96, teeth: 15, speed: 0.014, angle: 1.2 },
      { x: 0.84, y: 0.84, r: 110, teeth: 16, speed: -0.013, angle: 0.5 },
    ];
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
    }

    function drawGear(cx: number, cy: number, r: number, teeth: number, angle: number, alpha: number) {
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i += 1) {
        const a = angle + (i * Math.PI) / teeth;
        const rad = i % 2 === 0 ? r : r * 0.74;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(88, 113, 95, ${alpha * 0.08})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(88, 113, 95, ${alpha})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(88, 113, 95, ${alpha * 0.45})`;
      ctx.fill();
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const positions = gears.map((gear) => ({
        gear,
        cx: gear.x * w + (pointer.x / w - 0.5) * 36,
        cy: gear.y * h + (pointer.y / h - 0.5) * 36,
      }));

      ctx.strokeStyle = 'rgba(88, 113, 95, 0.12)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < positions.length; i += 1) {
        const next = positions[(i + 1) % positions.length];
        ctx.beginPath();
        ctx.moveTo(positions[i].cx, positions[i].cy);
        ctx.lineTo(next.cx, next.cy);
        ctx.stroke();
      }

      for (const { gear, cx, cy } of positions) {
        const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
        const near = dist < 220;
        gear.angle += gear.speed * (near ? 4.8 : 1.6);
        const glow = near ? 0.55 : 0.32;
        if (near) {
          const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, gear.r * 1.6);
          g.addColorStop(0, 'rgba(88, 113, 95, 0.18)');
          g.addColorStop(1, 'rgba(88, 113, 95, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(cx - gear.r * 1.6, cy - gear.r * 1.6, gear.r * 3.2, gear.r * 3.2);
        }
        drawGear(cx, cy, gear.r, gear.teeth, gear.angle, glow);
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
