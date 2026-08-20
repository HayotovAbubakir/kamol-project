'use client';

import { useAppSettings } from '@/context/AppSettingsContext';
import { uiChoiceCardClass, uiChoiceCardSelectedClass } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Locale, Theme } from '@/lib/i18n/translations';

export function AppearancePanel() {
  const { locale, theme, setLocale, setTheme, t } = useAppSettings();

  return (
    <section className="rounded-2xl border border-app-border bg-app-card p-6 shadow-sm dark:ring-1 dark:ring-metallic-green/15">
      <h2 className="font-display text-lg font-semibold text-app-text">{t('settings.appearance')}</h2>
      <p className="mb-6 mt-1 text-sm text-app-muted">{t('settings.appearanceHint')}</p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
        {t('settings.language')}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {([
          { id: 'uz' as Locale, label: t('settings.uzbek') },
          { id: 'ru' as Locale, label: t('settings.russian') },
          { id: 'en' as Locale, label: t('settings.english') },
        ]).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            className={cn(uiChoiceCardClass, locale === opt.id && uiChoiceCardSelectedClass)}
          >
            <span className="block text-xs font-bold uppercase tracking-widest opacity-70">{opt.id}</span>
            <span className="mt-1 block text-sm font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-app-muted">
        {t('settings.theme')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {([
          { id: 'light' as Theme, label: t('settings.light') },
          { id: 'dark' as Theme, label: t('settings.dark') },
        ]).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={cn(uiChoiceCardClass, theme === opt.id && uiChoiceCardSelectedClass)}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
