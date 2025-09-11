import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { StorageType, DEFAULT_STORAGE_TYPE } from '@/scripts/Constants.js';
import { loadInitialBookmarks } from "@/hooks/useBookmarkManager.js";
import { fetchAuthSession, fetchUserAttributes, updateUserAttribute } from 'aws-amplify/auth';

export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [userAttributes, setUserAttributes] = useState(null);
  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  const [userId, setUserId] = useState(null);
  const [storageType, setStorageType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false); // prevent race conditions

  // NEW: track whether we've completed the very first hydration.
  const [hasHydrated, setHasHydrated] = useState(false);

  // tiny deep-equal to avoid replacing identical data
  const deepEqual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };

  // Effect for fetching the user's identity and storage preference
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const { identityId } = await fetchAuthSession();
        if (!identityId) throw new Error("Could not retrieve user's identityId.");
        setUserId(identityId);

        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);

        const storedType = attributes['custom:storage_type'];
        if (storedType) {
          setStorageType(storedType);
        } else {
          setStorageType(DEFAULT_STORAGE_TYPE);  
          await updateUserAttribute({
            userAttribute: {
              attributeKey: 'custom:storage_type',
              value: StorageType.LOCAL,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching initial user data:", error);
        setUserId(null);
        setUserAttributes(null);
        setBookmarkGroups([]);
        setStorageType(StorageType.LOCAL);
      }
    };

    fetchInitialData();
  }, []);

  // Effect for loading bookmarks when userId or storageType changes
  useEffect(() => {
    if (isMigrating) {
      console.log("Migration in progress, skipping bookmark load.");
      return;
    }
    if (!userId || !storageType) {
      if (!storageType) return;
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const initialBookmarks = await loadInitialBookmarks(userId, storageType);
        // Avoid UI churn if nothing actually changed
        setBookmarkGroups(prev => (deepEqual(prev, initialBookmarks) ? prev : initialBookmarks));
      } catch (error) {
        console.error("Error loading bookmarks:", error);
        setBookmarkGroups([]);
      } finally {
        setIsLoading(false);
        // NEW: after the first completed load attempt, mark hydrated so we don't blank the UI later
        setHasHydrated(true);
      }
    };

    loadData();
  }, [userId, storageType, isMigrating]);

  // Effect: listen for bookmark update broadcasts and reload
  useEffect(() => {
    if (!userId || !storageType || isMigrating) return;

    const reload = async () => {
      try {
        // IMPORTANT: do not flip isLoading here; just refresh data in place to prevent "full page refresh" feel
        const fresh = await loadInitialBookmarks(userId, storageType);
        setBookmarkGroups(prev => (deepEqual(prev, fresh) ? prev : fresh));
      } catch (e) {
        console.error("Reload after update failed:", e);
      }
    };

    // 1) Extension runtime messages
    const runtimeHandler = (msg) => {
      if (msg?.type === 'MINDFUL_BOOKMARKS_UPDATED') reload();
    };
    try {
      chrome?.runtime?.onMessage?.addListener(runtimeHandler);
    } catch {}

    // 2) BroadcastChannel
    let bc;
    try {
      bc = new BroadcastChannel('mindful');
      bc.onmessage = (e) => {
        if (e?.data?.type === 'MINDFUL_BOOKMARKS_UPDATED') reload();
      };
    } catch {}

    // 3) Visibility change (catch stale state after backgrounding)
    const onVis = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      try { chrome?.runtime?.onMessage?.removeListener(runtimeHandler); } catch {}
      try { bc?.close(); } catch {}
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId, storageType, isMigrating]);

  // Handler for updating the storage type preference
  const handleStorageTypeChange = useCallback(async (newStorageType) => {
    // This is an explicit user action: we *can* show loading once here (keeps first-load logic consistent)
    setStorageType(newStorageType);
    if (userId) {
      try {
        await updateUserAttribute({
          userAttribute: {
            attributeKey: 'custom:storage_type',
            value: newStorageType,
          },
        });
      } catch (error) {
        console.error("Error updating storage type preference:", error);
      }
    }
  }, [userId]);

  // Only show the full-screen Loading *before first hydration*.
  if (isLoading && !bookmarkGroups.length && !hasHydrated) {
    return <div>Loading...</div>;
  }

  const contextValue = {
    bookmarkGroups,
    setBookmarkGroups,
    userId,
    storageType,
    setStorageType: handleStorageTypeChange,
    isLoading,
    isMigrating,
    setIsMigrating,
    userAttributes,
    setUserAttributes,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
