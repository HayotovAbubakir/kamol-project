'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CURSOR_TRAIL_AUTO,
  CURSOR_TRAIL_COLOR_KEY,
  CURSOR_TRAIL_ENABLED_KEY,
  CURSOR_TRAIL_STYLE_KEY,
  migrateCursorTrailStyleDefaultIfNeeded,
  normalizeCursorTrailColor,
  normalizeCursorTrailStyle,
  readCursorTrailColor,
  readCursorTrailEnabled,
  readCursorTrailStyle,
  type CursorTrailStyle,
} from '@/lib/cursorTrail';
import {
  addCustomBackgroundFromFile,
  hydrateCustomBackgrounds,
  readCustomBackgrounds,
  removeCustomBackground as removeStoredCustomBackground,
  revokeCustomBackgroundUrls,
  toCustomBackgroundId,
  type CustomBackground,
} from '@/lib/customBackgrounds';
import {
  BACKGROUND_KEY,
  getDefaultLiveBackgroundForTheme,
  isBackgroundCompatibleWithTheme,
  isLiveBackground,
  normalizeBackgroundId,
  type BackgroundId,
} from '@/lib/background';
import { translate, type Locale, type Theme } from '@/lib/i18n/translations';

const LOCALE_KEY = 'kamol_lang';
const THEME_KEY = 'kamol_theme';

