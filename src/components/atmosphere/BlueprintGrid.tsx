'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

const FRAME_MS = 33;
const GRID_STEP = 48;
const GLOW_SIZE = 240;
const MIN_SEGMENT_SQ = 4;
const MAX_SEGMENT_SQ = 40000;
// Total lifetime of a trail segment. Alpha decays smoothly from full to zero
// over this duration, so the fade is guaranteed to reach true zero (no 8-bit
// alpha rounding artifacts like the old destination-out approach had).
const TRAIL_LIFETIME_MS = 1400;
// Hard cap on live segments so the per-frame draw cost stays bounded even
// under pathological input (e.g. very fast dragging).
const MAX_SEGMENTS = 240;

interface TrailSegment {
  x0: number;
  y0: number;
  cpx: number;
  cpy: number;
  x1: number;
  y1: number;
  bornAt: number;
}

export function BlueprintGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentsRef = useRef<TrailSegment[]>([]);
  const reduced = usePrefersReducedMotion();
  const pathname = usePathname();

  // Drop any lingering trail segments whenever the user navigates to a new
  // route so trails from the previous page can never leak across pages.
  useEffect(() => {
    segmentsRef.current = [];
  }, [pathname]);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const gridBuf = document.createElement('canvas');
    const gridCtx = gridBuf.getContext('2d');
    const glowBuf = document.createElement('canvas');
    const glowCtx = glowBuf.getContext('2d', { alpha: true });
    if (!gridCtx || !glowCtx) return;

    const view = {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      dark: document.documentElement.classList.contains('dark'),
    };

    const pointer = {
      x: view.w / 2,
      y: view.h / 2,
      mx: view.w / 2,
      my: view.h / 2,
      lastX: view.w / 2,
      lastY: view.h / 2,
      hasPrev: false,
    };

    let raf = 0;
    let hidden = document.hidden;
    let lastPaint = 0;

    function drawGrid() {
      const { w, h, dpr, dark } = view;
      gridBuf.width = Math.max(1, Math.round(w * dpr));
      gridBuf.height = Math.max(1, Math.round(h * dpr));
      gridCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridCtx!.clearRect(0, 0, w, h);
      gridCtx!.strokeStyle = dark ? 'rgba(92, 184, 138, 0.12)' : 'rgba(88, 113, 95, 0.18)';
      gridCtx!.lineWidth = 1;
      gridCtx!.beginPath();
      for (let x = 0; x <= w; x += GRID_STEP) {
        gridCtx!.moveTo(x + 0.5, 0);
        gridCtx!.lineTo(x + 0.5, h);
      }
      for (let y = 0; y <= h; y += GRID_STEP) {
        gridCtx!.moveTo(0, y + 0.5);
        gridCtx!.lineTo(w, y + 0.5);
      }
      gridCtx!.stroke();
    }

    function drawGlowSprite() {
      const size = GLOW_SIZE;
      glowBuf.width = size;
      glowBuf.height = size;
      const cx = size / 2;
      const [r, g, b] = view.dark ? [148, 232, 194] : [96, 138, 112];
      const grad = glowCtx!.createRadialGradient(cx, cx, 0, cx, cx, cx);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.32)`);
      grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.14)`);
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.04)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      glowCtx!.clearRect(0, 0, size, size);
      glowCtx!.fillStyle = grad;
      glowCtx!.fillRect(0, 0, size, size);
    }

    function resize() {
      const cnv = canvas!;
      const c = ctx!;
      view.w = window.innerWidth;
      view.h = window.innerHeight;
      view.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cnv.width = Math.round(view.w * view.dpr);
      cnv.height = Math.round(view.h * view.dpr);
      cnv.style.width = `${view.w}px`;
      cnv.style.height = `${view.h}px`;
      c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      c.lineCap = 'round';
      c.lineJoin = 'round';

      drawGrid();
      drawGlowSprite();
      pointer.hasPrev = false;
    }

    function syncTheme() {
      view.dark = document.documentElement.classList.contains('dark');
      drawGrid();
      drawGlowSprite();
    }

    function onMove(e: PointerEvent) {
      const nx = e.clientX;
      const ny = e.clientY;
      pointer.x = nx;
      pointer.y = ny;

      if (!pointer.hasPrev) {
        pointer.mx = nx;
        pointer.my = ny;
        pointer.lastX = nx;
        pointer.lastY = ny;
        pointer.hasPrev = true;
        return;
      }

      const dx = nx - pointer.lastX;
      const dy = ny - pointer.lastY;
      const d2 = dx * dx + dy * dy;
      if (d2 < MIN_SEGMENT_SQ) return;
      if (d2 > MAX_SEGMENT_SQ) {
        pointer.mx = nx;
        pointer.my = ny;
        pointer.lastX = nx;
        pointer.lastY = ny;
        return;
      }

      const newMx = (pointer.lastX + nx) / 2;
      const newMy = (pointer.lastY + ny) / 2;

      const segs = segmentsRef.current;
      segs.push({
        x0: pointer.mx,
        y0: pointer.my,
        cpx: pointer.lastX,
        cpy: pointer.lastY,
        x1: newMx,
        y1: newMy,
        bornAt: performance.now(),
      });
      // Keep the segment buffer bounded to guarantee a stable per-frame cost.
      if (segs.length > MAX_SEGMENTS) {
        segs.splice(0, segs.length - MAX_SEGMENTS);
      }

      pointer.mx = newMx;
      pointer.my = newMy;
      pointer.lastX = nx;
      pointer.lastY = ny;
    }

    function draw(now: number) {
      const c = ctx!;
      const cnv = canvas!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cnv.width, cnv.height);
      c.drawImage(gridBuf, 0, 0);
      c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      c.lineCap = 'round';
      c.lineJoin = 'round';

      const wideColor = view.dark ? '120, 210, 168' : '70, 100, 82';
      const brightColor = view.dark ? '210, 255, 232' : '255, 255, 255';
      const wideBaseA = view.dark ? 0.32 : 0.26;
      const brightBaseA = view.dark ? 0.9 : 0.85;

      // Redraw each live segment with fresh alpha derived from its age. This
      // is what actually solves the "stuck at low alpha" bug: we always
      // compute the target alpha in floating point, so alpha genuinely
      // reaches 0 when age reaches TRAIL_LIFETIME_MS.
      const segs = segmentsRef.current;
      let write = 0;
      for (let i = 0; i < segs.length; i += 1) {
        const s = segs[i];
        const age = now - s.bornAt;
        if (age >= TRAIL_LIFETIME_MS) continue;
        // Ease-out fade so trails linger a bit at their peak then decay
        // gracefully instead of dropping linearly.
        const t = 1 - age / TRAIL_LIFETIME_MS;
        const a = t * t;

        c.strokeStyle = `rgba(${wideColor}, ${wideBaseA * a})`;
        c.lineWidth = 5.5;
        c.beginPath();
        c.moveTo(s.x0, s.y0);
        c.quadraticCurveTo(s.cpx, s.cpy, s.x1, s.y1);
        c.stroke();

        c.strokeStyle = `rgba(${brightColor}, ${brightBaseA * a})`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(s.x0, s.y0);
        c.quadraticCurveTo(s.cpx, s.cpy, s.x1, s.y1);
        c.stroke();

        segs[write++] = s;
      }
      segs.length = write;

      const size = GLOW_SIZE;
      c.drawImage(glowBuf, pointer.x - size / 2, pointer.y - size / 2, size, size);
    }

    function loop(now: number) {
      if (hidden) return;
      raf = requestAnimationFrame(loop);
      if (now - lastPaint < FRAME_MS) return;
      lastPaint = now;
      draw(now);
    }

    function onVisibility() {
      hidden = document.hidden;
      if (hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      // On resume, drop stale segments so a paused tab doesn't spray a fully
      // decayed batch back onto the screen when it comes back.
      segmentsRef.current = [];
      lastPaint = 0;
      pointer.hasPrev = false;
      raf = requestAnimationFrame(loop);
    }

    resize();
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced]);

  if (reduced) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
