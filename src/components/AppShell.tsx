'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth';
import { useAdminDataOptional } from '@/context/AdminDataContext';
import { useWorkerDataOptional } from '@/context/WorkerDataContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { Logo } from '@/components/Logo';
import { PageAtmosphere } from '@/components/atmosphere/PageAtmosphere';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  role: 'admin' | 'worker';
  children: React.ReactNode;
}

function isActive(pathname: string | null, href: string, root: string) {
  if (!pathname) return false;
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ role, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const adminData = useAdminDataOptional();
  const workerData = useWorkerDataOptional();

  const unread =
    role === 'admin'
      ? (adminData?.notifications.filter((n) => !n.read).length ?? 0)
      : 0;
  const returnedCount =
    role === 'worker' ? (workerData?.returnedProjects.length ?? 0) : 0;

  const root = role === 'admin' ? '/admin' : '/worker';
  const isAdminDashboard = role === 'admin' && pathname === '/admin';

  const nav = useMemo<NavItem[]>(() => {
    if (role === 'admin') {
      return [
        { href: '/admin', labelKey: 'nav.home', icon: <HomeIcon /> },
        { href: '/admin/projects', labelKey: 'nav.projects', icon: <FolderIcon /> },
        { href: '/admin/workers', labelKey: 'nav.workers', icon: <UsersIcon /> },
        { href: '/admin/notifications', labelKey: 'nav.notifications', icon: <BellIcon /> },
        { href: '/admin/settings', labelKey: 'nav.settings', icon: <GearIcon /> },
      ];
    }
    return [
      { href: '/worker', labelKey: 'nav.home', icon: <HomeIcon /> },
      { href: '/worker/projects', labelKey: 'nav.myProjects', icon: <FolderIcon /> },
      { href: '/worker/completed', labelKey: 'nav.completed', icon: <CheckIcon /> },
      { href: '/worker/returned', labelKey: 'nav.returnedProjects', icon: <ReturnIcon /> },
      { href: '/worker/settings', labelKey: 'nav.settings', icon: <GearIcon /> },
    ];
  }, [role]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function logout() {
    clearSession();
    router.push('/');
  }

  return (
    <div className="h-dvh overflow-hidden bg-app-bg text-app-text">
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label={t('common.closeMenu')}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'ui-glass-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col text-white transition-transform lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-6">
          <Link
            href={root}
            aria-label={t('nav.home')}
            className="mx-auto block w-fit transition hover:opacity-95"
          >
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
              <Logo size="lg" tone="dark" className="w-full max-w-[200px]" />
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => {
            const active = isActive(pathname, item.href, root);
            const showBadge = item.href.endsWith('/notifications') && unread > 0;
            const showReturnedBadge = item.href.endsWith('/returned') && returnedCount > 0;
            const badgeCount = showReturnedBadge ? returnedCount : unread;
            const shouldShowBadge = showBadge || showReturnedBadge;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-white/15 text-white dark:bg-metallic-green/20 dark:text-metallic-green'
                    : 'text-white/70 hover:bg-white/10 hover:text-white dark:hover:bg-metallic-green/10',
                )}
              >
                <span className="h-5 w-5 shrink-0">{item.icon}</span>
                <span className="flex-1">{t(item.labelKey)}</span>
                {shouldShowBadge && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-deadline-red px-1.5 text-[10px] font-bold text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 dark:border-metallic-green/20">
          <button
            type="button"
            onClick={logout}
            className="ui-sidebar-btn"
          >
            {t('common.logout')}
          </button>
        </div>
      </aside>

      <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden lg:pl-64">
        <PageAtmosphere />
        <header
          className={cn(
            'ui-glass-nav z-20 flex shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-8',
            isAdminDashboard ? 'py-2' : 'py-3',
          )}
        >
          <button
            type="button"
            className="ui-icon-btn text-app-accent lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t('common.menu')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="hidden font-display text-sm font-semibold tracking-wide text-app-muted lg:block">
            KAMOL PROJECT
          </div>
          <button
            type="button"
            onClick={logout}
            className="ui-btn-outline ui-btn-sm ml-auto lg:hidden"
          >
            {t('common.logout')}
          </button>
        </header>
        <main
          key={pathname}
          className={cn(
            'page-enter relative z-10 mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col overflow-x-hidden px-4 sm:px-8',
            isAdminDashboard ? 'overflow-hidden py-2 sm:py-2.5' : 'overflow-y-auto py-4 sm:py-5',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7.5Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M12.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM20 19v-1a3.5 3.5 0 0 0-2.5-3.35M16.5 4.2a3.5 3.5 0 0 1 0 6.6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.2h3.4l.5 2.1a7 7 0 0 1 1.7 1l2-.8 1.7 2.9-1.5 1.5a7 7 0 0 1 0 2.2l1.5 1.5-1.7 2.9-2-.8a7 7 0 0 1-1.7 1l-.5 2.1h-3.4l-.5-2.1a7 7 0 0 1-1.7-1l-2 .8-1.7-2.9 1.5-1.5a7 7 0 0 1 0-2.2L4.4 8.4l1.7-2.9 2 .8a7 7 0 0 1 1.7-1l.5-2.1Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 9 17.25 19.5 6.75" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H13" />
    </svg>
  );
}
