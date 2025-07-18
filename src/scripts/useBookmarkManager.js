import { useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { arrayMove } from '@dnd-kit/sortable';
import { AppContext } from './AppContext.jsx'; 
import { CHROME_NEW_TAB, EMPTY_GROUP_IDENTIFIER } from './Constants.js';
import { getUserStorageKey, refreshOtherMindfulTabs } from './Utilities.js'


// This function is still needed for the initial load in your AppProvider
// TODO: Was loadInitialBookmarks
export async function loadInitialBookmarks(userId) {
  if (!userId) return [];
  const userStorageKey = getUserStorageKey(userId);
  const result = await chrome.storage.local.get(userStorageKey);
  return result[userStorageKey] || [];
}

// --- The Custom Hook ---

export const useBookmarkManager = () => {
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);

  /**
   * Internal helper to persist changes to Chrome local storage and update context.
   */
  const updateAndPersistGroups = async (newGroups) => {
    if (!userId) {
      console.error("Cannot save: userId is not available.");
      return;
    }

    // 1. Update React state immediately for a responsive UI
    setBookmarkGroups(newGroups);

    // 2. Persist to storage in the background
    const userStorageKey = getUserStorageKey(userId);
    try {
      await chrome.storage.local.set({ [userStorageKey]: newGroups });
      refreshOtherMindfulTabs(); // Notify other tabs of the change
    } catch (error) {
      console.error("Failed to save bookmarks to storage:", error);
      // Optional: Implement error handling, e.g., revert state
    }
  };
  
  const addEmptyBookmarkGroup = async () => {
    const newGroup = {
      groupName: EMPTY_GROUP_IDENTIFIER,
      bookmarks: [],
      id: uuidv4(),
    };
    await updateAndPersistGroups([...bookmarkGroups, newGroup]);
  };

  const addNamedBookmarkGroup = async (groupName) => { 
    const newGroup = {
      groupName: groupName,
      bookmarks: [],
      id: uuidv4(),
    };
    await updateAndPersistGroups([...bookmarkGroups, newGroup]);
  }

  const deleteBookmarkGroup = async (groupIndex) => {
    const updatedGroups = bookmarkGroups.filter((_, index) => index !== groupIndex);
    await updateAndPersistGroups(updatedGroups);
  };

  const editBookmarkGroupHeading = async (groupIndex, newHeadingName) => {
    const updatedGroups = bookmarkGroups.map((group, index) =>
      index === groupIndex ? { ...group, groupName: newHeadingName } : group
    );
    await updateAndPersistGroups(updatedGroups);
  };

  const reorderBookmarkGroups = async (oldIndex, newIndex) => {
    const updatedGroups = arrayMove(bookmarkGroups, oldIndex, newIndex);
    await updateAndPersistGroups(updatedGroups); // UI updates instantly, storage saves after
  };

  const deleteBookmark = async (bookmarkIndex, groupIndex) => {
    // Deep copy to prevent state mutation issues.
    const updatedGroups = JSON.parse(JSON.stringify(bookmarkGroups));

    // Check if the group and bookmark exist to prevent errors.
    if (updatedGroups[groupIndex] && updatedGroups[groupIndex].bookmarks[bookmarkIndex]) {
      // Remove the bookmark using splice.
      updatedGroups[groupIndex].bookmarks.splice(bookmarkIndex, 1);
      
      // Save the updated array to state and storage.
      await updateAndPersistGroups(updatedGroups);
    } else {
      console.error("Error: Tried to delete a bookmark that doesn't exist.", { groupIndex, bookmarkIndex });
    }
  };

  const editBookmarkName = async (groupIndex, bookmarkIndex, newBookmarkName) => {
    // Deep copy to prevent state mutation issues.
    const updatedGroups = JSON.parse(JSON.stringify(bookmarkGroups));

    // Check for valid indices to prevent runtime errors.
    if (updatedGroups[groupIndex] && updatedGroups[groupIndex].bookmarks[bookmarkIndex]) {
      // Update the name of the specific bookmark.
      updatedGroups[groupIndex].bookmarks[bookmarkIndex].name = newBookmarkName;
      
      // Persist the changes.
      await updateAndPersistGroups(updatedGroups);
    } else {
      console.error("Error: Tried to edit a bookmark name for an item that doesn't exist.", { groupIndex, bookmarkIndex });
    }
  }

  const addNamedBookmark = async (bookmarkName, url, groupName) => {
    const newBookmark = { name: bookmarkName, url: url, id: uuidv4() };

    // Deep copy to prevent state mutation issues
    const updatedGroups = JSON.parse(JSON.stringify(bookmarkGroups)); 
    
    const groupIndex = updatedGroups.findIndex((g) => g.groupName === groupName);
    if (groupIndex !== -1) {
      updatedGroups[groupIndex].bookmarks.push(newBookmark);
    } else {
      updatedGroups.push({ groupName: groupName, id: uuidv4(), bookmarks: [newBookmark] });
    }
    
    await updateAndPersistGroups(updatedGroups);
  };

  const reorderBookmarks = async (oldBookmarkIndex, newBookmarkIndex, oldGroupIndex, newGroupIndex) => {
    // Deep copy to prevent state mutation issues
    const updatedGroups = JSON.parse(JSON.stringify(bookmarkGroups));

    // Find the source group and remove the bookmark from its original position.
    const sourceGroup = updatedGroups[oldGroupIndex];
    const [removedBookmark] = sourceGroup.bookmarks.splice(oldBookmarkIndex, 1);

    // If for some reason the bookmark wasn't found, exit to prevent errors.
    if (!removedBookmark) {
      console.error("Reorder failed: could not find the source bookmark.");
      return;
    }

    // Find the destination group and add the removed bookmark to its new position.
    const destinationGroup = updatedGroups[newGroupIndex];
    destinationGroup.bookmarks.splice(newBookmarkIndex, 0, removedBookmark);

    await updateAndPersistGroups(updatedGroups);
  }

  const exportBookmarksToJSON = () => {
    if (!bookmarkGroups || bookmarkGroups.length === 0) {
        alert("No bookmarks to export.");
        return;
    }
    const jsonData = JSON.stringify(bookmarkGroups, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindful_bookmarks.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importBookmarksFromJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const contents = e.target.result;
          const data = JSON.parse(contents);
          // Here you could add validation to ensure the data is in the correct format
          await updateAndPersistGroups(data);
          console.log("Bookmarks successfully imported and saved.");
        } catch (error) {
          console.error("Failed to read or parse the bookmarks file:", error);
          alert("Error: Could not import bookmarks. The file might be corrupted or in the wrong format.");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  // Return an object with all the manager functions
  return {
    addEmptyBookmarkGroup,
    addNamedBookmarkGroup,
    deleteBookmarkGroup,
    editBookmarkGroupHeading,
    reorderBookmarkGroups,
    addNamedBookmark,
    deleteBookmark,
    editBookmarkName,
    reorderBookmarks,
    exportBookmarksToJSON,
    importBookmarksFromJSON 
  };
};