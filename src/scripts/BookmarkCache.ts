// src/scripts/BookmarkCache.ts
const NS = 'mindful:v1';
const k = (userId?: string | null, storageType?: string) =>
  `${NS}:bookmarkGroups:${userId || 'anon'}:${storageType || 'local'}`;

export type BookmarkSnapshot = { data: any; at: number; etag?: string };

export function readBookmarkCacheSync(userId?: string | null, storageType?: string): BookmarkSnapshot | null {
  try {
    const raw = localStorage.getItem(k(userId, storageType));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeBookmarkCacheSync(userId?: string | null, storageType?: string, data: any, etag?: string) {
  try {
    localStorage.setItem(k(userId, storageType), JSON.stringify({ data, etag, at: Date.now() }));
  } catch {}
}

export async function readBookmarkCacheSession(userId?: string | null, storageType?: string): Promise<BookmarkSnapshot | null> {
  try {
    const key = k(userId, storageType);
    const { [key]: payload } = await chrome?.storage?.session?.get?.(key) ?? {};
    return payload || null;
  } catch { return null; }
}

export async function writeBookmarkCacheSession(userId?: string | null, storageType?: string, data: any, etag?: string) {
  try {
    const key = k(userId, storageType);
    await chrome?.storage?.session?.set?.({ [key]: { data, etag, at: Date.now() } });
  } catch {}
}
