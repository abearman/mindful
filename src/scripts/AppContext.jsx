import React, { createContext, useState, useEffect } from 'react';

import {
  loadInitialBookmarks,
} from "./useBookmarkManager.js";


export const AppContext = createContext();

export function AppContextProvider({ children, user }) {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);
  const [userId, setUserId] = useState(user?.userId); 

  useEffect(() => {
    async function fetchData() {
      // Only fetch if a user is logged in
      if (userId) {
        const groups = await loadInitialBookmarks(userId);
       setBookmarkGroups(groups); 
      // If no user, clear the bookmarks
      } else {
        setBookmarkGroups([]);
      }
    }
    fetchData();
  }, [userId]);

  const contextValue = {
    bookmarkGroups, 
    setBookmarkGroups,
    userId,
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
