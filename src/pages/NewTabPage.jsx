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
import { 
  EMPTY_GROUP_IDENTIFIER, 
  ONBOARDING_NEW_GROUP_PREFILL, 
  StorageType 
} from "@/scripts/Constants"; 

/* Hooks and Utilities */
import { getUserStorageKey } from '@/scripts/Utilities';
import { loadInitialBookmarks, useBookmarkManager } from '@/hooks/useBookmarkManager';
import { AppContext } from "@/scripts/AppContextProvider";

/* Components */
import TopBanner from "@/components/TopBanner";
import DraggableGrid from '@/components/DraggableGrid';
import EmptyBookmarksState from '@/components/EmptyBookmarksState';

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

  // --- De-dupe bursts from message + storage ---
  const lastAuthSignalAtRef = useRef(0);
  const handleAuthSignal = (at = Date.now()) => {
    if (at <= lastAuthSignalAtRef.current) return; // ignore duplicates
    lastAuthSignalAtRef.current = at;
    // Easiest & safest: full reload so all providers/hooks re-init with the new session
    window.location.reload();
    // If you prefer a soft refresh, swap the line above for:
    // - re-check auth + re-run your initial data loads
    // - e.g., await getCurrentUser(); reloadBookmarks(); etc.
  };

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

  // Listen for LOCAL storage changes to sync bookmarks across tabs (existing logic)
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

  // --- Listen for popup auth broadcasts (runtime messages) ---
  useEffect(() => {
    const onMsg = (msg) => {
      if (msg?.type === 'USER_SIGNED_IN' || msg?.type === 'USER_SIGNED_OUT') {
        handleAuthSignal(msg.at);
      }
    };
    const runtime = typeof chrome !== 'undefined' ? chrome.runtime : undefined;
    if (runtime?.onMessage?.addListener && runtime?.onMessage?.removeListener) {
      runtime.onMessage.addListener(onMsg);
      return () => runtime.onMessage.removeListener(onMsg);
    }
    // In non-extension envs (tests), do nothing.
    return () => {};
  }, []);

  // --- Listen for auth storage ping (fallback/decoupled path) ---
  useEffect(() => {
    // Only use this fallback if runtime messaging isn't available.
    const hasRuntimeMessaging =
      !!chrome?.runtime?.onMessage?.addListener &&
      !!chrome?.runtime?.onMessage?.removeListener;
    if (hasRuntimeMessaging) {
      // Runtime path exists; skip the storage fallback to avoid double listeners.
      return () => {};
    }
    
    const storageEvents = chrome?.storage?.onChanged;
    if (!storageEvents?.addListener || !storageEvents?.removeListener) {
      return () => {};
    }
    
    const onStorageAuth = (changes, area) => {
      if (area !== 'local') return;
      if (changes.authSignalAt?.newValue) {
        handleAuthSignal(Number(changes.authSignalAt.newValue));
      }
    };
    storageEvents.addListener(onStorageAuth);
    return () => storageEvents.removeListener(onStorageAuth);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-950">
      <TopBanner
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
      <EmptyBookmarksState
        onCreateGroup={() => gridRef.current?.startCreateGroup({ prefill: ONBOARDING_NEW_GROUP_PREFILL, select: 'all' })}
        onImport={handleLoadBookmarks}
      />
    </div>
  );
}
