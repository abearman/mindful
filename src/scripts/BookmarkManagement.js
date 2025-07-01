import { v4 as uuidv4 } from 'uuid';
import { CHROME_NEW_TAB, STORAGE_KEY_BOOKMARK_GROUPS } from './Constants.js';


export function clearBookmarkGroups() {
  chrome.storage.local.remove(STORAGE_KEY_BOOKMARK_GROUPS, function() {
    console.log('Cleared bookmarks');
  });
}

export async function loadBookmarkGroups() {
  const result = await chrome.storage.local.get(STORAGE_KEY_BOOKMARK_GROUPS);
  return result[STORAGE_KEY_BOOKMARK_GROUPS] || [];
}

export async function addMissingBookmarkIDs(setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();
  bookmarkGroups.forEach(function(bookmarkGroup) {
    // If missing, add an ID to the overall bookmark group
    if (!('id' in bookmarkGroup)) {
      bookmarkGroup['id'] = uuidv4(); 
    }
    // If missing, add an ID to the individual bookmark
    bookmarkGroup.bookmarks.forEach(function(bookmark) {
      if (!('id' in bookmark)) {
        bookmark['id'] = uuidv4(); 
      }
    });
  }); 
  await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups); 
}

export async function overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [STORAGE_KEY_BOOKMARK_GROUPS]: bookmarkGroups },
      async () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        // Refresh React state with the latest stored value
        const freshGroups = await loadBookmarkGroups();
        setBookmarkGroups(freshGroups);

        refreshOtherMindfulTabs();
        resolve();
      }
    )
  });
}

function refreshOtherMindfulTabs() {
  // Reload any tabs (except the current one) that are open and pointed to newtab (aka Mindful page)
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      if ((tab.url == CHROME_NEW_TAB) && (!tab.active))  {
        chrome.tabs.reload(tab.id);
      }    
    });
  });
}

export function refreshActiveMindfulTab() {
  // Reload the current active tab if it is pointed to newtab (aka Mindful page)
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      if ((tab.url == CHROME_NEW_TAB) && tab.active)  {
        chrome.tabs.reload(tab.id);
      }    
    });
  });
}

/* Function to delete an entire bookmark group by index */
export async function deleteBookmarkGroup(groupIndex, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();
  if (groupIndex !== -1) {
    bookmarkGroups.splice(groupIndex, 1);
    await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups); 
  }
}

/* Function to add a new empty bookmark group to the end */
export async function addEmptyBookmarkGroup(setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();
  bookmarkGroups.push(
    { 
      groupName: "", 
      bookmarks: [],
      id: uuidv4(), 
    }
  );
  await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups); 
}

/* Function to save a bookmark to local storage */
export async function saveBookmark(bookmarkName, url, groupName, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();
  let bookmark = { 
    name: bookmarkName, 
    url: url,
    id: uuidv4(),
  };
  
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
    bookmarkGroups.push(
      { 
        groupName: groupName, 
        id: uuidv4(),
        bookmarks: [bookmark],
      });
  }
  
  await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups);
}


/* Function to delete a bookmark by name from a group */
export async function deleteBookmark(bookmarkIndex, groupIndex, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();
  if (groupIndex !== -1) {
    let bookmarkGroup = bookmarkGroups[groupIndex];
    let bookmarks = bookmarkGroup.bookmarks;

    // If the bookmark was found, remove it from the array and update local storage
    if (bookmarkIndex !== -1) {
      bookmarks.splice(bookmarkIndex, 1);
      await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups); 
    }
  }
}

/* Function to edit a bookmark group's heading */
export async function editBookmarkGroupHeading(bookmarkGroupIndex, newHeadingName, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();
  const updatedGroups = [...bookmarkGroups];  // Create a shallow copy
  updatedGroups[bookmarkGroupIndex].groupName = newHeadingName;
  await overwriteBookmarkGroupsToStorage(updatedGroups, setBookmarkGroups); 
}

/* Function to edit a bookmark's name */
export async function editBookmarkName(bookmarkGroupIndex, bookmarkIndex, newBookmarkName, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups();

  // Create a deep copy to guarantee that React sees a new reference at both groups array and bookmarks array
  const updatedGroups = bookmarkGroups.map(group => ({
    ...group,
    bookmarks: [...group.bookmarks]
  })); 

  updatedGroups[bookmarkGroupIndex].bookmarks[bookmarkIndex].name = newBookmarkName;
  console.log('Updated groups in editBookmarkName: ', updatedGroups);
  await overwriteBookmarkGroupsToStorage(updatedGroups, setBookmarkGroups); 
}

/* Function to reorder bookmarks within a list or between groups */
export async function reorderBookmarks(sourceBookmarkIndex, destinationBookmarkIndex, sourceGroupIndex, destinationGroupIndex, setBookmarkGroups) {
  // Copy the source group and remove the bookmark from its original position
  let bookmarkGroups = await loadBookmarkGroups();
  const sourceGroup = { ...bookmarkGroups[sourceGroupIndex] };
  const [removedBookmark] = sourceGroup.bookmarks.splice(sourceBookmarkIndex, 1);

  // Copy the destination group and add the bookmark to its new position
  const destinationGroup = { ...bookmarkGroups[destinationGroupIndex] };
  destinationGroup.bookmarks.splice(destinationBookmarkIndex, 0, removedBookmark);

  // Update the bookmarkGroups state with the modified groups
  const updatedGroups = [...bookmarkGroups];
  updatedGroups[sourceGroupIndex] = sourceGroup;
  updatedGroups[destinationGroupIndex] = destinationGroup;

  await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups); 
}

export async function reorderBookmarkGroups(sourceGroupIndex, destinationGroupIndex, setBookmarkGroups) {
  //const newBookmarkGroups = Array.from(bookmarkGroups);
  let bookmarkGroups = await loadBookmarkGroups();
  const [reorderedGroup] = bookmarkGroups.splice(sourceGroupIndex, 1);
  bookmarkGroups.splice(destinationGroupIndex, 0, reorderedGroup);

  await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups); 
}