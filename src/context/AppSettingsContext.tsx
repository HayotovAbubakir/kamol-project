'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { translate, type Locale, type Theme } from '@/lib/i18n/translations';

const LOCALE_KEY = 'kamol_lang';
const THEME_KEY = 'kamol_theme';

interface AppSettingsContextValue {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const defaultValue: AppSettingsContextValue = {
  locale: 'uz',
  theme: 'light',
  setLocale: () => {},
  setTheme: () => {},
  toggleTheme: () => {},
  t: (key) => translate('uz', key),
};

const AppSettingsContext = createContext<AppSettingsContextValue>(defaultValue);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('uz');
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY) as Locale | null;
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedLocale === 'uz' || savedLocale === 'ru' || savedLocale === 'en') {
      setLocaleState(savedLocale);
      applyLocale(savedLocale);
    }
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
    applyLocale(next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo(
    () => ({ locale, theme, setLocale, setTheme, toggleTheme, t }),
    [locale, theme, setLocale, setTheme, toggleTheme, t],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
