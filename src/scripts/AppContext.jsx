import React, { createContext, useState, useEffect } from 'react';
import { StorageType } from './Constants.js'; 
import { loadInitialBookmarks, } from "./useBookmarkManager.js";
import { fetchAuthSession } from 'aws-amplify/auth'; // Import the function to get user info


export const AppContext = createContext();

export function AppContextProvider({ children, user }) {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  const [userId, setUserId] = useState(null); 
  const [storageType, setStorageType] = useState(StorageType.REMOTE);  // Default to remote storage 
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    const fetchUserAndBookmarks = async () => {
      try {
        // First, get the current authenticated user's identity ID with their S3 properties
        const { identityId } = await fetchAuthSession();

        if (!identityId) {
          throw new Error("Could not retrieve user's identityId. User may not be fully signed in.");
        }

        setUserId(identityId);

        // Now that we have the userId, load the bookmarks
        const initialBookmarks = await loadInitialBookmarks(identityId, storageType);
        setBookmarkGroups(initialBookmarks);

      } catch (error) {
        console.error("Error fetching user or bookmarks:", error);
        // Handle cases where the user is not signed in
        setUserId(null);
        setBookmarkGroups([]);
      } finally {
        // Set loading to false once everything is done
        setIsLoading(false);
      }
    };

    fetchUserAndBookmarks();
  }, [storageType]); // Re-run this effect if the storageType changes

  // While loading, we can show a spinner or a blank screen
  if (isLoading) {
    return <div>Loading...</div>; // Or any loading component
  }

  const contextValue = {
    bookmarkGroups, 
    setBookmarkGroups,
    userId,
    storageType,
    setStorageType,
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
