import React, { useContext, useState, useEffect } from 'react';
import { createRoot } from "react-dom/client"; 

import './styles/PopUp.css';
import { constructValidURL } from './scripts/Utilities.js';
import { loadBookmarkGroups, saveBookmark, refreshActiveMindfulTab } from './scripts/BookmarkManagement.js';
import { URL_PATTERN } from './scripts/Constants.js';
import { AppContextProvider, AppContext } from './scripts/AppContext.jsx';

function PopUp() {
  const { userId, bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  
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
    const group = newGroupInput === '' ? selectedGroup : newGroupInput;
    const urlWithProtocol = constructValidURL(url);
    saveBookmark(name, urlWithProtocol, group, setBookmarkGroups);

    // Update the group dropdown with the new group name
    refreshGroupsDropdown();
    
    setNewGroupInput('');
    setSelectedGroupNewOrLastModified();
    setName('');
    setUrl('');
  }

  async function loadGroupDropdown() {
    const bookmarkGroups = await loadBookmarkGroups(userId);

    let options = bookmarkGroups.map((group) => {
      return (
        <option key={group.groupName} value={group.groupName}>
          {group.groupName}
        </option>
      );
    });

    setGroups(options);
  }

  function refreshGroupsDropdown() {
    if (newGroupInput !== '') {
      setGroups((groups) => [
        ...groups,
        <option key={newGroupInput} value={newGroupInput}>
          {newGroupInput}
        </option>,
      ]);
    }
  }

  return (
    <div className="popup">
      <h1>Mindful</h1>
      <form id="add-bookmark-form" onSubmit={handleSubmit}>
        <label htmlFor="group-dropdown">Group</label>
        <select id="group-dropdown" value={selectedGroup} onChange={handleGroupChange}>
          {groups}
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

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <AppContextProvider>
    <PopUp />
  </AppContextProvider>
);