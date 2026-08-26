'use client';

import {
  Award,
  Crown,
  Gem,
  Hexagon,
  Medal,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RANK_ICONS: Record<string, LucideIcon> = {
  iron: Shield,
  bronze: Medal,
  silver: Award,
  gold: Trophy,
  platinum: Hexagon,
  diamond: Gem,
  master: Swords,
  grandmaster: Crown,
  epic: Sparkles,
  legend: Star,
  points_king: Crown,
  month_champion: Medal,
  hof_legend: Trophy,
};

const RANK_COLOR: Record<string, string> = {
  iron: 'text-slate-400',
  bronze: 'text-orange-500',
  silver: 'text-slate-300',
  gold: 'text-amber-400',
  platinum: 'text-cyan-200',
  diamond: 'text-cyan-400',
  master: 'text-violet-400',
  grandmaster: 'text-amber-300',
  epic: 'text-fuchsia-400',
  legend: 'text-yellow-300',
  points_king: 'text-cyan-400',
  month_champion: 'text-amber-400',
  hof_legend: 'text-amber-300',
};

export function RankIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const Icon = RANK_ICONS[id];
  if (!Icon) return null;
  return (
    <Icon
      aria-hidden
      strokeWidth={1.9}
      className={cn('h-4 w-4 shrink-0', RANK_COLOR[id], className)}
    />
  );
}

export function isRankIconId(id?: string | null): boolean {
  return !!id && id in RANK_ICONS;
}

export function TitleIcon({
  id,
  className,
}: {
  id?: string | null;
  className?: string;
}) {
  if (id && isRankIconId(id)) {
    return <RankIcon id={id} className={className} />;
  }
  return (
    <Sparkles
      aria-hidden
      strokeWidth={1.9}
      className={cn('h-4 w-4 shrink-0 text-app-accent', className)}
    />
  );
}

const PLACE_COLOR: Record<1 | 2 | 3, string> = {
  1: 'text-amber-400',
  2: 'text-slate-300',
  3: 'text-orange-400',
};

export function PlaceMedal({
  place,
  className,
}: {
  place: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <Medal
      aria-hidden
      strokeWidth={1.9}
      className={cn('h-4 w-4 shrink-0', PLACE_COLOR[place], className)}
    />
  );
}
