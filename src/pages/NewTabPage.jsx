import React, { useContext, useEffect, useRef } from "react";

// Import Amplify and the Authenticator UI component
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';

// Import Amplify configuration and configure Amplify
import config from '/amplify_outputs.json';
Amplify.configure(config);

/* CSS styles */
import "@/styles/Login.css";

/* Constants */
import { EMPTY_GROUP_IDENTIFIER, StorageType } from "@/scripts/Constants"; 

/* Hooks and Utilities */
import { getUserStorageKey } from '@/scripts/Utilities.js';
import { loadInitialBookmarks, useBookmarkManager } from '@/scripts/useBookmarkManager';
import { AppContext } from "@/scripts/AppContextProvider";

/* Components */
import TopBanner from "@/components/TopBanner.jsx";
import DraggableGrid from '@/components/DraggableGrid.jsx';
import EmptyBookmarksState from '@/components/EmptyBookmarksState.jsx';


export function NewTabPage({ user, signIn, signOut }) {
  // Consume state from the context
  const {  
    bookmarkGroups, 
    setBookmarkGroups, 
    userId, 
    storageType, 
    isMigrating,
    userAttributes
  } = useContext(AppContext);

  const gridRef = useRef(null);

  // Treat only the placeholder group (with no bookmarks) as empty.
  const isEmptyDashboard =
    !bookmarkGroups ||
    bookmarkGroups.length === 0 ||
    bookmarkGroups.every(
    (g) =>
      g.groupName === EMPTY_GROUP_IDENTIFIER &&
      (!g.bookmarks || g.bookmarks.length === 0)
    );

  // Get all actions from the custom bookmarks hook
  const {
    addEmptyBookmarkGroup,
    exportBookmarksToJSON,
    importBookmarksFromJSON,
    changeStorageType,
  } = useBookmarkManager();

  // Create a new handler function that calls the importBookmarksFromJSON with no arguments
  const handleLoadBookmarks = () => {
    importBookmarksFromJSON();
  };

  // Effect to ensure an empty group for adding new bookmarks always exists.
  useEffect(() => {
    if (!bookmarkGroups) return; // Wait for loading to finish

    if (bookmarkGroups.length > 0) {
      const hasEmptyGroup = bookmarkGroups.some(
        (group) => group.groupName === EMPTY_GROUP_IDENTIFIER
      );
      if (!hasEmptyGroup) {
        addEmptyBookmarkGroup();
      }
    } else if (bookmarkGroups.length === 0) {
        // If there are no groups at all, add the initial empty one
        addEmptyBookmarkGroup();
    }
  }, [bookmarkGroups, addEmptyBookmarkGroup]); // Runs when bookmarks or loading state change.

  useEffect(() => {
    // Only attach this listener if we are in LOCAL storage mode.
    // It's irrelevant for remote storage.
    if (storageType !== StorageType.LOCAL || !userId) {
      return; // Do nothing if in remote mode or not signed in.
    }

    if (isMigrating) {  // Don't run this effect while migrating storage
      console.log("Migration in progress, storage listener is paused.");
      return;
    }

    const handleStorageChange = async (changes, area) => {
      const userStorageKey = getUserStorageKey(userId);
      if (area === "local" && changes[userStorageKey]) {
        console.log("Local storage changed in another tab. Reloading bookmarks...");
        // Pass the correct storageType to the loading function.
        const freshGroups = await loadInitialBookmarks(userId, storageType);
        setBookmarkGroups(freshGroups || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // The cleanup function runs when dependencies change, removing the old listener.
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [userId, storageType, setBookmarkGroups, isMigrating]); // Re-runs if user or storageType changes

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-950">
      <TopBanner
        onLoadBookmarks={handleLoadBookmarks}
        onExportBookmarks={exportBookmarksToJSON}
        userAttributes={userAttributes}
        onSignIn={signIn}
        onSignOut={signOut}
        isSignedIn={!!user}
        onStorageTypeChange={changeStorageType}
      />
      <DraggableGrid
        ref={gridRef}
        user={user}
        bookmarkGroups={bookmarkGroups}
      />
      {isEmptyDashboard && (
        <EmptyBookmarksState
          onCreateGroup={() => {
            console.log("Got to onCreateGroup");
            // 👇 Trigger rename mode on the “+ Add a group” card
            gridRef.current?.startCreateGroup({ prefill: 'My first bookmarks group', select: 'all' });
            // (omit args if you don’t need prefill/caret control)
            // gridRef.current?.startCreateGroup();
          }}
          onImport={handleLoadBookmarks}
          storageTypeLabel={storageType === StorageType.REMOTE ? "Encrypted Sync" : "Local"}
        />
      )} 
    </div>
  );
}