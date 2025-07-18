import React, { useContext, useRef, useEffect, useState } from "react";
import { CSS } from "@dnd-kit/utilities";

// Import Amplify and the Authenticator UI component
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';

// Import Amplify configuration and configure Amplify
import config from '../amplify_outputs.json';
Amplify.configure(config);

/* CSS styles */
import "./styles/Index.css";
import "./styles/TopBanner.css"; // Import the new banner styles
import "./styles/Login.css";

/* Constants */
import { EMPTY_GROUP_IDENTIFIER } from "./scripts/Constants.js";

/* Hooks and Utilities */
import { getUserStorageKey } from './scripts/Utilities.js';
import { loadInitialBookmarks, useBookmarkManager } from './scripts/useBookmarkManager.js';
import { AppContext } from "./scripts/AppContext.jsx";

/* Components */
import TopBanner from "./components/TopBanner.jsx"; 
import DraggableGrid from './components/DraggableGrid.jsx'; 


export function NewTabUI({ user, signIn, signOut}) {
  // Consume state from the context 
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);
  
  // Get all actions from the custom bookmarks hook
  const { 
    addEmptyBookmarkGroup, 
    exportBookmarksToJSON,
    importBookmarksFromJSON,
  } = useBookmarkManager();

  // Create a new handler function that calls the importBookmarksFromJSON with no arguments,
  // to discard the unwanted event object.
  const handleLoadBookmarks = () => {
    importBookmarksFromJSON();
  };

  const [isLoading, setIsLoading] = useState(true);
  const [userAttributes, setUserAttributes] = useState(null); 

  const lastBookmarkGroupRef = useRef(null);
  
  // Effect to fetch user attributes when the user logs in
  useEffect(() => {
    if (!user) {
      setUserAttributes(null);
      setIsLoading(false);
      return;
    }

    const fetchAttributes = async () => {
      setIsLoading(true);
      try {
        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);
      } catch (error) {
        console.error("Error fetching user attributes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttributes();
  }, [user]);

  // Effect to ensure an empty group for adding new bookmarks always exists.
  // This runs after the initial data is loaded into the context by the AppProvider.
  useEffect(() => {
    if (bookmarkGroups && bookmarkGroups.length > 0) {
      const hasEmptyGroup = bookmarkGroups.some(
        (group) => group.groupName === EMPTY_GROUP_IDENTIFIER
      );
      if (!hasEmptyGroup) {
        addEmptyBookmarkGroup();
      }
    }
  }, [bookmarkGroups]); // Runs whenever the bookmark groups change.
  
  // Effect to listen for external changes to Chrome storage (e.g., from another tab)
  useEffect(() => {
    if (!userId) return; // Don't listen if there's no user

    const handleStorageChange = async (changes, area) => {
      const userStorageKey = getUserStorageKey(userId);
      if (area === "local" && changes[userStorageKey]) {
        console.log("Storage change detected, reloading bookmarks.");
        // When storage changes, reload the data and update the context.
        const freshGroups = await loadInitialBookmarks(userId);
        setBookmarkGroups(freshGroups || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [userId, setBookmarkGroups]); // Re-attach listener if userId changes

  // This effect focuses the heading of a newly added group.
  useEffect(() => {
    if (lastBookmarkGroupRef.current) {
      lastBookmarkGroupRef.current.querySelector(".editable-heading").focus();
    }
  }, [bookmarkGroups]);

  return (
    <div>
      <TopBanner
        onLoadBookmarks={handleLoadBookmarks}
        onExportBookmarks={exportBookmarksToJSON}
        userAttributes={userAttributes}
        onSignIn={signIn}
        onSignOut={signOut}
        isSignedIn={!!user} // Let the banner know a user is signed in
      />
      <DraggableGrid
        user={user}
        bookmarkGroups={bookmarkGroups}
      />
    </div>
  );
}