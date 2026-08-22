'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getSession, saveSession } from '@/lib/auth';
import { useAppSettings } from '@/context/AppSettingsContext';
import { Logo } from '@/components/Logo';
import { BookCoverDrag } from '@/components/BookCoverDrag';
import { DustField } from '@/components/atmosphere/DustField';
import { uiFieldLabelClass, uiInputClass } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useAppSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(session.role === 'admin' ? '/admin' : '/worker');
    }
  }, [router]);

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch<{ user: SessionUser }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      saveSession(data.user);
      router.push(data.user.role === 'admin' ? '/admin' : '/worker');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative h-dvh max-h-dvh overflow-hidden bg-app-bg text-app-text">
      <DustField />

      <section className="relative z-10 flex h-full items-center justify-center px-3 py-3 xs:px-4 sm:px-6 sm:py-4">
        <div className="book-stage w-full max-w-4xl tv:max-w-5xl uhd:max-w-6xl">
          <div className={cn('book relative mx-auto w-full', opened && 'is-open')}>
            <div className="book-shell relative h-[min(620px,calc(100dvh-1rem))] w-full overflow-hidden rounded-[22px] bg-app-card shadow-[0_28px_80px_rgba(29,39,32,0.18)] dark:ring-1 dark:ring-metallic-green/20 sm:rounded-[28px] sm:h-[min(620px,calc(100dvh-1.5rem))] tv:h-[min(700px,calc(100dvh-3rem))]">
              <span className="book-spine" aria-hidden />
              <span className="book-page-stack" aria-hidden />

              <div className="book-pages absolute inset-0">
              <div className="grid h-full min-h-0 max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-2">
                <article className="flex min-h-0 flex-col border-b border-app-border p-5 xs:p-6 sm:p-7 lg:border-b-0 lg:border-r lg:p-8 tv:p-10">
                  <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.22em] text-app-accent">
                    {t('login.badge')}
                  </p>

                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-4 sm:py-5">
                    <div className="login-page-logo rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5 sm:px-6 sm:py-5">
                      <Logo size="lg" tone="dark" className="login-brand-mark" />
                    </div>
                  </div>
                </article>

                <article className="flex min-h-0 flex-col justify-center p-5 xs:p-6 sm:p-7 lg:p-8 tv:p-10">
                  <h2 className="font-display text-xl font-bold xs:text-2xl sm:text-3xl tv:text-4xl">{t('login.title')}</h2>
                  <p className="mt-2 text-sm text-app-muted">{t('login.hint')}</p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-7">
                    <div>
                      <label htmlFor="username" className={uiFieldLabelClass}>
                        {t('common.login')}
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder={t('login.usernamePlaceholder')}
                        className={cn(uiInputClass, 'mt-1.5 !py-3')}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className={uiFieldLabelClass}>
                        {t('common.password')}
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          placeholder={t('login.passwordPlaceholder')}
                          className={cn(uiInputClass, '!py-3 !pr-12')}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="ui-icon-btn absolute right-1 top-1/2 -translate-y-1/2"
                          aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="rounded-xl bg-deadline-red/10 px-3 py-2 text-sm text-deadline-red">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="ui-btn-primary w-full !py-3.5"
                    >
                      {loading ? t('login.submitting') : t('login.submit')}
                    </button>
                  </form>
                </article>
              </div>
              </div>

              <BookCoverDrag
                opened={opened}
                onOpen={() => setOpened(true)}
                openLabel={t('login.openBook')}
                dragHint={t('login.dragToOpen')}
              >
                <span className="book-cover-shine" aria-hidden />
                <span className="book-cover-curl" aria-hidden />
                <span className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent" />
                <span className="absolute inset-y-0 left-3 w-px bg-white/10" />
                <span className="relative flex h-full flex-col items-center justify-center gap-5 px-6 py-8 text-center sm:gap-6">
                  <span className="rounded-full border border-editorial-accent/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-editorial-accent dark:border-white/15 dark:text-[#c8d6c8]">
                    {t('login.badge')}
                  </span>
                  <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5 sm:px-6 sm:py-5">
                    <Logo size="lg" tone="dark" className="login-brand-mark" />
                  </div>
                  <span className="book-open-hint text-xs font-semibold uppercase tracking-[0.24em] text-editorial-accent dark:text-[#c8d6c8]">
                    {t('login.dragToOpen')}
                  </span>
                </span>
                <span className="book-cover-edge" aria-hidden />
                <span className="book-cover-back rounded-[28px] bg-[#efece4] dark:bg-[#161c18]" />
                <span className="book-cover-shadow" aria-hidden />
              </BookCoverDrag>

              {!opened && (
                <button
                  type="button"
                  className="book-open-hitarea"
                  aria-label={t('login.openBook')}
                  onClick={() => setOpened(true)}
                />
              )}
            </div>
            <span className="book-floor-shadow" aria-hidden />
          </div>
        </div>
      </section>
    </div>
  );
}
