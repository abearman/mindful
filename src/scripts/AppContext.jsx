import React, { createContext, useState, useEffect } from 'react';

import {
    loadBookmarkGroups,
} from "./BookmarkManagement.js";


export const AppContext = createContext();

export function AppContextProvider({ children, user }) {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      // Only fetch if a user is logged in
      if (user) {
        const groups = await loadBookmarkGroups(user.userId);
       setBookmarkGroups(groups || []);
      // If no user, clear the bookmarks
      } else {
        setBookmarkGroups([]);
      }
    }

    fetchGroups();
  }, [user]);

  const contextValue = {
    bookmarkGroups, 
    setBookmarkGroups,
    userId: user?.userId
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
