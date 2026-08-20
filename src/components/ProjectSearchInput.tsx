'use client';

import { cn } from '@/lib/utils';

interface ProjectSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  className?: string;
  autoFocus?: boolean;
}

export function ProjectSearchInput({
  value,
  onChange,
  placeholder,
  clearLabel,
  className,
  autoFocus = false,
}: ProjectSearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-app-muted" aria-hidden>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className="ui-input w-full !py-3 !pl-10 !pr-10"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="ui-icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"
          aria-label={clearLabel}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
