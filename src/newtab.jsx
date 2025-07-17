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
import { 
  STORAGE_KEY_BOOKMARK_GROUPS,
  EMPTY_GROUP_IDENTIFIER
} from "./scripts/Constants.js";

/* Bookmark Storage */
import {
  addEmptyBookmarkGroup,
  loadBookmarkGroups,
  exportBookmarksToJSON,
  loadBookmarksFromLocalFile,
} from "./scripts/BookmarkManagement.js";
import { AppContextProvider, AppContext } from "./scripts/AppContext.jsx";

/* Components */
import { BookmarkGroup } from "./components/BookmarkGroup.jsx"
import TopBanner from "./components/TopBanner.jsx"; 
import DraggableGrid from './components/DraggableGrid.jsx'; 


export function NewTabUI({ user, signIn, signOut}) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);
  const [userAttributes, setUserAttributes] = useState(null); 

  const lastBookmarkGroupRef = useRef(null);
  
  // Add this useEffect to load data on initial component mount
  useEffect(() => {
    // Only try to load data if we have a valid user object
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const loadedGroups = await loadBookmarkGroups();

        if (loadedGroups) {
          // 1. Check if an empty group already exists in the fetched data.
          const hasEmptyGroup = loadedGroups.some(
            (group) => group.groupName === EMPTY_GROUP_IDENTIFIER
          );

          // 2. If not, add one directly to the array before setting state.
          if (!hasEmptyGroup) {
            addEmptyBookmarkGroup(setBookmarkGroups);
          }
        }
        
        // 3. Set the final, corrected array in state once.
        setBookmarkGroups(loadedGroups || []);

      } catch (error) {
        console.error("Error loading initial bookmark data:", error);
        setBookmarkGroups([]); // Set to empty array on error
      } finally {
        setIsLoading(false); // Mark loading as complete
      }
    };

    loadInitialData();
  }, [user]); // This effect runs only when the user object changes.

  // Fetch the userAttributes, but don't block any other rendering code on this
  useEffect(() => {
    if (!user) {
      setUserAttributes(null);
      return;
    }
    const fetchAttributes = async () => {
      try {
        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);
      } catch (error) {
        console.error("Error fetching user attributes:", error);
      }
    };
    fetchAttributes();
  }, [user]);

  // This effect listens for external changes to Chrome storage.
  useEffect(() => {
    function handleStorageChange(changes, area) {
      if (area === "local" && changes[STORAGE_KEY_BOOKMARK_GROUPS]) {
        console.log("Storage change detected, reloading bookmarks.");
        // We re-run the full logic to ensure the empty group is handled correctly.
        loadBookmarkGroups().then(groups => {
          if (groups) {
            const hasEmptyGroup = groups.some(g => g.groupName === EMPTY_GROUP_IDENTIFIER);
            if (!hasEmptyGroup) {
              addEmptyBookmarkGroup(setBookmarkGroups)
            }
            setBookmarkGroups(groups);
          }
        });
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [setBookmarkGroups]); // Add dependency to satisfy linter

  // This effect focuses the heading of a newly added group.
  useEffect(() => {
    if (lastBookmarkGroupRef.current) {
      lastBookmarkGroupRef.current.querySelector(".editable-heading").focus();
    }
  }, [bookmarkGroups]);

  return (
    <div>
      <TopBanner
        onLoadBookmarks={() => loadBookmarksFromLocalFile(setBookmarkGroups)}
        onExportBookmarks={exportBookmarksToJSON}
        userAttributes={userAttributes}
        onSignIn={signIn}
        onSignOut={signOut}
        isSignedIn={!!user} // Let the banner know a user is signed in
      />
      <DraggableGrid
        bookmarkGroups={bookmarkGroups}
      />
    </div>
  );
}