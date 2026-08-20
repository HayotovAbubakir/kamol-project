interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-app-accent/25 bg-gradient-to-b from-app-card to-app-bg/50 px-6 py-10 text-center shadow-[0_16px_48px_rgba(29,39,32,0.08)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.35)] dark:ring-1 dark:ring-metallic-green/10">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--app-accent) 0.6px, transparent 0.8px)', backgroundSize: '18px 18px' }} />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21V8.25L12 3l8.25 5.25V21M9 21v-6h6v6" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-app-text">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-app-muted">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
