import React, { createContext, useState, useEffect, useCallback } from 'react';
import { StorageType } from './Constants.js';
import { loadInitialBookmarks } from "./useBookmarkManager.js";
import { fetchAuthSession, fetchUserAttributes, updateUserAttribute } from 'aws-amplify/auth';

export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [userAttributes, setUserAttributes] = useState(null);
  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  const [userId, setUserId] = useState(null);
  const [storageType, setStorageType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false); // prevent race conditions

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
          setStorageType(StorageType.REMOTE);
          await updateUserAttribute({
            userAttribute: {
              attributeKey: 'custom:storage_type',
              value: StorageType.REMOTE,
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
        setBookmarkGroups(initialBookmarks);
      } catch (error) {
        console.error("Error loading bookmarks:", error);
        setBookmarkGroups([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, storageType, isMigrating]);

  // Effect: listen for bookmark update broadcasts and reload
  useEffect(() => {
    if (!userId || !storageType || isMigrating) return;

    const reload = async () => {
      try {
        const fresh = await loadInitialBookmarks(userId, storageType);
        setBookmarkGroups(fresh);
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

  if (isLoading && !bookmarkGroups.length) {
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
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
