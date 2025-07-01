import React, { createContext, useState, useEffect } from 'react';

import {
    loadBookmarkGroups,
} from "./BookmarkManagement.js";


export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      const groups = await loadBookmarkGroups();
      setBookmarkGroups(groups);
    }

    fetchGroups();
  }, []);

  return (
    <AppContext.Provider value={{ bookmarkGroups, setBookmarkGroups }}>
      {children}
    </AppContext.Provider>
  );
}
