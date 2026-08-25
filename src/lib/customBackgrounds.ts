export const CUSTOM_BACKGROUNDS_KEY = 'kamol_custom_backgrounds';
export const MAX_CUSTOM_BACKGROUNDS = 6;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const VIDEO_DB_NAME = 'kamol_custom_video';
const VIDEO_STORE = 'videos';

export type CustomBackgroundMediaType = 'image' | 'video';

export interface CustomBackground {
  id: string;
  name: string;
  mediaType: CustomBackgroundMediaType;
  dataUrl?: string;
  /** Runtime object URL for uploaded videos (not persisted). */
  previewUrl?: string;
  createdAt: number;
}

export function isCustomBackgroundId(id: string): boolean {
  return id.startsWith('custom:');
}

export function customBackgroundStorageId(id: string): string {
  return id.replace(/^custom:/, '');
}

export function toCustomBackgroundId(storageId: string): string {
  return `custom:${storageId}`;
}

function normalizeStoredBackground(item: unknown): CustomBackground | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Partial<CustomBackground>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null;
  if (typeof record.createdAt !== 'number') return null;

  const mediaType: CustomBackgroundMediaType =
    record.mediaType === 'video' ? 'video' : 'image';

  if (mediaType === 'video') {
    return {
      id: record.id,
      name: record.name,
      mediaType: 'video',
      createdAt: record.createdAt,
    };
  }

  if (typeof record.dataUrl !== 'string' || !record.dataUrl.startsWith('data:image/')) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    mediaType: 'image',
    dataUrl: record.dataUrl,
    createdAt: record.createdAt,
  };
}

export function readCustomBackgrounds(): CustomBackground[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_BACKGROUNDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeStoredBackground)
      .filter((item): item is CustomBackground => item !== null);
  } catch {
    return [];
  }
}

export function writeCustomBackgrounds(backgrounds: CustomBackground[]): void {
  const persisted = backgrounds.map(({ id, name, mediaType, dataUrl, createdAt }) =>
    mediaType === 'video'
      ? { id, name, mediaType, createdAt }
      : { id, name, mediaType: 'image' as const, dataUrl, createdAt },
  );
  localStorage.setItem(CUSTOM_BACKGROUNDS_KEY, JSON.stringify(persisted));
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VIDEO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Video bazasi ochilmadi'));
  });
}

async function saveCustomVideo(id: string, blob: Blob): Promise<void> {
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('Video saqlanmadi'));
    tx.objectStore(VIDEO_STORE).put(blob, id);
  });
}

async function readCustomVideoBlob(id: string): Promise<Blob | null> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const request = tx.objectStore(VIDEO_STORE).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result instanceof Blob ? request.result : null);
    };
    request.onerror = () => reject(request.error ?? new Error('Video o\'qilmadi'));
  });
}

async function deleteCustomVideo(id: string): Promise<void> {
  const db = await openVideoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('Video o\'chirilmadi'));
    tx.objectStore(VIDEO_STORE).delete(id);
  });
}

export async function getCustomVideoObjectUrl(id: string): Promise<string | null> {
  const blob = await readCustomVideoBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function hydrateCustomBackgrounds(
  backgrounds: CustomBackground[] = readCustomBackgrounds(),
): Promise<CustomBackground[]> {
  return Promise.all(
    backgrounds.map(async (item) => {
      if (item.mediaType !== 'video') return item;
      const previewUrl = await getCustomVideoObjectUrl(item.id);
      return previewUrl ? { ...item, previewUrl } : item;
    }),
  );
}

export function revokeCustomBackgroundUrls(backgrounds: CustomBackground[]): void {
  for (const item of backgrounds) {
    if (item.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
}

export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_MEDIA_TYPE');
  }

  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('IMAGE_PROCESS_FAILED');

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_OPEN_FAILED'));
    img.src = src;
  });
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export async function addCustomBackgroundFromFile(file: File): Promise<CustomBackground> {
  const existing = readCustomBackgrounds();
  if (existing.length >= MAX_CUSTOM_BACKGROUNDS) {
    throw new Error(`MAX_CUSTOM_BACKGROUNDS:${MAX_CUSTOM_BACKGROUNDS}`);
  }

  const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Shaxsiy fon';

  if (isVideoFile(file)) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('VIDEO_TOO_LARGE');
    }
    const entry: CustomBackground = {
      id: crypto.randomUUID(),
      name: baseName,
      mediaType: 'video',
      createdAt: Date.now(),
    };
    await saveCustomVideo(entry.id, file);
    writeCustomBackgrounds([entry, ...existing]);
    const previewUrl = await getCustomVideoObjectUrl(entry.id);
    return previewUrl ? { ...entry, previewUrl } : entry;
  }

  if (isImageFile(file)) {
    const dataUrl = await compressImageFile(file);
    const entry: CustomBackground = {
      id: crypto.randomUUID(),
      name: baseName,
      mediaType: 'image',
      dataUrl,
      createdAt: Date.now(),
    };
    writeCustomBackgrounds([entry, ...existing]);
    return entry;
  }

  throw new Error('INVALID_MEDIA_TYPE');
}

export function removeCustomBackground(id: string): void {
  const target = readCustomBackgrounds().find((item) => item.id === id);
  if (target?.mediaType === 'video') {
    void deleteCustomVideo(id);
  }
  const next = readCustomBackgrounds().filter((item) => item.id !== id);
  writeCustomBackgrounds(next);
}

export function resolveCustomBackgroundError(error: unknown, t: (key: string) => string): string {
  if (!(error instanceof Error)) return t('settings.backgroundUploadError');
  switch (error.message) {
    case 'INVALID_MEDIA_TYPE':
      return t('settings.backgroundUploadInvalidType');
    case 'VIDEO_TOO_LARGE':
      return t('settings.backgroundUploadVideoTooLarge');
    case 'IMAGE_OPEN_FAILED':
    case 'IMAGE_PROCESS_FAILED':
      return t('settings.backgroundUploadError');
    default:
      if (error.message.startsWith('MAX_CUSTOM_BACKGROUNDS:')) {
        return t('settings.backgroundUploadLimit');
      }
      return error.message || t('settings.backgroundUploadError');
  }
}
