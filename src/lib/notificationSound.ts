const NOTIFICATION_SOUND_SRC = '/sounds/notification.wav';
const NOTIFICATION_VOLUME = 0.7;

// Minimum interval between two plays to prevent spamming when multiple
// notifications arrive in the same poll cycle.
const MIN_PLAY_INTERVAL_MS = 400;

let lastPlayedAt = 0;
let sharedAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(NOTIFICATION_SOUND_SRC);
    sharedAudio.volume = NOTIFICATION_VOLUME;
    sharedAudio.preload = 'auto';
  }
  return sharedAudio;
}

export function playNotificationSound(): void {
  const now = Date.now();
  if (now - lastPlayedAt < MIN_PLAY_INTERVAL_MS) return;
  lastPlayedAt = now;

  const audio = getAudio();
  if (!audio) return;

  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers throw when setting currentTime before media is ready.
  }
  void audio.play().catch(() => {
    // Autoplay may be blocked before the user has interacted with the page.
    // We deliberately swallow this — the sound will simply not play until the
    // user has interacted with the tab.
  });
}
