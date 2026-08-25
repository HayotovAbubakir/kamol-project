'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, logoutRequest } from '@/lib/auth';
import { useAdminDataOptional } from '@/context/AdminDataContext';
import { useWorkerDataOptional } from '@/context/WorkerDataContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { UserAvatar } from '@/components/UserAvatar';
import { WorkerTitleBadge } from '@/components/WorkerTitleBadge';
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

  const notifications =
    role === 'admin'
      ? (adminData?.notifications ?? [])
      : (workerData?.notifications ?? []);
  const unread = notifications.filter((n) => !n.read).length;
  const returnedCount =
    role === 'worker' ? (workerData?.returnedProjects.length ?? 0) : 0;

  const root = role === 'admin' ? '/admin' : '/worker';
  const isAdminDashboard = role === 'admin' && pathname === '/admin';
  const sessionUser =
    role === 'worker'
      ? (workerData?.session ?? getSession())
      : (adminData?.session ?? getSession());

  const nav = useMemo<NavItem[]>(() => {
    if (role === 'admin') {
      return [
        { href: '/admin', labelKey: 'nav.home', icon: <HomeIcon /> },
        { href: '/admin/projects', labelKey: 'nav.projects', icon: <FolderIcon /> },
        { href: '/admin/workers', labelKey: 'nav.workers', icon: <UsersIcon /> },
        { href: '/admin/leaderboard', labelKey: 'nav.leaderboard', icon: <TrophyIcon /> },
        { href: '/admin/settings', labelKey: 'nav.settings', icon: <GearIcon /> },
      ];
    }
    return [
      { href: '/worker', labelKey: 'nav.home', icon: <HomeIcon /> },
      { href: '/worker/projects', labelKey: 'nav.myProjects', icon: <FolderIcon /> },
      { href: '/worker/completed', labelKey: 'nav.completed', icon: <CheckIcon /> },
      { href: '/worker/returned', labelKey: 'nav.returnedProjects', icon: <ReturnIcon /> },
      { href: '/worker/leaderboard', labelKey: 'nav.leaderboard', icon: <TrophyIcon /> },
      { href: '/worker/work-pass', labelKey: 'nav.designPass', icon: <TrophyIcon /> },
      { href: '/worker/settings', labelKey: 'nav.settings', icon: <GearIcon /> },
    ];
  }, [role]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await logoutRequest();
    router.push('/');
  }

  const notificationsPath = `${root}/notifications`;
  const isNotificationsPage = pathname === notificationsPath;
  const isWaterAtmosphere =
    pathname?.includes('/projects') ||
    pathname?.includes('/workers') ||
    pathname?.includes('/notifications') ||
    pathname?.includes('/completed') ||
    pathname?.includes('/returned');

  return (
    <div className={cn('h-dvh overflow-hidden bg-app-bg text-app-text', isWaterAtmosphere && 'app-shell-water')}>
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
          'ui-glass-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 w-[min(17rem,88vw)] flex-col overflow-hidden text-white transition-transform lg:w-64 lg:translate-x-0 xl:w-72 2xl:w-80',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="shrink-0 px-5 py-4">
          <Link
            href={root}
            aria-label={t('nav.home')}
            className="mx-auto block w-fit transition hover:opacity-95"
          >
            <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
              <Logo size="lg" tone="dark" className="sidebar-logo" />
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3">
          {nav.map((item) => {
            const active = isActive(pathname, item.href, root);
            const showReturnedBadge = item.href.endsWith('/returned') && returnedCount > 0;
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
                <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                {showReturnedBadge && (
                  <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-deadline-red px-1.5 text-[10px] font-bold text-white">
                    {returnedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 dark:border-metallic-green/20">
          <button type="button" onClick={logout} className="ui-sidebar-btn">
            {t('common.logout')}
          </button>
        </div>
      </aside>

      <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden lg:pl-64 xl:pl-72 2xl:pl-80">
        <PageAtmosphere />
        <header
          className={cn(
            'ui-glass-nav z-20 flex shrink-0 items-center gap-2 border-b px-3 xs:gap-3 xs:px-4 sm:px-6 lg:px-8',
            isAdminDashboard
              ? 'pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:py-2 lg:pt-2'
              : 'pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:py-3 lg:pt-3',
          )}
        >
          <button
            type="button"
            className="ui-icon-btn ui-touch-target text-app-accent lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t('common.menu')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <div className="hidden font-display text-sm font-semibold tracking-wide text-app-muted lg:block xl:text-base">
            KAMOL PROJECT
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 xs:gap-2">
            {sessionUser && (
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-app-border/35 bg-app-bg/35 px-1.5 py-1 xs:px-2 xs:py-1.5">
                <UserAvatar
                  name={sessionUser.name}
                  seed={sessionUser.id}
                  size="lg"
                  frame={role === 'worker' ? workerData?.gamification?.avatarFrame : 'default'}
                  badge={role === 'worker' ? workerData?.gamification?.avatarBadge : undefined}
                  designPassFrameClass={role === 'worker' ? workerData?.gamification?.designPassFrameClass : undefined}
                  designPassFrameColor={role === 'worker' ? workerData?.gamification?.designPassFrameColor : undefined}
                />
                <div className="hidden min-w-0 max-w-[8rem] xs:block xs:max-w-[10rem] md:max-w-[14rem]">
                  <p className="truncate text-sm font-semibold leading-tight text-app-text">{sessionUser.name}</p>
                  {role === 'worker' && workerData?.gamification ? (
                    <WorkerTitleBadge
                      title={workerData.gamification.title}
                      specialTitles={workerData.gamification.specialTitles}
                      size="sm"
                      className="mt-0.5"
                    />
                  ) : (
                    <p className="truncate text-[11px] leading-tight text-app-muted">
                      {role === 'worker' ? t('common.roleWorker') : t('common.roleAdmin')}
                    </p>
                  )}
                </div>
              </div>
            )}
            <Link
              href={notificationsPath}
              className={cn(
                'ui-icon-btn ui-touch-target relative text-app-text',
                isNotificationsPage && 'bg-app-accent/10 text-app-accent',
              )}
              aria-label={t('nav.notifications')}
            >
              <span className="h-5 w-5">
                <BellIcon />
              </span>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-deadline-red px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={logout}
              className="ui-btn-outline ui-btn-sm ui-touch-target hidden xs:inline-flex lg:hidden"
            >
              {t('common.logout')}
            </button>
          </div>
        </header>

        <main
          className={cn(
            'ui-page-shell relative z-10 flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] xs:px-4 sm:px-6 lg:px-8 lg:pb-8',
            isAdminDashboard ? 'overflow-hidden py-2 sm:py-2.5' : 'overflow-y-auto pt-3 sm:pt-4 md:pt-5',
          )}
        >
          {children}
        </main>

        <nav className="ui-mobile-nav" aria-label={t('common.menu')}>
          <div className="ui-mobile-nav-inner">
            {nav.map((item) => {
              const active = isActive(pathname, item.href, root);
              const showReturnedBadge = item.href.endsWith('/returned') && returnedCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('ui-mobile-nav-item', active && 'ui-mobile-nav-item-active')}
                >
                  <span className="relative ui-mobile-nav-icon">
                    {item.icon}
                    {showReturnedBadge && (
                      <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-deadline-red px-1 text-[9px] font-bold text-white">
                        {returnedCount > 9 ? '9+' : returnedCount}
                      </span>
                    )}
                  </span>
                  <span className="ui-mobile-nav-label">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full">
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

function TrophyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5h8v4a4 4 0 0 1-8 0V5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5.5A2.5 2.5 0 0 0 8 9.5M16 7h2.5A2.5 2.5 0 0 1 16 9.5M9 17h6M12 13v4M8 21h8" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}
