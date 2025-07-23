import React, { useContext, useState, useEffect } from 'react';
import { createRoot } from "react-dom/client";

// Import Amplify and configure it 
import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs.json';
Amplify.configure(config);

// Import Amplify Authenticator
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';

/* CSS styles */
import './styles/PopUp.css';

/* Constants */
import { URL_PATTERN, EMPTY_GROUP_IDENTIFIER } from './scripts/Constants.js';

/* Hooks and Utilities */
import { constructValidURL } from './scripts/Utilities.js';
import { loadInitialBookmarks, useBookmarkManager } from './scripts/useBookmarkManager.js';
import { AppContextProvider, AppContext } from './scripts/AppContext.jsx';

// Your existing PopUp component function remains the same
function PopUp() {
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);
    
  // Get all actions from the custom bookmarks hook
  const { 
    addNamedBookmark, 
  } = useBookmarkManager();  
  
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const groupOptions = bookmarkGroups
    .filter(group => group.groupName !== EMPTY_GROUP_IDENTIFIER) 
    .map(group => (
      <option key={group.id} value={group.groupName}>
        {group.groupName}
      </option>
    ));
  
  useEffect(() => {
    loadGroupDropdown();
    setInitialValues();

    setTimeout(function() {
      console.log("In timeout");
      window.addEventListener('blur', function(event) {
        console.log("In window event listener");
        event.preventDefault();
      });
    }, 500);
  }, []);

  // This effect runs whenever bookmarkGroups is updated
  useEffect(() => {
    if (bookmarkGroups && bookmarkGroups.length > 0) {
      // TODO: Add logic for last modified group
      setSelectedGroup(bookmarkGroups[0].groupName);
    } else {
      setSelectedGroup('New Group');
    }
  }, [bookmarkGroups]); // Dependency array makes it run when bookmarkGroups changes

  function setInitialValues() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
      let currentTabURL = currentTab.url;
      let currentTabTitle = currentTab.title;
      setUrl(currentTabURL);
      setName(currentTabTitle);
      setSelectedGroupNewOrLastModified();
    });
  }

  function setSelectedGroupNewOrLastModified() {
    if (bookmarkGroups.length == 0) {
      setSelectedGroup("New Group");
    } else {
      // TODO: Default select to the name of the last modified bookmark group.
      // For now, we'll just select the name of the first bookmark group.
      setSelectedGroup(bookmarkGroups[0].groupName);
    }
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  function handleUrlChange(event) {
    setUrl(event.target.value);
  }

  function handleNewGroupInputChange(event) {
    setNewGroupInput(event.target.value);
  }

  function handleGroupChange(event) {
    if (event.target.value === 'New Group') {
      setNewGroupInput('');
    }
    setSelectedGroup(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const groupName = newGroupInput === '' ? selectedGroup : newGroupInput;
    const urlWithProtocol = constructValidURL(url);
    addNamedBookmark(name, urlWithProtocol, groupName);

    // Update the group dropdown with the new group name
    refreshGroupsDropdown();
    
    setNewGroupInput('');
    setSelectedGroupNewOrLastModified();
    setName('');
    setUrl('');
  }

  async function loadGroupDropdown() {
    const fetchedGroups = await loadInitialBookmarks(userId);
    setBookmarkGroups(fetchedGroups); 
  }

  function refreshGroupsDropdown() {
    if (newGroupInput !== '') {
      // Add a new data object to the state array
      const newGroup = { groupName: newGroupInput /*, other properties... */ };
      setBookmarkGroups((currentGroups) => [...currentGroups, newGroup]);
    }
  }

  return (
    <div className="popup">
      <h1>Mindful</h1>
      <form id="add-bookmark-form" onSubmit={handleSubmit}>
        <label htmlFor="group-dropdown">Group</label>
        <select id="group-dropdown" value={selectedGroup} onChange={handleGroupChange}>
          {groupOptions} 
          <option value="New Group">New Group</option>
        </select>
        {selectedGroup === 'New Group' && (
          <div>
            <label htmlFor="new-group-input">New Group</label>
            <input
              type="text"
              id="new-group-input"
              name="new-group-input"
              value={newGroupInput}
              onChange={handleNewGroupInputChange}
            />
          </div>
        )}

        <label htmlFor="bookmark-name">Name</label>
        <input type="text" id="bookmark-name" name="bookmark-name" value={name} onChange={handleNameChange} required /> 

        <label htmlFor="bookmark-url">URL</label>
        
        <input
          type="text"
          id="bookmark-url"
          name="bookmark-url"
          value={url}
          onChange={handleUrlChange}
          pattern={URL_PATTERN} 
          required
        >
        </input>
        <button type="submit" className="add-bookmark-button">Add Bookmark</button>
      </form>
    </div>
  );
}

// Create a new wrapper component to handle auth state
function PopupApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for a logged-in user when the popup opens
    const checkUser = async () => {
      try {
        const authenticatedUser = await getCurrentUser(); 
        console.log("authenticatedUser in popup: ", authenticatedUser);
        setUser(authenticatedUser);
      } catch (err) {
        // No user is signed in.
        setUser(null);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  // If a user is logged in, provide their info to the PopUp component.
  // Otherwise, show a message.
  console.log("user to render? ", user);
  return user ? (
    <AppContextProvider user={user}>
      <PopUp />
    </AppContextProvider>
  ) : (
    <div>Please sign in on the new tab page first.</div>
  );
}


// const container = document.getElementById("root");
// const root = createRoot(container);

// // Render the new wrapper component instead of the PopUp directly
// root.render(
//   <React.StrictMode>
//     <PopupApp />
//   </React.StrictMode>
// );

export default PopupApp;