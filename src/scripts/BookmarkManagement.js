import { v4 as uuidv4 } from 'uuid';
import { CHROME_NEW_TAB, EMPTY_GROUP_IDENTIFIER } from './Constants.js';
import { arrayMove } from '@dnd-kit/sortable';


export function getUserStorageKey(userId) {
  return `bookmarks_${userId}`;
}

export function clearBookmarkGroups(userId) {
  // Return early if no user ID is provided.
  if (!userId) return null;

  // Generate the user-specific key.
  const userStorageKey = getUserStorageKey(userId);

  chrome.storage.local.remove(userStorageKey, function() {
    console.log('Cleared bookmarks');
  });
}

export async function loadBookmarkGroups(userId) {
  // Return early if no user ID is provided
  if (!userId) return null;

  // Generate the user-specific key
  const userStorageKey = getUserStorageKey(userId);

  // Fetch data using the user's key
  const result = await chrome.storage.local.get(userStorageKey);
  return result[userStorageKey] || [];
}

export async function overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups) {
  // Guard against saving without a user ID.
  if (!userId) {
    console.error("Cannot save bookmarks without a userId.");
    return;
  }

  // Generate the user key
  const userStorageKey = getUserStorageKey(userId);

  // Save the data
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [userStorageKey]: bookmarkGroups },
      async () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        // Refresh React state with the latest stored value
        const freshGroups = await loadBookmarkGroups(userId);
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
export async function deleteBookmarkGroup(userId, groupIndex, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups(userId);
  if (groupIndex !== -1) {
    bookmarkGroups.splice(groupIndex, 1);
    await overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups); 
  }
}

/* Function to add a new empty bookmark group to the end */
export async function addEmptyBookmarkGroup(userId, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups(userId);
  bookmarkGroups.push(
    { 
      groupName: EMPTY_GROUP_IDENTIFIER, 
      bookmarks: [],
      id: uuidv4(), 
    }
  );
  await overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups); 
}

export async function addBookmarkGroup(userId, groupName, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups(userId);
  bookmarkGroups.push(
    { 
      groupName: groupName, 
      bookmarks: [],
      id: uuidv4(), 
    }
  );
  await overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups); 
}

/* Function to save a bookmark to local storage */
export async function saveBookmark(userId, bookmarkName, url, groupName, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups(userId);
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
  
  await overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups);
}


/* Function to delete a bookmark by name from a group */
export async function deleteBookmark(userId, bookmarkIndex, groupIndex, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups(userId);
  if (groupIndex !== -1) {
    let bookmarkGroup = bookmarkGroups[groupIndex];
    let bookmarks = bookmarkGroup.bookmarks;

    // If the bookmark was found, remove it from the array and update local storage
    if (bookmarkIndex !== -1) {
      bookmarks.splice(bookmarkIndex, 1);
      await overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups); 
    }
  }
}

/* Function to edit a bookmark group's heading */
export async function editBookmarkGroupHeading(userId, bookmarkGroupIndex, newHeadingName, setBookmarkGroups) {
  const bookmarkGroups = await loadBookmarkGroups(userId);
  let updatedGroups = [...bookmarkGroups];  // Create a shallow copy
  updatedGroups[bookmarkGroupIndex].groupName = newHeadingName;
  await overwriteBookmarkGroupsToStorage(userId, updatedGroups, setBookmarkGroups); 
}

/* Function to edit a bookmark's name */
export async function editBookmarkName(userId, bookmarkGroupIndex, bookmarkIndex, newBookmarkName, setBookmarkGroups) {
  let bookmarkGroups = await loadBookmarkGroups(userId);

  // Create a deep copy to guarantee that React sees a new reference at both groups array and bookmarks array
  const updatedGroups = bookmarkGroups.map(group => ({
    ...group,
    bookmarks: [...group.bookmarks]
  })); 

  updatedGroups[bookmarkGroupIndex].bookmarks[bookmarkIndex].name = newBookmarkName;
  await overwriteBookmarkGroupsToStorage(userId, updatedGroups, setBookmarkGroups); 
}

/* Function to reorder bookmarks within a list or between groups */
export async function reorderBookmarks(userId, sourceBookmarkIndex, destinationBookmarkIndex, sourceGroupIndex, destinationGroupIndex, setBookmarkGroups) {
  // Copy the source group and remove the bookmark from its original position
  let bookmarkGroups = await loadBookmarkGroups(userId);
  const sourceGroup = { ...bookmarkGroups[sourceGroupIndex] };
  const [removedBookmark] = sourceGroup.bookmarks.splice(sourceBookmarkIndex, 1);

  // Copy the destination group and add the bookmark to its new position
  const destinationGroup = { ...bookmarkGroups[destinationGroupIndex] };
  destinationGroup.bookmarks.splice(destinationBookmarkIndex, 0, removedBookmark);

  // Update the bookmarkGroups state with the modified groups
  const updatedGroups = [...bookmarkGroups];
  updatedGroups[sourceGroupIndex] = sourceGroup;
  updatedGroups[destinationGroupIndex] = destinationGroup;

  await overwriteBookmarkGroupsToStorage(userId, bookmarkGroups, setBookmarkGroups); 
}

export async function reorderBookmarkGroups(userId, sourceGroupIndex, destinationGroupIndex, setBookmarkGroups) {
  setBookmarkGroups((prev) => {
    const newGroups = arrayMove(prev, sourceGroupIndex, destinationGroupIndex);
    // write to storage in the background — don't block UI update
    overwriteBookmarkGroupsToStorage(userId, newGroups, () => {}); 
    return newGroups;
  });
}

export function loadBookmarksFromLocalFile(userId, setBookmarkGroups) {
  const input = document.createElement("input");
  input.type = "file";
  input.addEventListener("change", (event) => handleFileSelection(userId, event, setBookmarkGroups));
  input.click();
}

async function handleFileSelection(userId, event, setBookmarkGroups) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = async function (event) {
    const contents = event.target.result;
    const data = JSON.parse(contents);
    await overwriteBookmarkGroupsToStorage(userId, data, setBookmarkGroups);
    console.log("Bookmarks saved to local storage:", data);
  };

  reader.readAsText(file);
}

export async function exportBookmarksToJSON(userId) {
  let bookmarkGroupsData = await loadBookmarkGroups(userId);

  const jsonData = JSON.stringify(bookmarkGroupsData);

  const blob = new Blob([jsonData], { type: "application/json" });

  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "bookmarks.json";

  anchor.click();
}