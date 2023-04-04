import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';

// function to save a bookmark to local storage
export function saveBookmark(bookmarkName, url, groupName) {
    let bookmarkGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS)) || [];
    let bookmark = { name: bookmarkName, url: url };
    
    // Check if bookmark name already exists in the current group
    let existingGroupIndex = bookmarkGroups.findIndex((item) => item.groupName === groupName);
    if (existingGroupIndex !== -1) {
      let existingGroup = bookmarkGroups[existingGroupIndex];
      if (!existingGroup.bookmarks.some((item) => item.bookmarkName === name)) {
        existingGroup.bookmarks.push(bookmark);
      } else {
        alert(`A bookmark with the name "${bookmarkName}" already exists in the "${groupName}" group.`);
      }
    } else {
      bookmarkGroups.push({ groupName: groupName, bookmarks: [bookmark] });
    }
    
    localStorage.setItem(STORAGE_KEY_BOOKMARK_GROUPS, JSON.stringify(bookmarkGroups));

    // Reload the active tab to reflect the new bookmark
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.reload(tabs[0].id);
    });
  }