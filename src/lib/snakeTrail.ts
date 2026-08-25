import type { CursorTrailPalette } from '@/lib/cursorTrail';

export interface SnakeTrailPoint {
  x: number;
  y: number;
  bornAt: number;
}

interface PathSample {
  x: number;
  y: number;
  age: number;
  progress: number;
}

function catmullRom(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function buildSmoothSamples(
  points: SnakeTrailPoint[],
  headX: number,
  headY: number,
  now: number,
  lifetimeMs: number,
): PathSample[] {
  const alive = points.filter((point) => now - point.bornAt < lifetimeMs);
  points.length = 0;
  points.push(...alive);

  const anchors = alive.map((point) => ({
    x: point.x,
    y: point.y,
    age: now - point.bornAt,
  }));
  anchors.push({ x: headX, y: headY, age: 0 });

  if (anchors.length === 0) return [];
  if (anchors.length === 1) {
    return [{ x: headX, y: headY, age: 0, progress: 1 }];
  }

  const samples: PathSample[] = [];
  const lastIndex = anchors.length - 1;

  for (let i = 0; i < lastIndex; i += 1) {
    const p0 = anchors[Math.max(0, i - 1)];
    const p1 = anchors[i];
    const p2 = anchors[i + 1];
    const p3 = anchors[Math.min(lastIndex, i + 2)];
    const steps = Math.max(6, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2.5));

    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const pos = catmullRom(p0, p1, p2, p3, t);
      const progress = (i + t) / lastIndex;
      const age = p1.age + (p2.age - p1.age) * t;
      samples.push({ x: pos.x, y: pos.y, age, progress });
    }
  }

  const tail = anchors[lastIndex];
  samples.push({ x: tail.x, y: tail.y, age: tail.age, progress: 1 });
  return samples;
}

export function drawSnakeTrail(
  ctx: CanvasRenderingContext2D,
  now: number,
  points: SnakeTrailPoint[],
  headX: number,
  headY: number,
  headAngle: number,
  getPalette: (ageMs: number) => CursorTrailPalette,
  dark: boolean,
  lifetimeMs: number,
): void {
  const samples = buildSmoothSamples(points, headX, headY, now, lifetimeMs);
  if (samples.length === 0) {
    drawSnakeHead(ctx, headX, headY, headAngle, getPalette(0), dark, 1);
    return;
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Wide soft body
  for (let i = 0; i < samples.length - 1; i += 1) {
    const s0 = samples[i];
    const s1 = samples[i + 1];
    const tailFade = Math.max(0, 1 - s0.age / lifetimeMs);
    if (tailFade <= 0.01) continue;

    const palette = getPalette(s0.age);
    const width = 2.5 + s0.progress * 12;
    const alpha = tailFade * (0.18 + s0.progress * 0.72) * palette.wideBaseA * 2.4;

    ctx.strokeStyle = `rgba(${palette.wide}, ${Math.min(1, alpha)})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.stroke();
  }

  // Bright inner core near the head
  for (let i = 0; i < samples.length - 1; i += 1) {
    const s0 = samples[i];
    const s1 = samples[i + 1];
    if (s0.progress < 0.35) continue;

    const tailFade = Math.max(0, 1 - s0.age / lifetimeMs);
    const palette = getPalette(s0.age);
    const width = 1 + (s0.progress - 0.35) * 4.5;
    const alpha = tailFade * (0.25 + (s0.progress - 0.35) * 0.9) * palette.brightBaseA * 0.75;

    ctx.strokeStyle = `rgba(${palette.bright}, ${Math.min(1, alpha)})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.stroke();
  }

  ctx.restore();
  drawSnakeHead(ctx, headX, headY, headAngle, getPalette(0), dark, 1);
}

function drawSnakeHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  palette: CursorTrailPalette,
  _dark: boolean,
  alpha: number,
): void {
  const [r, g, b] = palette.glow;
  const [br, bg, bb] = palette.bright.split(',').map((part) => Number(part.trim()));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.14 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(7.5, 0);
  ctx.quadraticCurveTo(-2, -5.5, -5.5, 0);
  ctx.quadraticCurveTo(-2, 5.5, 7.5, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${0.45 * alpha})`;
  ctx.beginPath();
  ctx.ellipse(1.5, 0, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
