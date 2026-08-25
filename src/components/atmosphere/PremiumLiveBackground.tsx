'use client';

import { useEffect, useRef } from 'react';
import type { PremiumLiveId } from '@/lib/background';
import { usePrefersReducedMotion } from '@/hooks/useMotion';

const FRAME_MS = 33;

interface PremiumLiveBackgroundProps {
  variant: PremiumLiveId;
}

export function PremiumLiveBackground({ variant }: PremiumLiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf = 0;
    let last = 0;
    let t = 0;

    const blobs = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.22 + Math.random() * 0.18,
      vx: (Math.random() - 0.5) * 0.00008,
      vy: (Math.random() - 0.5) * 0.00008,
      hue: i * 40,
    }));

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawAurora(time: number) {
      const g = ctx!.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#020617');
      g.addColorStop(1, '#0f172a');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i += 1) {
        const y = h * (0.25 + i * 0.18) + Math.sin(time * 0.0004 + i) * 28;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        for (let x = 0; x <= w; x += 40) {
          const wave = Math.sin(x * 0.008 + time * 0.001 + i) * 36;
          ctx!.lineTo(x, y + wave);
        }
        ctx!.lineTo(w, h);
        ctx!.lineTo(0, h);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(${40 + i * 30}, ${180 + i * 20}, ${140 + i * 10}, ${0.12 + i * 0.04})`;
        ctx!.fill();
      }
    }

    function drawNebula(time: number) {
      ctx!.fillStyle = '#070712';
      ctx!.fillRect(0, 0, w, h);
      for (const b of blobs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -0.1 || b.x > 1.1) b.vx *= -1;
        if (b.y < -0.1 || b.y > 1.1) b.vy *= -1;
        const cx = b.x * w;
        const cy = b.y * h + Math.sin(time * 0.0005 + b.hue) * 20;
        const r = b.r * Math.min(w, h);
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `hsla(${260 + b.hue * 0.3}, 80%, 60%, 0.35)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }

    function drawGolddust(time: number) {
      ctx!.fillStyle = '#0c0a06';
      ctx!.fillRect(0, 0, w, h);
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i += 1) {
        const seed = i * 9973;
        const x = ((seed * 13 + time * 0.02) % w);
        const y = ((seed * 29 + time * 0.015 + Math.sin(time * 0.001 + i) * 40) % h);
        const s = 1 + (seed % 3);
        ctx!.fillStyle = `rgba(251, 191, 36, ${0.15 + (seed % 5) * 0.08})`;
        ctx!.fillRect(x, y, s, s);
      }
    }

    function drawOcean(time: number) {
      const g = ctx!.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#031525');
      g.addColorStop(0.55, '#062a44');
      g.addColorStop(1, '#021018');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);

      for (let i = 0; i < 4; i += 1) {
        const bandY = h * (0.15 + i * 0.12) + Math.sin(time * 0.0006 + i * 1.7) * 18;
        ctx!.strokeStyle = `rgba(56, 189, 248, ${0.08 + i * 0.03})`;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        for (let x = 0; x <= w; x += 24) {
          const y = bandY + Math.sin(x * 0.012 + time * 0.0015 + i) * 14;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      }
    }

    function drawPrism(time: number) {
      ctx!.fillStyle = '#020617';
      ctx!.fillRect(0, 0, w, h);
      const bands = [
        'rgba(236, 72, 153, 0.18)',
        'rgba(99, 102, 241, 0.18)',
        'rgba(34, 211, 238, 0.16)',
        'rgba(251, 191, 36, 0.14)',
      ];
      bands.forEach((color, i) => {
        const offset = Math.sin(time * 0.0007 + i) * 60;
        const grad = ctx!.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.45, color);
        grad.addColorStop(1, 'transparent');
        ctx!.save();
        ctx!.translate(offset, i * 20);
        ctx!.fillStyle = grad;
        ctx!.fillRect(-80, 0, w + 160, h);
        ctx!.restore();
      });
    }

    function drawDaybreak(time: number) {
      const g = ctx!.createLinearGradient(0, 0, w, h * 0.7);
      g.addColorStop(0, '#f8f4ec');
      g.addColorStop(0.45, '#fdf6ee');
      g.addColorStop(1, '#eef6fb');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i += 1) {
        const y = h * (0.18 + i * 0.14) + Math.sin(time * 0.00035 + i * 1.2) * 22;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        for (let x = 0; x <= w; x += 36) {
          const wave = Math.sin(x * 0.006 + time * 0.0008 + i) * 28;
          ctx!.lineTo(x, y + wave);
        }
        ctx!.lineTo(w, h);
        ctx!.lineTo(0, h);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(${255}, ${220 + i * 8}, ${180 + i * 12}, ${0.14 + i * 0.05})`;
        ctx!.fill();
      }

      const sunGrad = ctx!.createRadialGradient(w * 0.72, h * 0.22, 0, w * 0.72, h * 0.22, h * 0.28);
      sunGrad.addColorStop(0, 'rgba(255, 237, 180, 0.45)');
      sunGrad.addColorStop(0.55, 'rgba(255, 220, 140, 0.12)');
      sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx!.fillStyle = sunGrad;
      ctx!.fillRect(0, 0, w, h);
    }

    function drawMist(time: number) {
      ctx!.fillStyle = '#eef2f6';
      ctx!.fillRect(0, 0, w, h);
      for (const b of blobs) {
        b.x += b.vx * 0.6;
        b.y += b.vy * 0.6;
        if (b.x < -0.1 || b.x > 1.1) b.vx *= -1;
        if (b.y < -0.1 || b.y > 1.1) b.vy *= -1;
        const cx = b.x * w;
        const cy = b.y * h + Math.sin(time * 0.0004 + b.hue) * 16;
        const r = b.r * Math.min(w, h) * 1.1;
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
        grad.addColorStop(0.55, 'rgba(226, 232, 240, 0.35)');
        grad.addColorStop(1, 'rgba(238, 242, 246, 0)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }

    function drawBloom(time: number) {
      ctx!.fillStyle = '#f9f5f2';
      ctx!.fillRect(0, 0, w, h);
      const petals = [
        { hx: 320, hy: 40, alpha: 0.28 },
        { hx: 20, hy: 60, alpha: 0.22 },
        { hx: 180, hy: 10, alpha: 0.2 },
        { hx: 90, hy: 80, alpha: 0.18 },
        { hx: 260, hy: 70, alpha: 0.24 },
      ];
      petals.forEach((p, i) => {
        const cx = w * (0.2 + (i * 0.17) % 0.65) + Math.sin(time * 0.0005 + i) * 30;
        const cy = h * (0.25 + (i * 0.13) % 0.5) + Math.cos(time * 0.00045 + i * 1.3) * 24;
        const r = Math.min(w, h) * (0.18 + (i % 3) * 0.04);
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `hsla(${p.hx}, 75%, 82%, ${p.alpha})`);
        grad.addColorStop(0.6, `hsla(${p.hy}, 60%, 88%, ${p.alpha * 0.45})`);
        grad.addColorStop(1, 'rgba(249, 245, 242, 0)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(cx - r, cy - r, r * 2, r * 2);
      });
    }

    function drawCloud(time: number) {
      const g = ctx!.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#eef6ff');
      g.addColorStop(0.55, '#f8fbff');
      g.addColorStop(1, '#f3f0e8');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);

      for (let i = 0; i < 5; i += 1) {
        const drift = Math.sin(time * 0.00025 + i * 1.4) * w * 0.06;
        const baseX = w * (0.1 + i * 0.18) + drift;
        const baseY = h * (0.12 + (i % 3) * 0.11) + Math.sin(time * 0.00035 + i) * 12;
        const cloudW = w * (0.22 + (i % 2) * 0.08);
        const cloudH = h * 0.06;
        ctx!.fillStyle = `rgba(255, 255, 255, ${0.55 + (i % 3) * 0.08})`;
        ctx!.beginPath();
        ctx!.ellipse(baseX, baseY, cloudW * 0.5, cloudH, 0, 0, Math.PI * 2);
        ctx!.ellipse(baseX - cloudW * 0.28, baseY + cloudH * 0.35, cloudW * 0.32, cloudH * 0.85, 0, 0, Math.PI * 2);
        ctx!.ellipse(baseX + cloudW * 0.3, baseY + cloudH * 0.25, cloudW * 0.36, cloudH * 0.9, 0, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawSilk(time: number) {
      ctx!.fillStyle = '#faf7f2';
      ctx!.fillRect(0, 0, w, h);
      const bands = [
        'rgba(255, 255, 255, 0.55)',
        'rgba(243, 232, 255, 0.35)',
        'rgba(255, 251, 235, 0.42)',
        'rgba(224, 242, 254, 0.32)',
      ];
      bands.forEach((color, i) => {
        const offset = Math.sin(time * 0.00055 + i * 1.1) * 48;
        const grad = ctx!.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.42, color);
        grad.addColorStop(1, 'transparent');
        ctx!.save();
        ctx!.translate(offset, i * 18);
        ctx!.fillStyle = grad;
        ctx!.fillRect(-60, 0, w + 120, h);
        ctx!.restore();
      });
    }

    function paint(now: number) {
      t = now;
      switch (variant) {
        case 'aurora':
          drawAurora(now);
          break;
        case 'nebula':
          drawNebula(now);
          break;
        case 'golddust':
          drawGolddust(now);
          break;
        case 'ocean':
          drawOcean(now);
          break;
        case 'prism':
          drawPrism(now);
          break;
        case 'daybreak':
          drawDaybreak(now);
          break;
        case 'mist':
          drawMist(now);
          break;
        case 'bloom':
          drawBloom(now);
          break;
        case 'cloud':
          drawCloud(now);
          break;
        case 'silk':
          drawSilk(now);
          break;
      }
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      paint(now);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced, variant]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
