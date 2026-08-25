'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAppSettings } from '@/context/AppSettingsContext';
import { isCursorTrailRgb, resolveTrailPalette } from '@/lib/cursorTrail';
import { drawSnakeTrail, type SnakeTrailPoint } from '@/lib/snakeTrail';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

const FRAME_MS = 16;
const SNAKE_FRAME_MS = 16;
const GRID_STEP = 48;
const GLOW_SIZE = 240;
const MIN_SEGMENT_SQ = 4;
/** Skip trail only for true teleports (window blur / cursor jump), not fast flicks. */
const MAX_TELEPORT_SQ = 810_000; // ~900px
/** Sample spacing so fast moves still leave a continuous trail. */
const TRAIL_SAMPLE_PX = 10;
// Total lifetime of a trail segment. Alpha decays smoothly from full to zero
// over this duration, so the fade is guaranteed to reach true zero (no 8-bit
// alpha rounding artifacts like the old destination-out approach had).
const TRAIL_LIFETIME_MS = 1400;
// Hard cap on live segments so the per-frame draw cost stays bounded even
// under pathological input (e.g. very fast dragging).
const MAX_SEGMENTS = 480;

interface TrailSegment {
  x0: number;
  y0: number;
  cpx: number;
  cpy: number;
  x1: number;
  y1: number;
  bornAt: number;
}

