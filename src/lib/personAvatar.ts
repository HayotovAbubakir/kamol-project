function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Ism + familiya bosh harflari (masalan: "ziyo safarov" → "ZS"). */
export function getPersonInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0];
    if (word.length >= 2) return `${word[0]}${word[1]}`.toUpperCase();
    return word[0]?.toUpperCase() ?? '?';
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export interface AvatarPalette {
  background: string;
  foreground: string;
  ring: string;
  shadow: string;
}

/** Har bir ism uchun barqaror, o'ziga xos rang palitrasi. */
export function getAvatarPalette(seed: string): AvatarPalette {
  const hue = hashString(seed.trim().toLowerCase()) % 360;
  const hueAlt = (hue + 26) % 360;
  return {
    background: `linear-gradient(145deg, hsl(${hue} 46% 44%) 0%, hsl(${hueAlt} 50% 34%) 100%)`,
    foreground: '#ffffff',
    ring: `hsl(${hue} 52% 62% / 0.55)`,
    shadow: `hsla(${hue}, 42%, 18%, 0.38)`,
  };
}
