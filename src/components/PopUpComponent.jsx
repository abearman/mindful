import React, { useContext, useState, useEffect } from 'react';

/* Hooks and Utilities */
import { AppContext } from "@/scripts/AppContextProvider";
import { constructValidURL } from '@/scripts/Utilities';
import { useBookmarkManager } from '@/scripts/useBookmarkManager'; 

/* Constants */
import { URL_PATTERN, EMPTY_GROUP_IDENTIFIER } from '@/scripts/Constants.js';


export default function PopupComponent() {
  // Consume state from the context. All data now flows from here.
  const { bookmarkGroups } = useContext(AppContext);

  // Get actions from the custom bookmarks hook.
  const { addNamedBookmark } = useBookmarkManager();

  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  // Effect to set the initial URL and Title from the current tab.
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        setUrl(tabs[0].url);
        setName(tabs[0].title);
      }
    });
  }, []); // Runs only once on component mount.

  // Effect to set the default dropdown value when bookmark groups are loaded or changed.
  useEffect(() => {
    if (bookmarkGroups && bookmarkGroups.length > 0) {
      // Find the first available group that isn't the special "empty" one
      const firstSelectableGroup = bookmarkGroups.find(
        (group) => group.groupName !== EMPTY_GROUP_IDENTIFIER
      );
      if (firstSelectableGroup) {
        setSelectedGroup(firstSelectableGroup.groupName);
      } else {
        // If only the "empty" group exists, default to creating a new one.
        setSelectedGroup('New Group');
      }
    } else {
      setSelectedGroup('New Group');
    }
  }, [bookmarkGroups]); // Reruns whenever the bookmark groups from context change.

  const handleSubmit = async (event) => {
    event.preventDefault();
    const groupName = selectedGroup === 'New Group' ? newGroupInput : selectedGroup;
    
    // Ensure new group name is not empty if selected
    if (groupName === '' || !groupName) {
        alert("Please enter a name for the new group.");
        return;
    }

    const urlWithProtocol = constructValidURL(url);
    
    // addNamedBookmark will handle all state updates and storage.
    // The component doesn't need to manage this itself.
    await addNamedBookmark(name, urlWithProtocol, groupName);

    // Optional: Close the popup window after successful submission
    window.close();
  };

  // Memoize group options to prevent re-calculation on every render
  const groupOptions = React.useMemo(() => 
    bookmarkGroups
      .filter(group => group.groupName !== EMPTY_GROUP_IDENTIFIER)
      .map(group => (
        <option key={group.id} value={group.groupName}>
          {group.groupName}
        </option>
      )), [bookmarkGroups]);

  return (
    <div className="popup">
      <h1>Mindful</h1>
      <form id="add-bookmark-form" onSubmit={handleSubmit} aria-label="Add bookmark">
        <label htmlFor="group-dropdown">Group</label>
        <select id="group-dropdown" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          {groupOptions}
          <option value="New Group">New Group</option>
        </select>
        
        {selectedGroup === 'New Group' && (
          <div>
            <label htmlFor="new-group-input">New Group Name</label>
            <input
              type="text"
              id="new-group-input"
              value={newGroupInput}
              onChange={(e) => setNewGroupInput(e.target.value)}
              required // A new group must have a name
            />
          </div>
        )}

        <label htmlFor="bookmark-name">Name</label>
        <input type="text" id="bookmark-name" value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="bookmark-url">URL</label>
        <input
          type="text"
          id="bookmark-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          pattern={URL_PATTERN}
          required
        />
        <button type="submit" className="add-bookmark-button">Add Bookmark</button>
      </form>
    </div>
  );
}