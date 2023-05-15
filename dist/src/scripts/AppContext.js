import React, { createContext, useState } from 'react';

import {
    loadBookmarkGroups,
} from "./BookmarkManagement.js";


export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [bookmarkGroups, setBookmarkGroups] = useState(loadBookmarkGroups || []);

  return (
    <AppContext.Provider value={{ bookmarkGroups, setBookmarkGroups }}>
      {children}
    </AppContext.Provider>
  );
}
