import React, { createContext, useState, useEffect, useCallback } from 'react';
import { StorageType, DEFAULT_STORAGE_TYPE } from '@/scripts/Constants.js';
import { loadInitialBookmarks } from '@/hooks/useBookmarkManager.js';
import {
  fetchAuthSession,
  fetchUserAttributes,
  updateUserAttribute,
} from 'aws-amplify/auth';

export const AppContext = createContext();

export function AppContextProvider({ user, children }) {
  // ----- state -----
  const [userAttributes, setUserAttributes] = useState(null);

  // Critical: render ASAP with a tiny groups index
  const [groupsIndex, setGroupsIndex] = useState([]);         // [{id, groupName}]
  const [bookmarkGroups, setBookmarkGroups] = useState([]);   // FULL objects, hydrated later

  const [userId, setUserId] = useState(null);
  const [storageType, setStorageType] = useState(null);

  const [isLoading, setIsLoading] = useState(true);            // only for the very first paint
  const [isMigrating, setIsMigrating] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Use localSTorage to seed the initial state of the PopUp before the first paint
  const LAST_GROUP_KEY = 'mindful:lastSelectedGroup';
  const getStoredGroup = () => {
    try { return localStorage.getItem(LAST_GROUP_KEY) || ''; } catch { return ''; }
  };
  const setStoredGroup = (v) => {
    try { localStorage.setItem(LAST_GROUP_KEY, v || ''); } catch {}
  };

  const deepEqual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };

  // ----- helpers: tiny / fast index -----
  async function readGroupsIndexFast() {
    // 1) try memory cache (persists while SW alive)
    try {
      const { groupsIndex } = await chrome.storage.session.get(['groupsIndex']);
      if (Array.isArray(groupsIndex) && groupsIndex.length) return groupsIndex;
    } catch {}

    // 2) try a small persistent key
    try {
      const { groupsIndex: persisted } = await chrome.storage.local.get(['groupsIndex']);
      if (Array.isArray(persisted)) {
        // refresh session cache for next popup open
        chrome.storage.session.set({ groupsIndex: persisted }).catch(() => {});
        return persisted;
      }
    } catch {}

    // 3) last-ditch: derive a tiny index from the full blob if it exists
    try {
      const { bookmarkGroups: full } = await chrome.storage.local.get(['bookmarkGroups']);
      if (Array.isArray(full) && full.length) {
        const idx = full.map(g => ({ id: g.id, groupName: g.groupName }));
        chrome.storage.session.set({ groupsIndex: idx }).catch(() => {});
        return idx;
      }
    } catch {}

    // empty state
    return [];
  }

  // ----- phase 0: decide mode quickly (no blocking on Amplify for LOCAL) -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // If the popup is opened while signed out, default to LOCAL immediately
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
            userAttribute: {
              attributeKey: 'custom:storage_type',
              value: StorageType.LOCAL,
            },
          }).catch(() => {});
        }
      } catch (err) {
        // Fail closed: LOCAL keeps popup snappy even if auth check falters
        console.warn('Auth bootstrap failed, falling back to LOCAL:', err);
        if (!cancelled) {
          setUserId(null);
          setStorageType(StorageType.LOCAL);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ----- phase 1: render ASAP with groups index -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const idx = await readGroupsIndexFast();
      if (!cancelled) {
        setGroupsIndex(idx);
        setIsLoading(false); // UI can render now (dropdown etc.)
      }
    })();

    return () => { cancelled = true; };
  }, []); // once per popup open

  // ----- phase 2: hydrate full groups in background once mode is known -----
  useEffect(() => {
    if (isMigrating) return;
    if (!storageType) return;                 // wait until phase 0 decided
    // Require userId for both modes, matches tests’ expectations
    if (!userId || !storageType) return; 

    let cancelled = false;

    (async () => {
      try {
        // Don’t block paint; schedule on idle/tick
        const kickoff = () => loadInitialBookmarks(userId, storageType)
          .then(full => {
            if (cancelled) return;
            setBookmarkGroups(prev => (deepEqual(prev, full) ? prev : full));

            // Persist/refresh the tiny index for next popup open
            const idx = (full || []).map(g => ({ id: g.id, groupName: g.groupName }));
            try { chrome?.storage?.local?.set?.({ groupsIndex: idx }); } catch {}
            try { chrome?.storage?.session?.set?.({ groupsIndex: idx }); } catch {} 
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
        chrome.storage.local.set({ groupsIndex: idx }).catch(() => {});
        chrome.storage.session.set({ groupsIndex: idx }).catch(() => {});
      } catch (e) {
        console.error('Reload after update failed:', e);
      }
    };

    const runtimeHandler = (msg) => {
      if (msg?.type === 'MINDFUL_BOOKMARKS_UPDATED') reload();
    };
    try { chrome?.runtime?.onMessage?.addListener(runtimeHandler); } catch {}

    let bc;
    try {
      bc = new BroadcastChannel('mindful');
      bc.onmessage = (e) => {
        if (e?.data?.type === 'MINDFUL_BOOKMARKS_UPDATED') reload();
      };
    } catch {}

    const onVis = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      try { chrome?.runtime?.onMessage?.removeListener(runtimeHandler); } catch {}
      try { bc?.close(); } catch {}
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
    // what PopUpComponent needs first
    groupsIndex,                    // fast list for dropdown
    // full data (arrives shortly after)
    bookmarkGroups, setBookmarkGroups,

    userId,
    storageType,
    setStorageType: handleStorageTypeChange,

    isLoading,
    isMigrating, setIsMigrating,
    userAttributes, setUserAttributes,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
