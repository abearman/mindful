import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';

/* Load bookmark groups */
export function loadBookmarkGroups() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS)) || [];
}

export function overwriteBookmarkGroups(bookmarkGroups) {
  localStorage.setItem(STORAGE_KEY_BOOKMARK_GROUPS, JSON.stringify(bookmarkGroups));
}

function refreshActiveTab() {
  // Reload the active tab to reflect the new bookmark
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.reload(tabs[0].id);
  });
}

/* Function to save a bookmark to local storage */
export function saveBookmark(bookmarkName, url, groupName) {
  let bookmarkGroups = loadBookmarkGroups();
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
  
  overwriteBookmarkGroups(bookmarkGroups);
  refreshActiveTab();
}


/* Function to delete a bookmark by name from a group */
export function deleteBookmark(bookmarkName, groupName) {
  let bookmarkGroups = loadBookmarkGroups();
  let groupIndex = bookmarkGroups.findIndex((item) => item.groupName === groupName);
  if (groupIndex !== -1) {
    console.log("group index found with name: " + groupName);
    let bookmarkGroup = bookmarkGroups[groupIndex];
    let bookmarks = bookmarkGroup["bookmarks"];
    const bookmarkIndex = bookmarks.findIndex((bookmark) => bookmark.name === bookmarkName);
    console.log("bookmark index found: " + bookmarkIndex);

    // If the bookmark was found, remove it from the array and update local storage
    if (bookmarkIndex !== -1) {
      bookmarks.splice(bookmarkIndex, 1);
      overwriteBookmarkGroups(bookmarkGroups); 
      refreshActiveTab();
    }
  }
}