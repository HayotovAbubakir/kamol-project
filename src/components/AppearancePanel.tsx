'use client';

import { useRef, useState } from 'react';
import {
  BACKGROUND_OPTIONS,
  PREMIUM_LIVE_BACKGROUNDS,
  PREMIUM_LIVE_LIGHT_BACKGROUNDS,
  type BackgroundId,
} from '@/lib/background';
import { MAX_CUSTOM_BACKGROUNDS, resolveCustomBackgroundError, toCustomBackgroundId } from '@/lib/customBackgrounds';
import { CURSOR_TRAIL_AUTO, CURSOR_TRAIL_PRESETS, CURSOR_TRAIL_RGB, CURSOR_TRAIL_STYLES, isPresetCursorTrailColor } from '@/lib/cursorTrail';
import { useAppSettings } from '@/context/AppSettingsContext';
import { uiChoiceCardClass, uiChoiceCardSelectedClass } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Locale, Theme } from '@/lib/i18n/translations';

export function AppearancePanel() {
  const {
    locale,
    theme,
    backgroundId,
    customBackgrounds,
    cursorTrailEnabled,
    cursorTrailColor,
    cursorTrailStyle,
    setLocale,
    setTheme,
    setBackgroundId,
    addCustomBackground,
    removeCustomBackground,
    setCursorTrailEnabled,
    setCursorTrailColor,
    setCursorTrailStyle,
    t,
  } = useAppSettings();

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const customColor =
    cursorTrailColor !== CURSOR_TRAIL_AUTO &&
    !isPresetCursorTrailColor(cursorTrailColor)
      ? cursorTrailColor
      : '#5CB88A';

  const staticBackgrounds = BACKGROUND_OPTIONS.filter((option) => option.group === 'static');
  const liveBackgrounds =
    theme === 'light' ? PREMIUM_LIVE_LIGHT_BACKGROUNDS : PREMIUM_LIVE_BACKGROUNDS;
  const canUploadMore = customBackgrounds.length < MAX_CUSTOM_BACKGROUNDS;

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      await addCustomBackground(file);
    } catch (error) {
      setUploadError(resolveCustomBackgroundError(error, t));
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-app-border bg-app-card p-4 shadow-sm dark:ring-1 dark:ring-metallic-green/15 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-app-text">{t('settings.appearance')}</h2>
      <p className="mb-6 mt-1 text-sm text-app-muted">{t('settings.appearanceHint')}</p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
        {t('settings.language')}
      </p>
      <div className="grid grid-cols-3 gap-2 xs:gap-3">
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
            <span className="mt-1 block text-xs font-semibold leading-tight xs:text-sm">{opt.label}</span>
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

      <div className="mt-6 space-y-4 border-t border-app-border pt-6">
        <div>
          <p className="text-sm font-semibold text-app-text">{t('settings.background')}</p>
          <p className="mt-1 text-sm text-app-muted">{t('settings.backgroundHint')}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('settings.backgroundStatic')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {staticBackgrounds.map((option) => (
              <BackgroundCard
                key={option.id}
                label={t(option.labelKey)}
                preview={option.preview}
                selected={backgroundId === option.id}
                onSelect={() => setBackgroundId(option.id as BackgroundId)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t(theme === 'light' ? 'settings.backgroundLiveLight' : 'settings.backgroundLive')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {liveBackgrounds.map((option) => (
              <BackgroundCard
                key={option.id}
                label={t(option.labelKey)}
                preview={option.preview}
                selected={backgroundId === option.id}
                live
                premium
                onSelect={() => setBackgroundId(option.id as BackgroundId)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('settings.backgroundCustom')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {customBackgrounds.map((item) => {
              const id = toCustomBackgroundId(item.id) as BackgroundId;
              const previewSrc = item.previewUrl ?? item.dataUrl;
              return (
                <BackgroundCard
                  key={item.id}
                  label={item.name}
                  preview={
                    previewSrc && item.mediaType === 'image'
                      ? `url("${previewSrc}") center / cover no-repeat`
                      : 'linear-gradient(135deg, #dfe8e1 0%, #eef4ef 100%)'
                  }
                  videoSrc={item.mediaType === 'video' ? previewSrc : undefined}
                  selected={backgroundId === id}
                  live
                  onSelect={() => setBackgroundId(id)}
                  onDelete={() => removeCustomBackground(item.id)}
                  deleteLabel={t('settings.backgroundDelete')}
                />
              );
            })}
            {canUploadMore && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => uploadInputRef.current?.click()}
                className={cn(
                  'relative flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-app-border p-2 text-app-muted transition hover:border-app-accent hover:text-app-accent active:scale-[0.98] disabled:opacity-60',
                )}
              >
                <span className="text-2xl font-light leading-none">+</span>
                <span className="mt-2 px-1 text-center text-sm font-semibold">
                  {uploading ? t('settings.backgroundUploading') : t('settings.backgroundUpload')}
                </span>
              </button>
            )}
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
          />
          {uploadError && (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {uploadError}
            </p>
          )}
          {!canUploadMore && (
            <p className="mt-2 text-xs text-app-muted">{t('settings.backgroundUploadLimit')}</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-app-border pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-app-text">{t('settings.cursorTrail')}</p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-app-muted">
              {t('settings.cursorTrailHint')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cursorTrailEnabled}
            aria-label={t('settings.cursorTrail')}
            onClick={() => setCursorTrailEnabled(!cursorTrailEnabled)}
            className={cn(
              'flex h-8 w-14 shrink-0 items-center overflow-hidden rounded-full p-1 transition-colors duration-200 self-start sm:self-center',
              cursorTrailEnabled ? 'bg-app-accent' : 'bg-app-border',
            )}
          >
            <span
              className={cn(
                'h-6 w-6 shrink-0 rounded-full bg-white shadow transition-transform duration-200',
                cursorTrailEnabled ? 'translate-x-6' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        {cursorTrailEnabled && (
          <div className="rounded-xl border border-app-border bg-app-bg/40 p-4 space-y-4">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-muted">
                {t('settings.cursorTrailStyle')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CURSOR_TRAIL_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCursorTrailStyle(style)}
                    className={cn(
                      uiChoiceCardClass,
                      'px-3 py-2 text-center',
                      cursorTrailStyle === style && uiChoiceCardSelectedClass,
                    )}
                  >
                    <span className="block text-sm font-semibold">
                      {t(`settings.cursorTrailStyle${style.charAt(0).toUpperCase()}${style.slice(1)}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-muted">
                {t('settings.cursorTrailColor')}
              </p>
            <div className="grid grid-cols-4 gap-3 min-[420px]:grid-cols-8">
              {CURSOR_TRAIL_PRESETS.map((preset) => {
                const selected = cursorTrailColor === preset.id;
                const isAuto = preset.id === CURSOR_TRAIL_AUTO;
                const isRgb = preset.id === CURSOR_TRAIL_RGB;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={
                      isAuto
                        ? t('settings.cursorTrailAuto')
                        : isRgb
                          ? t('settings.cursorTrailRgb')
                          : preset.id
                    }
                    aria-label={
                      isAuto
                        ? t('settings.cursorTrailAuto')
                        : isRgb
                          ? t('settings.cursorTrailRgb')
                          : preset.id
                    }
                    onClick={() => setCursorTrailColor(preset.id)}
                    className={cn(
                      'mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform active:scale-95',
                      selected ? 'border-app-accent ring-2 ring-app-accent/25' : 'border-app-border',
                    )}
                    style={{
                      background:
                        typeof preset.swatch === 'string' && preset.swatch.startsWith('linear-gradient')
                          ? preset.swatch
                          : preset.swatch,
                    }}
                  >
                    {isAuto && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white drop-shadow">
                        A
                      </span>
                    )}
                    {isRgb && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-white drop-shadow">
                        RGB
                      </span>
                    )}
                  </button>
                );
              })}
              <label
                className={cn(
                  'relative mx-auto flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2',
                  !isPresetCursorTrailColor(cursorTrailColor)
                    ? 'border-app-accent ring-2 ring-app-accent/25'
                    : 'border-dashed border-app-border',
                )}
              >
                <span className="sr-only">{t('settings.cursorTrailCustom')}</span>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCursorTrailColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span
                  className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                  style={{ background: customColor }}
                >
                  +
                </span>
              </label>
            </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BackgroundCard({
  label,
  preview,
  videoSrc,
  selected,
  live = false,
  premium = false,
  onSelect,
  onDelete,
  deleteLabel,
}: {
  label: string;
  preview: string;
  videoSrc?: string;
  selected: boolean;
  live?: boolean;
  premium?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  const isImagePreview = preview.startsWith('url(');

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-2 p-2 transition',
        selected ? 'border-app-accent ring-2 ring-app-accent/25' : 'border-app-border',
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left active:scale-[0.98]">
        {videoSrc ? (
          <video
            src={videoSrc}
            muted
            loop
            autoPlay
            playsInline
            className="mb-2 h-14 w-full rounded-lg border border-black/5 object-cover dark:border-white/10"
          />
        ) : (
          <div
            className="mb-2 h-14 w-full rounded-lg border border-black/5 dark:border-white/10"
            style={isImagePreview ? { background: preview } : { background: preview }}
          />
        )}
        <span className="block truncate px-1 text-sm font-semibold text-app-text">{label}</span>
      </button>
      {live && (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-app-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-app-accent">
          Live
        </span>
      )}
      {premium && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
          Pro
        </span>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label={deleteLabel}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white transition hover:bg-red-600"
        >
          ×
        </button>
      )}
    </div>
  );
}
