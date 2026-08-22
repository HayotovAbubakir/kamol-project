'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  trail: { x: number; y: number; a: number }[];
};

type Shell = {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  hue: number;
  done: boolean;
};

export function FireworksField({ autoPlay = false }: { autoPlay?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;

    let sparks: Spark[] = [];
    let shells: Shell[] = [];
    let raf = 0;

    function resize() {
      if (!canvasEl || !context) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = window.innerWidth * dpr;
      canvasEl.height = window.innerHeight * dpr;
      canvasEl.style.width = `${window.innerWidth}px`;
      canvasEl.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function burst(x: number, y: number, baseHue?: number) {
      const hue = baseHue ?? Math.random() * 360;
      const count = 64 + Math.floor(Math.random() * 30);
      const pattern = Math.random();

      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
        let speed: number;

        if (pattern < 0.3) {
          speed = 2.2 + Math.random() * 3.6;
        } else if (pattern < 0.6) {
          speed = (i % 2 === 0 ? 3.8 : 1.6) + Math.random() * 1.2;
        } else {
          speed = 2.6 + Math.random() * 2.8;
        }

        const life = 70 + Math.random() * 50;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          life,
          maxLife: life,
          size: 1.6 + Math.random() * 1.8,
          hue: (hue + Math.random() * 55 - 27 + 360) % 360,
          trail: [],
        });
      }
    }

    function launchShell(clientX: number, clientY: number) {
      const x = clientX;
      const targetY = clientY;
      const dist = window.innerHeight + 10 - targetY;
      const gravity = 0.12;
      const vy = -Math.sqrt(2 * gravity * dist + 2);
      const hue = Math.random() * 360;

      shells.push({
        x,
        y: window.innerHeight + 10,
        vy,
        targetY,
        hue,
        done: false,
      });
    }

    function onPointerDown(e: PointerEvent) {
      launchShell(e.clientX, e.clientY);
    }

    function tick() {
      if (!context) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      context.fillStyle = 'rgba(0, 0, 0, 0.08)';
      context.fillRect(0, 0, w, h);

      for (let si = shells.length - 1; si >= 0; si -= 1) {
        const sh = shells[si];
        sh.y += sh.vy;
        sh.vy += 0.12;

        context.beginPath();
        context.arc(sh.x, sh.y, 2.2, 0, Math.PI * 2);
        context.fillStyle = `hsla(${sh.hue}, 80%, 75%, 0.9)`;
        context.fill();

        const glow = context.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 8);
        glow.addColorStop(0, `hsla(${sh.hue}, 100%, 85%, 0.4)`);
        glow.addColorStop(1, 'transparent');
        context.fillStyle = glow;
        context.fillRect(sh.x - 8, sh.y - 8, 16, 16);

        for (let ti = 0; ti < 3; ti += 1) {
          sparks.push({
            x: sh.x + (Math.random() - 0.5) * 3,
            y: sh.y + Math.random() * 4,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.8 + Math.random() * 1.2,
            life: 12 + Math.random() * 10,
            maxLife: 22,
            size: 0.8 + Math.random() * 0.8,
            hue: (sh.hue + 30) % 360,
            trail: [],
          });
        }

        if (sh.y <= sh.targetY) {
          burst(sh.x, sh.targetY, sh.hue);
          shells.splice(si, 1);
        } else if (sh.vy >= 0) {
          burst(sh.x, sh.y, sh.hue);
          shells.splice(si, 1);
        }
      }

      context.globalCompositeOperation = 'lighter';

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.life -= 1;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        s.trail.push({ x: s.x, y: s.y, a: s.life / s.maxLife });
        if (s.trail.length > 8) s.trail.shift();

        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + 0.032;
        s.x += s.vx;
        s.y += s.vy;

        const alpha = s.life / s.maxLife;
        const fade = alpha * alpha;

        for (let ti = 0; ti < s.trail.length; ti += 1) {
          const pt = s.trail[ti];
          const ta = pt.a * (ti / s.trail.length) * 0.45 * fade;
          context.fillStyle = `hsla(${s.hue}, 100%, 70%, ${ta})`;
          context.beginPath();
          context.arc(pt.x, pt.y, s.size * 0.6, 0, Math.PI * 2);
          context.fill();
        }

        const glow = context.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 5);
        glow.addColorStop(0, `hsla(${s.hue}, 100%, 72%, ${fade * 0.7})`);
        glow.addColorStop(1, 'transparent');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(s.x, s.y, s.size * 5, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `hsla(${s.hue}, 100%, 85%, ${fade})`;
        context.beginPath();
        context.arc(s.x, s.y, s.size * fade, 0, Math.PI * 2);
        context.fill();

        if (alpha < 0.35 && Math.random() < 0.04) {
          s.vx += (Math.random() - 0.5) * 0.4;
          s.vy += Math.random() * 0.2;
        }
      }

      context.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    raf = requestAnimationFrame(tick);

    let autoTimer: ReturnType<typeof setInterval> | undefined;
    if (autoPlay) {
      const fire = () => {
        launchShell(
          window.innerWidth * (0.2 + Math.random() * 0.6),
          window.innerHeight * (0.18 + Math.random() * 0.28),
        );
      };
      fire();
      autoTimer = setInterval(fire, 900);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (autoTimer) clearInterval(autoTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [reduced, autoPlay]);

  if (reduced) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
