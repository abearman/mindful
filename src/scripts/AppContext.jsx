import React, { createContext, useState, useEffect, useCallback } from 'react';
import { StorageType, STORAGE_TYPE_CUSTOM_ATTRIBUTE } from './Constants.js';
import { loadInitialBookmarks } from "./useBookmarkManager.js";
// Import new functions for managing user attributes
import { fetchAuthSession, fetchUserAttributes, updateUserAttribute } from 'aws-amplify/auth';

export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  const [userId, setUserId] = useState(null);
  const [storageType, setStorageType] = useState(null); // Start with null until we fetch the user's preference
  const [isLoading, setIsLoading] = useState(true);

  // This effect runs once on initial load to fetch the user's identity
  // and their saved storage preference from Amplify.
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Get the user's identityId
        const { identityId } = await fetchAuthSession();
        if (!identityId) {
          throw new Error("Could not retrieve user's identityId. User may not be fully signed in.");
        }
        setUserId(identityId);

        // Fetch user attributes to get the stored storage type preference
        const attributes = await fetchUserAttributes();
        const storedType = attributes[STORAGE_TYPE_CUSTOM_ATTRIBUTE]; // Assumes you created a custom attribute named 'storage_type'

        if (storedType) {
          // If a preference is stored, use it.
          setStorageType(storedType);
        } else {
          // If no preference is stored (e.g., new user), default to REMOTE and save it.
          setStorageType(StorageType.REMOTE);
          await updateUserAttribute({
            userAttribute: {
              attributeKey: STORAGE_TYPE_CUSTOM_ATTRIBUTE,
              value: StorageType.REMOTE,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching initial user data:", error);
        setUserId(null);
        setBookmarkGroups([]);
        // If there's an error (e.g., not signed in), we can default to local
        setStorageType(StorageType.LOCAL);
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array means this runs only once on mount

  // This effect is now dedicated to loading bookmarks whenever the
  // userId or storageType changes.
  useEffect(() => {
    // Don't try to load bookmarks until we have a user and a storage type defined.
    if (!userId || !storageType) {
      // If there's no storage type yet, it means the initial fetch isn't done.
      // We can set loading to false only when we are truly finished.
      if (!storageType) {
         return;
      }
       setIsLoading(false);
       return;
    }

    const loadData = async () => {
      // Set loading to true when we start fetching bookmarks
      setIsLoading(true);
      try {
        const initialBookmarks = await loadInitialBookmarks(userId, storageType);
        setBookmarkGroups(initialBookmarks);
      } catch (error) {
        console.error("Error loading bookmarks:", error);
        setBookmarkGroups([]);
      } finally {
        // Set loading to false once bookmarks are loaded or an error occurs
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId, storageType]); // Re-run this effect if userId or storageType changes

  // This function now handles updating the state AND the user's persistent preference.
  const handleStorageTypeChange = useCallback(async (newStorageType) => {
    // Update the state immediately for a responsive UI
    setStorageType(newStorageType);

    // If the user is signed in, update their preference in Amplify
    if (userId) {
      try {
        await updateUserAttribute({
          userAttribute: {
            attributeKey: STORAGE_TYPE_CUSTOM_ATTRIBUTE,
            value: newStorageType,
          },
        });
      } catch (error) {
        console.error("Error updating storage type preference:", error);
        // Optional: You could add logic here to revert the state change on failure
      }
    }
  }, [userId]); // Dependency on userId ensures we have it before trying to update

  // While loading, we can show a spinner or a blank screen
  if (isLoading && !bookmarkGroups.length) {
    return <div>Loading...</div>; // Or any loading component
  }

  const contextValue = {
    bookmarkGroups,
    setBookmarkGroups,
    userId,
    storageType,
    setStorageType: handleStorageTypeChange, // Provide the new handler to the rest of the app
    isLoading,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
