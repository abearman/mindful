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
  EMPTY_GROUP_IDENTIFIER
} from "./scripts/Constants.js";

/* Bookmark Storage */
import {
  getUserStorageKey,
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
  
  useEffect(() => {
    if (!user) {
      setUserAttributes(null);
      setIsLoading(false);
      return;
    }

    // Fetch the userAttributes
    const fetchAttributes = async () => {
      try {
        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);
      } catch (error) {
        console.error("Error fetching user attributes:", error);
      }
    };
    fetchAttributes();
    console.log("got here1");
  
    // Fetch the bookmarks data
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const loadedGroups = await loadBookmarkGroups(user.userId);
        console.log("loadedGroups: ", loadedGroups);

        if (loadedGroups) {
          // Check if an empty group already exists in the fetched data.
          const hasEmptyGroup = loadedGroups.some(
            (group) => group.groupName === EMPTY_GROUP_IDENTIFIER
          );
          console.log("hasEmptyGroup: ", hasEmptyGroup);

          // If not, add one directly to the array before setting state.
          if (!hasEmptyGroup) {
            addEmptyBookmarkGroup(user.userId, setBookmarkGroups);
          }
        }
        
        // Set the final, corrected array in state once.
        setBookmarkGroups(loadedGroups || []);

      } catch (error) {
        console.error("Error loading initial bookmark data:", error);
        setBookmarkGroups([]); // Set to empty array on error
      } finally {
        setIsLoading(false); // Mark loading as complete
      }
    };

    loadInitialData();
    console.log("got here2");
  }, [user]); // This effect runs only when the user object changes.

  console.log("bookmarkGroups: ", bookmarkGroups);

  // This effect listens for external changes to Chrome storage.
  useEffect(() => {
    function handleStorageChange(changes, area) {
      if (area === "local" && changes[getUserStorageKey(user.userId)]) {
        console.log("Storage change detected, reloading bookmarks.");
        // We re-run the full logic to ensure the empty group is handled correctly.
        loadBookmarkGroups(useruserId).then(groups => {
          if (groups) {
            const hasEmptyGroup = groups.some(g => g.groupName === EMPTY_GROUP_IDENTIFIER);
            if (!hasEmptyGroup) {
              addEmptyBookmarkGroup(user.userId, setBookmarkGroups)
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
        onExportBookmarks={() => exportBookmarksToJSON(user.userId)}
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