export function BlueprintGrid({ mode = 'full' }: { mode?: 'full' | 'grid' | 'trail' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentsRef = useRef<TrailSegment[]>([]);
  const snakePointsRef = useRef<SnakeTrailPoint[]>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reduced = usePrefersReducedMotion();
  const pathname = usePathname();
  const { cursorTrailEnabled, cursorTrailColor, cursorTrailStyle, theme } = useAppSettings();
  const trailSettingsRef = useRef({
    enabled: cursorTrailEnabled,
    color: cursorTrailColor,
    style: cursorTrailStyle,
    theme,
  });
  trailSettingsRef.current = {
    enabled: cursorTrailEnabled,
    color: cursorTrailColor,
    style: cursorTrailStyle,
    theme,
  };

  // Drop any lingering trail segments whenever the user navigates to a new
  // route so trails from the previous page can never leak across pages.
  useEffect(() => {
    segmentsRef.current = [];
    snakePointsRef.current = [];
  }, [pathname, cursorTrailEnabled]);

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
      angle: 0,
      hasPrev: false,
    };

    let raf = 0;
    let hidden = document.hidden;
    let lastPaint = 0;

    function drawPointerGlow(now: number) {
      const color = trailSettingsRef.current.color;
      const palette = resolveTrailPalette(color, view.dark, now, 0);
      const [r, g, b] = palette.glow;
      const size = GLOW_SIZE;
      const grad = ctx!.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, size / 2);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.32)`);
      grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.14)`);
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.04)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx!.fillStyle = grad;
      ctx!.fillRect(pointer.x - size / 2, pointer.y - size / 2, size, size);
    }

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
      const palette = resolveTrailPalette(trailSettingsRef.current.color, view.dark);
      const [r, g, b] = palette.glow;
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
      const currentMode = modeRef.current;
      if (currentMode === 'grid') return;
      if (!trailSettingsRef.current.enabled) return;

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
      // Genuine teleport (alt-tab / leave window) — reset without a streak.
      if (d2 > MAX_TELEPORT_SQ) {
        pointer.mx = nx;
        pointer.my = ny;
        pointer.lastX = nx;
        pointer.lastY = ny;
        return;
      }

      const style = trailSettingsRef.current.style;
      const wantLine = style === 'line' || style === 'both';
      const wantSnake = style === 'snake' || style === 'both';
      const dist = Math.sqrt(d2);
      // Snake needs denser samples; line stays smooth at ~10px.
      const samplePx = wantSnake ? 4 : TRAIL_SAMPLE_PX;
      const steps = Math.max(1, Math.ceil(dist / samplePx));
      const bornAt = performance.now();

      let prevMx = pointer.mx;
      let prevMy = pointer.my;
      let prevX = pointer.lastX;
      let prevY = pointer.lastY;

      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        const curX = pointer.lastX + dx * t;
        const curY = pointer.lastY + dy * t;
        const curMx = (prevX + curX) / 2;
        const curMy = (prevY + curY) / 2;
        pointer.angle = Math.atan2(curY - prevY, curX - prevX);

        if (wantLine) {
          const segs = segmentsRef.current;
          segs.push({
            x0: prevMx,
            y0: prevMy,
            cpx: prevX,
            cpy: prevY,
            x1: curMx,
            y1: curMy,
            bornAt,
          });
        }

        if (wantSnake) {
          snakePointsRef.current.push({ x: curMx, y: curMy, bornAt });
        }

        prevMx = curMx;
        prevMy = curMy;
        prevX = curX;
        prevY = curY;
      }

      if (wantLine) {
        const segs = segmentsRef.current;
        if (segs.length > MAX_SEGMENTS) {
          segs.splice(0, segs.length - MAX_SEGMENTS);
        }
      }
      if (wantSnake) {
        const snakePoints = snakePointsRef.current;
        if (snakePoints.length > MAX_SEGMENTS) {
          snakePoints.splice(0, snakePoints.length - MAX_SEGMENTS);
        }
      }

      pointer.mx = prevMx;
      pointer.my = prevMy;
      pointer.lastX = nx;
      pointer.lastY = ny;
    }

    function draw(now: number) {
      const c = ctx!;
      const cnv = canvas!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cnv.width, cnv.height);
      const currentMode = modeRef.current;
      const showGrid = currentMode === 'full' || currentMode === 'grid';
      if (showGrid) {
        c.drawImage(gridBuf, 0, 0);
      }
      c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      c.lineCap = 'round';
      c.lineJoin = 'round';

      const trailEnabled =
        trailSettingsRef.current.enabled && (currentMode === 'full' || currentMode === 'trail');
      const trailColor = trailSettingsRef.current.color;
      const getPalette = (ageMs: number) => resolveTrailPalette(trailColor, view.dark, now, ageMs);

      if (trailEnabled) {
        const style = trailSettingsRef.current.style;

        if (style === 'line' || style === 'both') {
          const segs = segmentsRef.current;
          let write = 0;
          for (let i = 0; i < segs.length; i += 1) {
            const s = segs[i];
            const age = now - s.bornAt;
            if (age >= TRAIL_LIFETIME_MS) continue;
            const t = 1 - age / TRAIL_LIFETIME_MS;
            const a = t * t;
            const { wide: wideColor, bright: brightColor, wideBaseA, brightBaseA } = getPalette(age);

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
        }

        if (style === 'snake' || style === 'both') {
          drawSnakeTrail(
            c,
            now,
            snakePointsRef.current,
            pointer.x,
            pointer.y,
            pointer.angle,
            getPalette,
            view.dark,
            TRAIL_LIFETIME_MS,
          );
        } else if (isCursorTrailRgb(trailColor)) {
          drawPointerGlow(now);
        } else {
          const size = GLOW_SIZE;
          c.drawImage(glowBuf, pointer.x - size / 2, pointer.y - size / 2, size, size);
        }
      }
    }

    function loop(now: number) {
      if (hidden) return;
      raf = requestAnimationFrame(loop);
      const style = trailSettingsRef.current.style;
      const frameBudget = style === 'snake' || style === 'both' ? SNAKE_FRAME_MS : FRAME_MS;
      if (now - lastPaint < frameBudget) return;
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
      snakePointsRef.current = [];
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
  }, [reduced, cursorTrailEnabled, cursorTrailColor, cursorTrailStyle, theme, mode]);

  if (reduced) return null;
  if (mode === 'trail' && !cursorTrailEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