interface AppSettingsContextValue {
  locale: Locale;
  theme: Theme;
  cursorTrailEnabled: boolean;
  cursorTrailColor: string;
  cursorTrailStyle: CursorTrailStyle;
  backgroundId: BackgroundId;
  customBackgrounds: CustomBackground[];
  settingsReady: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setCursorTrailEnabled: (enabled: boolean) => void;
  setCursorTrailColor: (color: string) => void;
  setCursorTrailStyle: (style: CursorTrailStyle) => void;
  setBackgroundId: (id: BackgroundId) => void;
  addCustomBackground: (file: File) => Promise<void>;
  removeCustomBackground: (storageId: string) => void;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const defaultValue: AppSettingsContextValue = {
  locale: 'uz',
  theme: 'light',
  cursorTrailEnabled: true,
  cursorTrailColor: CURSOR_TRAIL_AUTO,
  cursorTrailStyle: 'line',
  backgroundId: 'blueprint',
  customBackgrounds: [],
  settingsReady: false,
  setLocale: () => {},
  setTheme: () => {},
  setCursorTrailEnabled: () => {},
  setCursorTrailColor: () => {},
  setCursorTrailStyle: () => {},
  setBackgroundId: () => {},
  addCustomBackground: async () => {},
  removeCustomBackground: () => {},
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

function applyLiveBgFlag(backgroundId: BackgroundId) {
  if (isLiveBackground(backgroundId)) {
    document.documentElement.dataset.liveBg = '1';
  } else {
    delete document.documentElement.dataset.liveBg;
  }
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('uz');
  const [theme, setThemeState] = useState<Theme>('light');
  const [cursorTrailEnabled, setCursorTrailEnabledState] = useState(true);
  const [cursorTrailColor, setCursorTrailColorState] = useState(CURSOR_TRAIL_AUTO);
  const [cursorTrailStyle, setCursorTrailStyleState] = useState<CursorTrailStyle>('line');
  const [backgroundId, setBackgroundIdState] = useState<BackgroundId>('blueprint');
  const [customBackgrounds, setCustomBackgroundsState] = useState<CustomBackground[]>([]);
  const [settingsReady, setSettingsReady] = useState(false);
  const customBackgroundsRef = useRef<CustomBackground[]>([]);
  customBackgroundsRef.current = customBackgrounds;

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY) as Locale | null;
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const custom = readCustomBackgrounds();
    setCustomBackgroundsState(custom);
    setSettingsReady(custom.every((item) => item.mediaType !== 'video'));
    void hydrateCustomBackgrounds(custom)
      .then((hydrated) => {
        setCustomBackgroundsState(hydrated);
        setSettingsReady(true);
      })
      .catch(() => {
        setSettingsReady(true);
      });
    if (savedLocale === 'uz' || savedLocale === 'ru' || savedLocale === 'en') {
      setLocaleState(savedLocale);
      applyLocale(savedLocale);
    }
    const resolvedTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light';
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    }
    migrateCursorTrailStyleDefaultIfNeeded();
    setCursorTrailEnabledState(readCursorTrailEnabled());
    setCursorTrailColorState(readCursorTrailColor());
    setCursorTrailStyleState(readCursorTrailStyle());
    const savedBackground = normalizeBackgroundId(
      localStorage.getItem(BACKGROUND_KEY),
      custom.map((item) => item.id),
    );
    const resolvedBackground = isBackgroundCompatibleWithTheme(savedBackground, resolvedTheme)
      ? savedBackground
      : getDefaultLiveBackgroundForTheme(resolvedTheme);
    if (resolvedBackground !== savedBackground) {
      localStorage.setItem(BACKGROUND_KEY, resolvedBackground);
    }
    setBackgroundIdState(resolvedBackground);
    applyLiveBgFlag(resolvedBackground);
  }, []);

  useEffect(() => {
    applyLiveBgFlag(backgroundId);
  }, [backgroundId]);

  useEffect(() => {
    return () => {
      revokeCustomBackgroundUrls(customBackgroundsRef.current);
    };
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
    setBackgroundIdState((current) => {
      if (isBackgroundCompatibleWithTheme(current, next)) return current;
      const fallback = getDefaultLiveBackgroundForTheme(next);
      localStorage.setItem(BACKGROUND_KEY, fallback);
      applyLiveBgFlag(fallback);
      return fallback;
    });
  }, []);

  const setCursorTrailEnabled = useCallback((enabled: boolean) => {
    setCursorTrailEnabledState(enabled);
    localStorage.setItem(CURSOR_TRAIL_ENABLED_KEY, enabled ? 'true' : 'false');
  }, []);

  const setCursorTrailColor = useCallback((color: string) => {
    const next = normalizeCursorTrailColor(color);
    setCursorTrailColorState(next);
    localStorage.setItem(CURSOR_TRAIL_COLOR_KEY, next);
  }, []);

  const setCursorTrailStyle = useCallback((style: CursorTrailStyle) => {
    const next = normalizeCursorTrailStyle(style);
    setCursorTrailStyleState(next);
    localStorage.setItem(CURSOR_TRAIL_STYLE_KEY, next);
  }, []);

  const setBackgroundId = useCallback(
    (id: BackgroundId) => {
      const customIds = readCustomBackgrounds().map((item) => item.id);
      const next = normalizeBackgroundId(id, customIds);
      setBackgroundIdState(next);
      localStorage.setItem(BACKGROUND_KEY, next);
    },
    [],
  );

  const addCustomBackground = useCallback(
    async (file: File) => {
      const entry = await addCustomBackgroundFromFile(file);
      const nextCustom = await hydrateCustomBackgrounds(readCustomBackgrounds());
      setCustomBackgroundsState(nextCustom);
      const nextId = toCustomBackgroundId(entry.id) as BackgroundId;
      setBackgroundIdState(nextId);
      localStorage.setItem(BACKGROUND_KEY, nextId);
    },
    [],
  );

  const removeCustomBackground = useCallback(
    (storageId: string) => {
      setCustomBackgroundsState((current) => {
        revokeCustomBackgroundUrls(current.filter((item) => item.id === storageId));
        return current;
      });
      removeStoredCustomBackground(storageId);
      const nextCustom = readCustomBackgrounds();
      void hydrateCustomBackgrounds(nextCustom).then(setCustomBackgroundsState);
      setBackgroundIdState((current) => {
        const customKey = toCustomBackgroundId(storageId);
        if (current !== customKey) return current;
        const fallback = normalizeBackgroundId('blueprint', nextCustom.map((item) => item.id));
        localStorage.setItem(BACKGROUND_KEY, fallback);
        return fallback;
      });
    },
    [],
  );

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
    () => ({
      locale,
      theme,
      cursorTrailEnabled,
      cursorTrailColor,
      cursorTrailStyle,
      backgroundId,
      customBackgrounds,
      settingsReady,
      setLocale,
      setTheme,
      setCursorTrailEnabled,
      setCursorTrailColor,
      setCursorTrailStyle,
      setBackgroundId,
      addCustomBackground,
      removeCustomBackground,
      toggleTheme,
      t,
    }),
    [
      locale,
      theme,
      cursorTrailEnabled,
      cursorTrailColor,
      cursorTrailStyle,
      backgroundId,
      customBackgrounds,
      settingsReady,
      setLocale,
      setTheme,
      setCursorTrailEnabled,
      setCursorTrailColor,
      setCursorTrailStyle,
      setBackgroundId,
      addCustomBackground,
      removeCustomBackground,
      toggleTheme,
      t,
    ],
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
