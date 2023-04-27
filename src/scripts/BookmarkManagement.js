import { CHROME_NEW_TAB, STORAGE_KEY_BOOKMARK_GROUPS } from './Constants.js';

export function clearBookmarkGroups() {
  chrome.storage.local.remove(STORAGE_KEY_BOOKMARK_GROUPS, function() {
    console.log('Cleared bookmarks');
  });
}

export function loadBookmarkGroups() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS)) || [];
}

export function overwriteBookmarkGroupsToStorage(bookmarkGroups) {
  localStorage.setItem(STORAGE_KEY_BOOKMARK_GROUPS, JSON.stringify(bookmarkGroups));
  refreshAllMindfulTabs();
}

function refreshAllMindfulTabs() {
  // Reload any tabs that are open and pointed to newtab (aka Mindful page)
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      if (tab.url == CHROME_NEW_TAB) {
        chrome.tabs.reload(tab.id);
      }    
    });
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
  
  overwriteBookmarkGroupsToStorage(bookmarkGroups);
}


/* Function to delete a bookmark by name from a group */
export function deleteBookmark(bookmarkName, groupName) {
  let bookmarkGroups = loadBookmarkGroups();
  let groupIndex = bookmarkGroups.findIndex((item) => item.groupName === groupName);
  if (groupIndex !== -1) {
    let bookmarkGroup = bookmarkGroups[groupIndex];
    let bookmarks = bookmarkGroup["bookmarks"];
    const bookmarkIndex = bookmarks.findIndex((bookmark) => bookmark.name === bookmarkName);

    // If the bookmark was found, remove it from the array and update local storage
    if (bookmarkIndex !== -1) {
      bookmarks.splice(bookmarkIndex, 1);
      overwriteBookmarkGroupsToStorage(bookmarkGroups); 
      refreshActiveTab();
    }
  }
}


/* Function to edit a bookmark's name */
export function editBookmarkName(oldBookmarkName, groupName, newBookmarkName) {
  let bookmarkGroups = loadBookmarkGroups();
  let groupIndex = bookmarkGroups.findIndex((item) => item.groupName === groupName);
  if (groupIndex !== -1) {
    let bookmarkGroup = bookmarkGroups[groupIndex];
    let bookmarks = bookmarkGroup["bookmarks"];
    const bookmarkIndex = bookmarks.findIndex((bookmark) => bookmark.name === oldBookmarkName);

    // If the bookmark was found, edit its name and update local storage
    if (bookmarkIndex !== -1) {
      bookmarks[bookmarkIndex].name = newBookmarkName;
      overwriteBookmarkGroupsToStorage(bookmarkGroups); 
      refreshActiveTab();
    }
  }
}