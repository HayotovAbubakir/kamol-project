'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, saveSession } from '@/lib/auth';
import { useAppSettings } from '@/context/AppSettingsContext';
import { Logo } from '@/components/Logo';
import { BookCoverDrag } from '@/components/BookCoverDrag';
import { PageAtmosphere } from '@/components/atmosphere/PageAtmosphere';
import { uiFieldLabelClass, uiInputClass } from '@/components/ui';
import {
  customBackgroundStorageId,
  isCustomBackgroundId,
} from '@/lib/customBackgrounds';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { t, settingsReady, backgroundId, customBackgrounds } = useAppSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [opened, setOpened] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ user: SessionUser }>('/api/auth')
      .then((res) => {
        if (cancelled) return;
        saveSession(res.user);
        router.replace(res.user.role === 'admin' ? '/admin' : '/worker');
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    if (!settingsReady) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setSceneReady(true);
    }, 5000);

    const finish = () => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setSceneReady(true);
    };

    if (!isCustomBackgroundId(backgroundId)) {
      finish();
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }

    const storageId = customBackgroundStorageId(backgroundId);
    const custom = customBackgrounds.find((item) => item.id === storageId);
    const src = custom?.previewUrl ?? custom?.dataUrl;
    if (!src) {
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }

    if (custom?.mediaType === 'video') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.onloadeddata = finish;
      video.onerror = finish;
      video.src = src;
    } else {
      const img = new Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [settingsReady, backgroundId, customBackgrounds]);

  useEffect(() => {
    if (!opened) return;
    const timer = window.setTimeout(() => {
      document.getElementById('username')?.focus();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [opened]);

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

  const showLogin = sessionChecked && sceneReady;

  return (
    <div className="login-screen relative h-dvh max-h-dvh overflow-hidden bg-transparent text-app-text">
      <PageAtmosphere />

      {!showLogin && (
        <div className="login-loading" role="status" aria-live="polite">
          <div className="login-loading-card">
            <img
              src="/logo.source.png"
              alt=""
              width={96}
              height={96}
              className="login-loading-mark"
              draggable={false}
            />
            <span className="login-loading-spinner" aria-hidden />
            <p className="login-loading-text">{t('login.loading')}</p>
          </div>
        </div>
      )}

      <section
        className={cn(
          'relative z-10 flex h-full items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] xs:px-4 sm:px-6 sm:py-4',
          !showLogin && 'invisible pointer-events-none',
        )}
      >
        <div className="book-stage w-full max-w-4xl tv:max-w-5xl uhd:max-w-6xl">
          <div className={cn('book relative mx-auto w-full', opened && 'is-open')}>
            <div
              className={cn(
                'book-shell relative h-[calc(100dvh-1.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-full overflow-hidden rounded-[18px] xs:h-[min(620px,calc(100dvh-1rem))] xs:rounded-[22px] sm:h-[min(620px,calc(100dvh-1.5rem))] sm:rounded-[28px] tv:h-[min(700px,calc(100dvh-3rem))]',
                !opened && 'border-transparent bg-transparent shadow-none',
              )}
            >
              <span className="book-spine" aria-hidden />
              <span className="book-page-stack" aria-hidden />

              <div className="book-pages absolute inset-0">
              <div className="grid h-full min-h-0 lg:grid-cols-2">
                <article className="login-brand-panel hidden min-h-0 flex-col border-white/20 p-6 lg:flex lg:border-r lg:p-8 tv:p-10">
                  <p className="login-brand-badge shrink-0 text-xs font-semibold uppercase tracking-[0.22em]">
                    {t('login.badge')}
                  </p>

                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-4 sm:py-5">
                    <div className="login-page-logo rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5 sm:px-6 sm:py-5">
                      <Logo size="lg" tone="dark" className="login-brand-mark" />
                    </div>
                  </div>
                </article>

                <article className="login-form-panel flex min-h-0 flex-col overflow-y-auto p-4 xs:p-6 sm:p-7 lg:p-8 tv:p-10">
                  <div className="my-auto">
                  <h2 className="font-display text-xl font-bold xs:text-2xl sm:text-3xl tv:text-4xl">{t('login.title')}</h2>
                  <p className="mt-2 text-sm">{t('login.hint')}</p>

                  <form onSubmit={handleSubmit} className="mt-4 space-y-3 xs:mt-6 xs:space-y-4 sm:mt-7">
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
                          className="ui-icon-btn ui-touch-target absolute right-1 top-1/2 -translate-y-1/2"
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
                      <p
                        role="alert"
                        aria-live="polite"
                        className="rounded-xl bg-deadline-red/10 px-3 py-2 text-sm text-deadline-red"
                      >
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="ui-btn-primary w-full !min-h-12 !py-3.5"
                    >
                      {loading ? t('login.submitting') : t('login.submit')}
                    </button>
                  </form>
                  </div>
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
                <span className="relative flex h-full flex-col items-center justify-center gap-3 px-4 py-6 text-center xs:gap-5 xs:px-6 xs:py-8 sm:gap-6 book-cover-content">
                  <span className="login-cover-badge max-w-[90%] rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] xs:px-4 xs:text-[11px] xs:tracking-[0.28em]">
                    {t('login.badge')}
                  </span>
                  <div className="login-cover-logo rounded-2xl px-4 py-3 xs:px-5 xs:py-4 sm:px-6 sm:py-5">
                    <Logo size="lg" tone="dark" className="login-brand-mark" />
                  </div>
                  <span className="login-cover-hint book-open-hint max-w-[90%] truncate text-[10px] font-semibold uppercase tracking-[0.16em] xs:text-xs xs:tracking-[0.24em]">
                    {t('login.dragToOpen')}
                  </span>
                </span>
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
