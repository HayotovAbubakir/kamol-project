import type { CSSProperties } from 'react';
import { TitleIcon } from '@/components/icons/RankIcons';
import { getAvatarPalette, getPersonInitials } from '@/lib/personAvatar';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-9 w-9 text-xs',
  xl: 'h-10 w-10 text-sm',
} as const;

export type UserAvatarSize = keyof typeof SIZE_CLASS;
export type UserAvatarFrame =
  | 'default'
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legend'
  | 'champion';

interface UserAvatarProps {
  name: string;
  size?: UserAvatarSize;
  className?: string;
  seed?: string;
  frame?: UserAvatarFrame;
  badge?: string;
  designPassFrameClass?: string | null;
  designPassFrameColor?: string | null;
}

const FRAME_CLASS: Record<UserAvatarFrame, string> = {
  default: '',
  iron: 'avatar-frame-iron',
  bronze: 'avatar-frame-bronze',
  silver: 'avatar-frame-silver',
  gold: 'avatar-frame-gold',
  platinum: 'avatar-frame-platinum',
  diamond: 'avatar-frame-diamond',
  legend: 'avatar-frame-legend',
  champion: 'avatar-frame-champion',
};

export function UserAvatar({
  name,
  size = 'md',
  className,
  seed,
  frame = 'default',
  badge,
  designPassFrameClass,
  designPassFrameColor,
}: UserAvatarProps) {
  const initials = getPersonInitials(name);
  const palette = getAvatarPalette(seed ?? name);
  const showCrown = frame === 'champion' && !badge;

  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          'flex items-center justify-center rounded-full border-2 font-bold tracking-wide',
          SIZE_CLASS[size],
          FRAME_CLASS[frame],
          designPassFrameClass,
          className,
        )}
        style={{
          background: palette.background,
          color: palette.foreground,
          borderColor: frame === 'default' ? palette.ring : undefined,
          boxShadow:
            frame === 'default'
              ? `inset 0 1px 0 rgba(255,255,255,0.24), 0 3px 10px ${palette.shadow}`
              : undefined,
          ...(designPassFrameColor
            ? ({ ['--dp-frame-color']: designPassFrameColor } as CSSProperties)
            : {}),
        }}
        aria-hidden
        title={name}
      >
        {initials}
      </span>
      {(badge || showCrown) && (
        <span
          className={cn(
            'absolute flex items-center justify-center leading-none',
            badge ? '-bottom-1 -right-1 text-[11px]' : '-right-1 -top-1 text-[10px]',
          )}
          aria-hidden
        >
          <TitleIcon id={badge ?? (showCrown ? 'month_champion' : undefined)} className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}
