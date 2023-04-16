import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import '../styles/popup.css';
import { STORAGE_KEY_BOOKMARK_GROUPS } from '../scripts/constants.js';
import { createUniqueID, constructValidURL } from '../scripts/utilities.js';
import { loadBookmarkGroups, saveBookmark } from '../scripts/bookmark_management.js';

function Popup() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    loadGroupDropdown();
    setInitialValues();
  }, []);

  function setInitialValues() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var currentTab = tabs[0];
      let currentTabURL = currentTab.url;
      let currentTabTitle = currentTab.title;
      setUrl(currentTabURL);
      setName(currentTabTitle);
    });
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

  function handleSubmit(event) {
    event.preventDefault();

    const group = newGroupInput === '' ? selectedGroup : newGroupInput;

    saveBookmark(name, url, group);

    setGroups(loadBookmarkGroups());

    setNewGroupInput('');
    setSelectedGroup('');
    setName('');
    setUrl('');
  }

  function loadGroupDropdown() {
    const bookmarkGroups = loadBookmarkGroups();

    let options = bookmarkGroups.map((group) => {
      return (
        <option key={group.groupName} value={group.groupName}>
          {group.groupName}
        </option>
      );
    });

    setGroups(options);
  }

  function addNewGroup() {
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
          pattern="^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.|)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$" required>
        </input>
        <button type="submit" class="add-bookmark-button">Add Bookmark</button>
      </form>
    </div>
  );
}

ReactDOM.render(<Popup />, document.getElementById('root'));