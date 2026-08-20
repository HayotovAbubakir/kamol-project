export const RETURNED_SOUND_SESSION_PREFIX = 'kamol_returned_sound_played';

const SOUND_SRC = '/sounds/returned-alert.mp3';
const PLAY_COUNT = 3;
const VOLUME = 1;

function playOnce(src: string, volume: number): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.preload = 'auto';

    const finish = () => resolve();
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    void audio.play().catch(finish);
  });
}

export async function playReturnedAlertSound(): Promise<void> {
  for (let i = 0; i < PLAY_COUNT; i += 1) {
    await playOnce(SOUND_SRC, VOLUME);
  }
}

export function clearReturnedAlertSoundFlags(): void {
  if (typeof window === 'undefined') return;
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(RETURNED_SOUND_SESSION_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function returnedSoundSessionKey(userId: string): string {
  return `${RETURNED_SOUND_SESSION_PREFIX}_${userId}`;
}
