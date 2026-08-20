import { cn } from '@/lib/utils';

function IconBase({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconLocation({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

export function IconPhone({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5L15.5 13l4 1.5v3a2 2 0 0 1-2.1 2A16 16 0 0 1 4 6.1 2 2 0 0 1 6.5 4Z" />
    </IconBase>
  );
}

export function IconCalendar({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </IconBase>
  );
}

export function IconWallet({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8Z" />
      <path d="M4 8V6a2 2 0 0 1 2-2h12M18 14h2" />
    </IconBase>
  );
}

export function IconUser({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconBase>
  );
}

export function IconClipboard({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
      <path d="M9 12h6M9 16h4" />
    </IconBase>
  );
}

export function IconNote({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M16 4v4h4M9 13h6M9 17h4" />
    </IconBase>
  );
}

export function IconCheck({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

export function IconReturn({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 7H4v3" />
      <path d="M4 10a8 8 0 1 0 2.3-5.7L4 7" />
    </IconBase>
  );
}
