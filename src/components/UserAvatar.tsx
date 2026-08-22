import { getAvatarPalette, getPersonInitials } from '@/lib/personAvatar';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-9 w-9 text-xs',
  xl: 'h-10 w-10 text-sm',
} as const;

export type UserAvatarSize = keyof typeof SIZE_CLASS;

interface UserAvatarProps {
  name: string;
  size?: UserAvatarSize;
  className?: string;
  /** Rangni boshqacha kalit bilan hisoblash (masalan user id). */
  seed?: string;
}

export function UserAvatar({ name, size = 'md', className, seed }: UserAvatarProps) {
  const initials = getPersonInitials(name);
  const palette = getAvatarPalette(seed ?? name);

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 font-bold tracking-wide',
        SIZE_CLASS[size],
        className,
      )}
      style={{
        background: palette.background,
        color: palette.foreground,
        borderColor: palette.ring,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.24), 0 3px 10px ${palette.shadow}`,
      }}
      aria-hidden
      title={name}
    >
      {initials}
    </span>
  );
}
