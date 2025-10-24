import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  fetchAuthSession,
  fetchUserAttributes,
  updateUserAttribute,
} from 'aws-amplify/auth';

/* Scripts */
import { StorageType, DEFAULT_STORAGE_TYPE } from '@/scripts/Constants.js';
import { loadInitialBookmarks } from '@/hooks/useBookmarkManager.js';

/* Caching: synchronous snapshot for first-paint + session cache for reopens */
import {
  readBookmarkCacheSync,           // localStorage (sync)
  writeBookmarkCacheSync,          // localStorage (sync)
  readBookmarkCacheSession,        // chrome.storage.session (async)
  writeBookmarkCacheSession,       // chrome.storage.session (async)
} from '@/scripts/BookmarkCache';

export const AppContext = createContext();

export function AppContextProvider({ user, children }) {
  // ----- state -----
  const [userAttributes, setUserAttributes] = useState(null);

  // Seed immediately from a synchronous snapshot (pre-user, pre-mode) to avoid flicker.
  // We’ll refine once we know userId/storageType.
  const seed = readBookmarkCacheSync(undefined, undefined) || { data: [] };
  const [bookmarkGroups, setBookmarkGroups] = useState(seed.data || []);
  const [groupsIndex, setGroupsIndex] = useState([]); // [{ id, groupName }]
  const [hasHydrated, setHasHydrated] = useState(!!(seed.data?.length));

  const [userId, setUserId] = useState(null);
  const [storageType, setStorageType] = useState(null);

  const [isLoading, setIsLoading] = useState(true);   // only for the very first paint
  const [isMigrating, setIsMigrating] = useState(false);

  const deepEqual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };

  // ----- helpers: tiny / fast index -----
  async function readGroupsIndexFast() {
    // 1) try memory cache (persists while SW alive)
    try {
      const { groupsIndex } = await chrome?.storage?.session?.get?.(['groupsIndex']) ?? {};
      if (Array.isArray(groupsIndex) && groupsIndex.length) return groupsIndex;
    } catch {}

    // 2) try a small persistent key
    try {
      const { groupsIndex: persisted } = await chrome?.storage?.local?.get?.(['groupsIndex']) ?? {};
      if (Array.isArray(persisted)) {
        try { await chrome?.storage?.session?.set?.({ groupsIndex: persisted }); } catch {}
        return persisted;
      }
    } catch {}

    // 3) last-ditch: derive a tiny index from the full blob if it exists
    try {
      const { bookmarkGroups: full } = await chrome?.storage?.local?.get?.(['bookmarkGroups']) ?? {};
      if (Array.isArray(full) && full.length) {
        const idx = full.map(g => ({ id: g.id, groupName: g.groupName }));
        try { await chrome?.storage?.session?.set?.({ groupsIndex: idx }); } catch {}
        return idx;
      }
    } catch {}

    return [];
  }

  // ----- phase 0: decide mode quickly (no blocking on Amplify for LOCAL) -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // If opened while signed out, default to LOCAL immediately
      if (!user) {
        if (!cancelled) {
          setUserId(null);
          setStorageType(StorageType.LOCAL);
        }
        return;
      }

      // Signed-in: we *may* use REMOTE, but keep this fast.
      try {
        const { identityId } = await fetchAuthSession();
        if (!cancelled) setUserId(identityId || null);

        const attributes = await fetchUserAttributes();
        if (!cancelled) setUserAttributes(attributes);

        const storedType = attributes?.['custom:storage_type'];
        const effectiveType = storedType || DEFAULT_STORAGE_TYPE;
        if (!cancelled) setStorageType(effectiveType);

        // If the custom attribute wasn’t set, set it asynchronously (don’t block UI)
        if (!storedType) {
          updateUserAttribute({
            userAttribute: { attributeKey: 'custom:storage_type', value: StorageType.LOCAL },
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Auth bootstrap failed, falling back to LOCAL:', err);
        if (!cancelled) {
          setUserId(null);
          setStorageType(StorageType.LOCAL);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ----- phase 1a: refine first paint from *sync* cache when user/mode become known -----
  useEffect(() => {
    // As soon as we know the real key (userId + storageType), try a *synchronous* read.
    if (!storageType) return;
    const cached = readBookmarkCacheSync(userId, storageType);
    if (cached?.data && !deepEqual(bookmarkGroups, cached.data)) {
      setBookmarkGroups(cached.data);
      setHasHydrated(true); // we’ve shown meaningful content
    }
  }, [userId, storageType]); // sync, no flicker

  // ----- phase 1b: render ASAP with groups index (async but cheap) -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);

      // Optionally: read session cache (async) — won’t affect first paint, but helps warm state.
      try {
        const cached = await readBookmarkCacheSession(userId, storageType);
        if (!cancelled && cached?.data?.length) {
          setBookmarkGroups(prev => (deepEqual(prev, cached.data) ? prev : cached.data));
          setHasHydrated(true);
        }
      } catch {}

      const idx = await readGroupsIndexFast();
      if (!cancelled) {
        setGroupsIndex(idx);
        setIsLoading(false); // UI can render now
      }
    })();

    return () => { cancelled = true; };
  }, [userId, storageType]);

  // ----- phase 2: hydrate full groups in background once mode is known -----
  useEffect(() => {
    if (isMigrating) return;
    if (!userId || !storageType) return; // require userId in both modes to match tests/contract

    let cancelled = false;

    (async () => {
      try {
        // Don’t block paint; schedule on idle/tick
        const kickoff = () =>
          loadInitialBookmarks(userId, storageType)
            .then(full => {
              if (cancelled) return;
              setBookmarkGroups(prev => (deepEqual(prev, full) ? prev : full));

              // Persist/refresh the tiny index for quick future loads
              const idx = (full || []).map(g => ({ id: g.id, groupName: g.groupName }));
              try { chrome?.storage?.local?.set?.({ groupsIndex: idx }); } catch {}
              try { chrome?.storage?.session?.set?.({ groupsIndex: idx }); } catch {}

              // Warm both caches for instant next paint
              writeBookmarkCacheSync(userId, storageType, full);
              writeBookmarkCacheSession(userId, storageType, full).catch(() => {});
            })
            .finally(() => { if (!cancelled) setHasHydrated(true); });

        if ('requestIdleCallback' in window) {
          const id = requestIdleCallback(() => kickoff());
          return () => cancelIdleCallback(id);
        } else {
          const t = setTimeout(() => kickoff(), 0);
          return () => clearTimeout(t);
        }
      } catch (e) {
        console.error('Error hydrating bookmarks:', e);
        if (!cancelled) setBookmarkGroups([]);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, storageType, isMigrating]);

  // ----- background reloads (don’t flip isLoading) -----
  useEffect(() => {
    if (isMigrating) return;

    const reload = async () => {
      try {
        const fresh = await loadInitialBookmarks(userId, storageType);
        setBookmarkGroups(prev => (deepEqual(prev, fresh) ? prev : fresh));

        const idx = (fresh || []).map(g => ({ id: g.id, groupName: g.groupName }));
        try { chrome?.storage?.local?.set?.({ groupsIndex: idx }); } catch {}
        try { chrome?.storage?.session?.set?.({ groupsIndex: idx }); } catch {}

        // Keep caches hot
        writeBookmarkCacheSync(userId, storageType, fresh);
        writeBookmarkCacheSession(userId, storageType, fresh).catch(() => {});
      } catch (e) {
        console.error('Reload after update failed:', e);
      }
    };

    // Runtime messages (e.g., popup saved/imported)
    const runtimeHandler = (msg) => {
      if (msg?.type === 'MINDFUL_BOOKMARKS_UPDATED') reload();
    };
    try { chrome?.runtime?.onMessage?.addListener?.(runtimeHandler); } catch {}

    // BroadcastChannel fanout
    let bc;
    try {
      bc = new BroadcastChannel('mindful');
      bc.onmessage = (e) => {
        if (e?.data?.type === 'MINDFUL_BOOKMARKS_UPDATED') reload();
      };
    } catch {}

    // Visibility regain (tab refocus) — best-effort refresh
    const onVis = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      try { chrome?.runtime?.onMessage?.removeListener?.(runtimeHandler); } catch {}
      try { bc?.close?.(); } catch {}
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId, storageType, isMigrating]);

  // ----- storage type changes -----
  const handleStorageTypeChange = useCallback(async (newStorageType) => {
    setStorageType(newStorageType);
    if (user) {
      updateUserAttribute({
        userAttribute: {
          attributeKey: 'custom:storage_type',
          value: newStorageType,
        },
      }).catch(err => console.error('Error updating storage type preference:', err));
    }
  }, [user]);

  // ----- render gate: only block first paint if we truly have nothing -----
  if (isLoading && !groupsIndex.length && !hasHydrated) {
    return <div>Loading…</div>;
  }

  const contextValue = {
    // for popup & new tab
    groupsIndex,
    bookmarkGroups, setBookmarkGroups,

    userId,
    storageType,
    setStorageType: handleStorageTypeChange,

    isLoading,
    isMigrating, setIsMigrating,
    userAttributes, setUserAttributes,
    hasHydrated,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}