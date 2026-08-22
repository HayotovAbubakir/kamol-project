import { cn } from '@/lib/utils';

export type ProjectTabKind = 'pending' | 'active' | 'review' | 'completed';

interface ProjectTabIconProps {
  tab: ProjectTabKind;
  active?: boolean;
  className?: string;
}

function IconSvg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-[1.125rem] w-[1.125rem]', className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function TabGlyph({ tab }: { tab: ProjectTabKind }) {
  switch (tab) {
    case 'pending':
      return (
        <IconSvg>
          <path d="M12 3l1.2 3.6L17 7.8l-3 2.2.9 3.5L12 11.8 9.1 13.5l.9-3.5-3-2.2 3.8-1.2L12 3Z" />
          <path d="M5 16l.8 2.4L8 19l-2 1.5.6 2.3L5 20.8 3.4 22.8l.6-2.3-2-1.5 2.2-.6L5 16Z" opacity="0.85" />
        </IconSvg>
      );
    case 'active':
      return (
        <IconSvg>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 1.5" />
        </IconSvg>
      );
    case 'review':
      return (
        <IconSvg>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H18a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7.5A2.5 2.5 0 0 1 5 15.5V5.5Z" />
          <path d="M8 8h7M8 11.5h5M8 15h3.5" />
          <circle cx="16.5" cy="16.5" r="3.25" />
          <path d="M18.4 18.4 19.8 19.8" />
        </IconSvg>
      );
    case 'completed':
      return (
        <IconSvg>
          <path d="M9 12.5 11 14.5 15.5 10" />
          <circle cx="12" cy="12" r="8.5" />
        </IconSvg>
      );
  }
}

export function ProjectTabIcon({ tab, active = false, className }: ProjectTabIconProps) {
  const toneClass =
    tab === 'pending'
      ? 'ui-segment-tab-badge-pending'
      : tab === 'active'
        ? 'ui-segment-tab-badge-progress'
        : tab === 'review'
          ? 'ui-segment-tab-badge-review'
          : 'ui-segment-tab-badge-completed';

  return (
    <span
      className={cn(
        'ui-segment-tab-badge',
        toneClass,
        active && 'ui-segment-tab-badge-selected',
        className,
      )}
    >
      <TabGlyph tab={tab} />
    </span>
  );
}
