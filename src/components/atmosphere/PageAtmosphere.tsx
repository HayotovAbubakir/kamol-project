'use client';

import { BlueprintGrid } from '@/components/atmosphere/BlueprintGrid';
import { CustomMediaBackground } from '@/components/atmosphere/CustomMediaBackground';
import { PremiumLiveBackground } from '@/components/atmosphere/PremiumLiveBackground';
import { useAppSettings } from '@/context/AppSettingsContext';
import {
  customBackgroundStorageId,
  isCustomBackgroundId,
} from '@/lib/customBackgrounds';
import {
  getDefaultLiveBackgroundForTheme,
  isLiveBackground,
  isPremiumLiveBackground,
  isPremiumLiveLightBackground,
} from '@/lib/background';
import { usePrefersReducedMotion } from '@/hooks/useMotion';
import { cn } from '@/lib/utils';

export function PageAtmosphere() {
  const { backgroundId, cursorTrailEnabled, customBackgrounds, theme, settingsReady } =
    useAppSettings();
  const reduced = usePrefersReducedMotion();

  if (reduced) return null;

  const usesBlueprint = backgroundId === 'blueprint';
  const trailOverlay = cursorTrailEnabled && !usesBlueprint;
  const needsThemeScrim = isLiveBackground(backgroundId);

  let customBackground: (typeof customBackgrounds)[number] | undefined;
  if (isCustomBackgroundId(backgroundId)) {
    const storageId = customBackgroundStorageId(backgroundId);
    customBackground = customBackgrounds.find((item) => item.id === storageId);
  }

  const customMediaReady = Boolean(customBackground?.previewUrl || customBackground?.dataUrl);
  const customPending = isCustomBackgroundId(backgroundId) && settingsReady && !customMediaReady;
  const customLoading = isCustomBackgroundId(backgroundId) && !settingsReady;

  const fallbackLive = getDefaultLiveBackgroundForTheme(theme);

  return (
    <>
      {(customLoading || customPending) && (
        <PremiumLiveBackground variant={fallbackLive} />
      )}
      {isPremiumLiveBackground(backgroundId) && (
        <PremiumLiveBackground variant={backgroundId} />
      )}
      {customBackground && customMediaReady && (
        <CustomMediaBackground
          mediaType={customBackground.mediaType}
          src={customBackground.previewUrl ?? customBackground.dataUrl!}
        />
      )}
      {usesBlueprint && <BlueprintGrid mode="full" />}
      {trailOverlay && <BlueprintGrid mode="trail" />}
      {needsThemeScrim && (
        <div
          className={cn(
            'pointer-events-none fixed inset-0 z-[1] atmosphere-theme-scrim',
            isCustomBackgroundId(backgroundId)
              ? 'bg-black/20'
              : isPremiumLiveLightBackground(backgroundId)
                ? 'bg-[rgb(var(--app-bg))]/12'
                : theme === 'light'
                  ? 'bg-[rgb(var(--app-bg))]/86'
                  : 'bg-black/12',
          )}
          aria-hidden
        />
      )}
    </>
  );
}
