import React, { useContext, useRef, useEffect, useState } from "react";
import { createRoot } from "react-dom/client"; // Change the import
import { CSS } from "@dnd-kit/utilities";

// Import Amplify and the Authenticator UI component
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Authenticator, Flex } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Import Amplify configuration and configure Amplify
import config from '../amplify_outputs.json';
Amplify.configure(config);

/* CSS styles */
import "./styles/NewTab.css";
import "./styles/TopBanner.css"; // Import the new banner styles
import "./styles/Login.css";

/* Configs */
import formFields from "./config/formFields.js";

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
  overwriteBookmarkGroupsToStorage
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
    // TODO: Update this to have optional logins and cloud storage
    if (user) {
      loadBookmarkGroups().then(initialGroups => {
        setBookmarkGroups(initialGroups);
        setIsLoading(false); // Mark loading as complete
      });
    }
  }, [user]); 

  // *Only once*, add an empty bookmarkGroup on the end of the user-provided list.
  useEffect(() => {
    // Don't do anything until the initial data has been loaded
    if (isLoading) {
      return;
    }
    const alreadyHasEmptyGroup = bookmarkGroups.some(
      (group) => (group.groupName === EMPTY_GROUP_IDENTIFIER) && (group.bookmarks.length == 0)
    );
    if (!alreadyHasEmptyGroup) {
      addEmptyBookmarkGroup(setBookmarkGroups);
    }
  }, [bookmarkGroups, isLoading]);

  // Fetch the userAttributes, but don't block any other rendering code on this 
  useEffect(() => {
    const fetchAttributes = async () => {
      if (user) {
        try {
          const attributes = await fetchUserAttributes();
          setUserAttributes(attributes);
        } catch (error) {
          console.error("Error fetching user attributes:", error);
        }
      }
    };
    fetchAttributes();
  }, [user]);

  async function handleAddEmptyBookmarkGroup() {
    addEmptyBookmarkGroup(setBookmarkGroups);
  }

  useEffect(() => {
    function handleStorageChange(changes, area) {
      console.log("Handling storage change");
      if (area === "local" && changes[STORAGE_KEY_BOOKMARK_GROUPS]) {
        loadBookmarkGroups().then(setBookmarkGroups);
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

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
        isSignedIn={!!user} // Let the banner know a user is sign in
      />
      <DraggableGrid
        bookmarkGroups={bookmarkGroups}
      />
    </div>
  );
}

// Get the root container and create a root
const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AppContextProvider>
      <Authenticator 
        formFields={formFields} 
      >
        {({ signIn, signOut, user }) => (
          <NewTabUI user={user} signIn={signIn} signOut={signOut} />
        )}
      </Authenticator>
    </AppContextProvider>
  </React.StrictMode>
);