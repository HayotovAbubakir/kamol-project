'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

const COLS = 240;
const ROWS = 136;

export function WaterSurface() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctxRaw = canvas.getContext('2d', { alpha: true });
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    const buffer = document.createElement('canvas');
    buffer.width = COLS;
    buffer.height = ROWS;
    const bctxRaw = buffer.getContext('2d');
    if (!bctxRaw) return;
    const bctx: CanvasRenderingContext2D = bctxRaw;
    const image = bctx.createImageData(COLS, ROWS);
    const pixels = image.data;

    let height = new Float32Array(COLS * ROWS);
    let previous = new Float32Array(COLS * ROWS);
    const pointer = {
      x: 0.5,
      y: 0.5,
      px: 0.5,
      py: 0.5,
      cx: window.innerWidth / 2,
      cy: window.innerHeight / 2,
      pcx: window.innerWidth / 2,
      pcy: window.innerHeight / 2,
    };
    let raf = 0;
    let rain = 0;
    let start = performance.now();
    let pointerEnergy = 0;

    function idx(x: number, y: number) {
      return y * COLS + x;
    }

    function splash(nx: number, ny: number, radius: number, force: number) {
      const cx = Math.floor(nx * COLS);
      const cy = Math.floor(ny * ROWS);
      const r = Math.max(2, radius);
      for (let y = cy - r; y <= cy + r; y += 1) {
        if (y <= 0 || y >= ROWS - 1) continue;
        for (let x = cx - r; x <= cx + r; x += 1) {
          if (x <= 0 || x >= COLS - 1) continue;
          const d = Math.hypot(x - cx, y - cy);
          if (d >= r) continue;
          height[idx(x, y)] += force * (1 - d / r);
        }
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function disturb(clientX: number, clientY: number, scale = 1) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      pointer.pcx = pointer.cx;
      pointer.pcy = pointer.cy;
      pointer.cx = clientX;
      pointer.cy = clientY;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = clientX / w;
      pointer.y = clientY / h;

      const speed = Math.hypot(pointer.cx - pointer.pcx, pointer.cy - pointer.pcy) / Math.max(w, h);
      const steps = Math.min(8, Math.max(2, Math.ceil(speed * 40)));
      const force = Math.min(18, (2.4 + speed * 24) * scale);
      const radius = Math.min(10, (4 + speed * 10) * scale);

      pointerEnergy = Math.min(3, pointerEnergy + speed * 28 + scale * 0.25);

      splash(pointer.x, pointer.y, Math.max(3.5, radius * 0.75), Math.max(1.4, force * 0.55));

      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        splash(
          pointer.px + (pointer.x - pointer.px) * t,
          pointer.py + (pointer.y - pointer.py) * t,
          radius,
          force / steps,
        );
      }
    }

    function onPointerMove(e: PointerEvent) {
      disturb(e.clientX, e.clientY, 1);
    }

    function onPointerDown(e: PointerEvent) {
      disturb(e.clientX, e.clientY, 1.5);
    }

    function step() {
      for (let y = 1; y < ROWS - 1; y += 1) {
        for (let x = 1; x < COLS - 1; x += 1) {
          const i = idx(x, y);
          const next =
            (height[i - 1] + height[i + 1] + height[i - COLS] + height[i + COLS]) / 2 -
            previous[i];
          previous[i] = next * 0.993;
        }
      }
      const swap = height;
      height = previous;
      previous = swap;
    }

    function paint(now: number) {
      const dark = document.documentElement.classList.contains('dark');
      const data = pixels;
      const t = (now - start) / 1000;

      for (let y = 1; y < ROWS - 1; y += 1) {
        for (let x = 1; x < COLS - 1; x += 1) {
          const i = idx(x, y);
          const swell =
            Math.sin(x * 0.08 + t * 0.75) * 2.1 +
            Math.sin(y * 0.065 + x * 0.028 + t * 0.48) * 1.45 +
            Math.sin((x + y) * 0.04 - t * 0.36) * 0.85;
          const h = height[i] * 2.1 + swell;
          const hx =
            (height[i + 1] - height[i - 1]) * 2.1 +
            (Math.sin((x + 1) * 0.08 + t * 0.75) - Math.sin((x - 1) * 0.08 + t * 0.75)) * 1.45;
          const hy =
            (height[i + COLS] - height[i - COLS]) * 2.1 +
            (Math.sin((y + 1) * 0.065 + t * 0.48) - Math.sin((y - 1) * 0.065 + t * 0.48)) * 1.15;
          let nx = -hx * 0.2;
          let ny = -hy * 0.2;
          let nz = 1;
          const inv = 1 / Math.hypot(nx, ny, nz);
          nx *= inv;
          ny *= inv;
          nz *= inv;

          const ndot = Math.max(0, nx * -0.32 + ny * -0.62 + nz * 0.72);
          const spec = ndot ** 20;
          const fresnel = Math.pow(1 - Math.max(0, nz), 2.1);
          const depth = Math.max(-12, Math.min(12, h));
          const sky = fresnel * 0.48;

          let r: number;
          let g: number;
          let b: number;
          let a: number;
          if (dark) {
            r = 14 + depth * 0.7 + spec * 150 + sky * 36;
            g = 38 + depth * 1.05 + spec * 138 + sky * 48;
            b = 48 + depth * 1.2 + spec * 128 + sky * 58;
            a = 72 + spec * 88 + fresnel * 38 + Math.abs(depth) * 1.35;
          } else {
            r = 40 + depth * 0.95 + spec * 135 + sky * 52;
            g = 96 + depth * 1.25 + spec * 122 + sky * 32;
            b = 112 + depth * 1.45 + spec * 112 + sky * 28;
            a = 78 + spec * 78 + fresnel * 34 + Math.abs(depth) * 1.45;
          }

          const p = i * 4;
          data[p] = Math.max(0, Math.min(255, r));
          data[p + 1] = Math.max(0, Math.min(255, g));
          data[p + 2] = Math.max(0, Math.min(255, b));
          data[p + 3] = Math.max(0, Math.min(215, a));
        }
      }

      bctx.putImageData(image, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(buffer, 0, 0, window.innerWidth, window.innerHeight);
    }

    function tick(now: number) {
      rain += 1;
      if (rain % 24 === 0) {
        splash(Math.random() * 0.9 + 0.05, Math.random() * 0.9 + 0.05, 2.4, 1.6 + Math.random() * 2.2);
      }
      if (pointerEnergy > 0.02) {
        splash(pointer.x, pointer.y, 5 + pointerEnergy * 1.2, 0.9 + pointerEnergy * 0.9);
        pointerEnergy *= 0.84;
      }
      step();
      step();
      paint(now);
      raf = requestAnimationFrame(tick);
    }

    resize();
    splash(0.5, 0.45, 9, 6);
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  if (reduced) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
