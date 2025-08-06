import React, { useContext, useState, useEffect } from 'react';
import { createRoot } from "react-dom/client";

// Import Amplify and configure it 
import { Amplify } from 'aws-amplify';
import config from '../../amplify_outputs.json';
Amplify.configure(config);

// Import Amplify Authenticator
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';

/* CSS styles */
import '../styles/PopUp.css';

/* Constants */
import { URL_PATTERN, EMPTY_GROUP_IDENTIFIER } from '../scripts/Constants.js';

/* Hooks and Utilities */
import { constructValidURL } from '../scripts/Utilities.js';
import { loadInitialBookmarks, useBookmarkManager } from '../scripts/useBookmarkManager.js';
import { AppContextProvider, AppContext } from '../scripts/AppContext.jsx';

// Your existing PopUp component function remains the same
function PopUpComponent() {
  const { bookmarkGroups, setBookmarkGroups, userId, storageType, setStorageType } = useContext(AppContext);    

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
  
    // Define the event listener function so we can reference it later
    const handleBlur = (event) => {
      console.log("In window event listener");
      event.preventDefault();
    };
    
    // Store the timer ID
    const timerId = setTimeout(() => {
      console.log("In timeout");
      window.addEventListener('blur', handleBlur);
    }, 500);
  
    // Return a cleanup function
    return () => {
      clearTimeout(timerId); // Clear the timer
      window.removeEventListener('blur', handleBlur); // Remove the event listener
    };
  }, []); // The empty dependency array means this runs only on mount and unmount

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
      const newGroup = { 
        id: newGroupInput, // Use the name as a unique ID
        groupName: newGroupInput 
      };
      //setBookmarkGroups((currentGroups) => [...currentGroups, newGroup]);
      setBookmarkGroups((currentGroups) => {
        const emptyGroupIndex = currentGroups.findIndex(g => g.groupName === EMPTY_GROUP_IDENTIFIER);
        return emptyGroupIndex === -1 
          ? [...currentGroups, newGroup] 
          : [...currentGroups.slice(0, emptyGroupIndex), newGroup, ...currentGroups.slice(emptyGroupIndex)];
      });
    }
  }

  return (
    <div className="popup">
      <h1>Mindful</h1>
      <form id="add-bookmark-form" onSubmit={handleSubmit} aria-label="Add bookmark">
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
  return user ? (
    <AppContextProvider user={user}>
      <PopUpComponent />
    </AppContextProvider>
  ) : (
    <div>Please sign in on the new tab page first.</div>
  );
}

export default PopupApp;