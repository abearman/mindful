import React, { createContext, useState, useEffect, useCallback } from 'react';
import { StorageType } from './Constants.js';
import { loadInitialBookmarks } from "./useBookmarkManager.js";
import { fetchAuthSession, fetchUserAttributes, updateUserAttribute } from 'aws-amplify/auth';

export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  const [userId, setUserId] = useState(null);
  const [storageType, setStorageType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // State to prevent race conditions during storage migration ---
  const [isMigrating, setIsMigrating] = useState(false);

  // Effect for fetching the user's identity and storage preference
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const { identityId } = await fetchAuthSession();
        if (!identityId) throw new Error("Could not retrieve user's identityId.");
        setUserId(identityId);

        const attributes = await fetchUserAttributes();
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
        setBookmarkGroups([]);
        setStorageType(StorageType.LOCAL);
      }
    };

    fetchInitialData();
  }, []);

  // Effect for loading bookmarks when userId or storageType changes
  useEffect(() => {
    // Guard clause to prevent this effect from running during a migration ---
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
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
