import { useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { arrayMove } from '@dnd-kit/sortable';
import { AppContext } from './AppContext.jsx';
import { EMPTY_GROUP_IDENTIFIER, StorageType } from './Constants.js';
import { getUserStorageKey, refreshOtherMindfulTabs } from './Utilities.js';
import { Storage } from './storage.js';

export async function loadInitialBookmarks(userId, storageType) {
  if (!userId) return [];
  const storage = new Storage(storageType);
  return storage.load(userId);
}

// --- The Custom Hook ---

export const useBookmarkManager = () => {
  const { setBookmarkGroups, userId, storageType, setStorageType } = useContext(AppContext);
  const storage = new Storage(storageType);

  /**
   * Internal helper that now uses a functional update to guarantee state consistency.
   * It takes an "updater" function as an argument, which receives the previous state
   * and returns the new state.
   */
  const updateAndPersistGroups = (updater) => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        console.error("Cannot save: userId is not available.");
        return reject(new Error("User ID not available"));
      }

      setBookmarkGroups(prevGroups => {
        // Calculate the new state using the guaranteed latest previous state
        const newGroups = updater(prevGroups);

        // Persist the new state to the selected storage
        storage.save(newGroups, userId)
          .then(() => {
            if (storageType === StorageType.LOCAL) {
              refreshOtherMindfulTabs();
            }
            resolve(newGroups); // Resolve the promise after successful save
          })
          .catch(error => {
            console.error(`Failed to save bookmarks to ${storageType}:`, error);
            reject(error); // Reject the promise if saving fails
          });
        
        // Return the new state for React to render immediately
        return newGroups;
      });
    });
  };

  const addEmptyBookmarkGroup = async () => {
    const newGroup = {
      groupName: EMPTY_GROUP_IDENTIFIER,
      bookmarks: [],
      id: uuidv4(),
    };
    await updateAndPersistGroups(prevGroups => [...prevGroups, newGroup]);
  };

  const addNamedBookmarkGroup = async (groupName) => {
    const newGroup = {
      groupName: groupName,
      bookmarks: [],
      id: uuidv4(),
    };
    await updateAndPersistGroups(prevGroups => {
      const updatedGroups = [...prevGroups];
      const emptyGroupIndex = updatedGroups.findIndex(g => g.groupName === EMPTY_GROUP_IDENTIFIER);
      if (emptyGroupIndex !== -1) {
        updatedGroups.splice(emptyGroupIndex, 0, newGroup);
      } else {
        updatedGroups.push(newGroup);
      }
      return updatedGroups;
    });
  };

  const deleteBookmarkGroup = async (groupIndex) => {
    await updateAndPersistGroups(prevGroups => prevGroups.filter((_, index) => index !== groupIndex));
  };

  const editBookmarkGroupHeading = async (groupIndex, newHeadingName) => {
    await updateAndPersistGroups(prevGroups =>
      prevGroups.map((group, index) =>
        index === groupIndex ? { ...group, groupName: newHeadingName } : group
      )
    );
  };

  const reorderBookmarkGroups = async (oldIndex, newIndex) => {
    await updateAndPersistGroups(prevGroups => arrayMove(prevGroups, oldIndex, newIndex));
  };

  const deleteBookmark = async (bookmarkIndex, groupIndex) => {
    await updateAndPersistGroups(prevGroups => {
      const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
      if (updatedGroups[groupIndex]?.bookmarks[bookmarkIndex]) {
        updatedGroups[groupIndex].bookmarks.splice(bookmarkIndex, 1);
      } else {
        console.error("Error: Tried to delete a bookmark that doesn't exist.", { groupIndex, bookmarkIndex });
      }
      return updatedGroups;
    });
  };

  const editBookmarkName = async (groupIndex, bookmarkIndex, newBookmarkName) => {
    await updateAndPersistGroups(prevGroups => {
      const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
      if (updatedGroups[groupIndex]?.bookmarks[bookmarkIndex]) {
        updatedGroups[groupIndex].bookmarks[bookmarkIndex].name = newBookmarkName;
      } else {
        console.error("Error: Tried to edit a bookmark name for an item that doesn't exist.", { groupIndex, bookmarkIndex });
      }
      return updatedGroups;
    });
  };

  const addNamedBookmark = async (bookmarkName, url, groupName) => {
    const newBookmark = { name: bookmarkName, url: url, id: uuidv4() };
    await updateAndPersistGroups(prevGroups => {
      const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
      const groupIndex = updatedGroups.findIndex(g => g.groupName === groupName);
      if (groupIndex !== -1) {
        updatedGroups[groupIndex].bookmarks.push(newBookmark);
      } else {
        const newGroup = { groupName: groupName, id: uuidv4(), bookmarks: [newBookmark] };
        const emptyGroupIndex = updatedGroups.findIndex(g => g.groupName === EMPTY_GROUP_IDENTIFIER);
        if (emptyGroupIndex !== -1) {
          updatedGroups.splice(emptyGroupIndex, 0, newGroup);
        } else {
          updatedGroups.push(newGroup);
        }
      }
      return updatedGroups;
    });
  };

  const reorderBookmarks = async (oldBookmarkIndex, newBookmarkIndex, groupIndex) => {
    await updateAndPersistGroups(prevGroups => {
      const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
      const group = updatedGroups[groupIndex];
      if (group) {
        group.bookmarks = arrayMove(group.bookmarks, oldBookmarkIndex, newBookmarkIndex);
      } else {
        console.error("Reorder failed: could not find the group.");
      }
      return updatedGroups;
    });
  };

  const moveBookmark = async (source, destination) => {
    await updateAndPersistGroups(prevGroups => {
      const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
      const sourceGroup = updatedGroups[source.groupIndex];
      const destinationGroup = updatedGroups[destination.groupIndex];
      if (!sourceGroup || !destinationGroup || !sourceGroup.bookmarks[source.bookmarkIndex]) {
        console.error("Move failed: invalid source or destination.", { source, destination });
        return prevGroups; // Return original state if move is invalid
      }
      const [movedBookmark] = sourceGroup.bookmarks.splice(source.bookmarkIndex, 1);
      destinationGroup.bookmarks.splice(destination.bookmarkIndex, 0, movedBookmark);
      return updatedGroups;
    });
  };

  const exportBookmarksToJSON = () => {
    // This function doesn't modify state, so it doesn't need to be changed.
    // It relies on the `bookmarkGroups` from context, which will be up-to-date.
    const { bookmarkGroups } = useContext(AppContext);
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
          // For a full import/overwrite, we can pass a function that ignores the previous state.
          await updateAndPersistGroups(() => data);
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
    moveBookmark,
    exportBookmarksToJSON,
    importBookmarksFromJSON,
    setStorageType
  };
};
