import React, { useContext, useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* CSS styles */
import "./styles/NewTab.css";

/* Utilities */
import { createUniqueID } from "./scripts/Utilities.js";

/* Constants */
import { 
  STORAGE_KEY_BOOKMARK_GROUPS,
  EMPTY_GROUP_IDENTIFIER
} from "./scripts/Constants.js";

/* Bookmark Storage */
import {
  addEmptyBookmarkGroup,
  deleteBookmarkGroup,
  loadBookmarkGroups,
  reorderBookmarks,
  reorderBookmarkGroups,
  overwriteBookmarkGroupsToStorage,
} from "./scripts/BookmarkManagement.js";
import { AppContextProvider, AppContext } from "./scripts/AppContext.jsx";

/* Components */
import { BookmarkGroup } from "./components/BookmarkGroup.jsx"

const UserAction = {
  ADD_EMPTY_GROUP: "add_empty_group",
  DELETE_GROUP: "delete_group",
  NONE: "none",
};

function NewTabUI() {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true); // 1. Add loading state

  const lastBookmarkGroupRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only start dragging if the pointer moves 8px
      },
    })
  );
  const lastActionRef = useRef(UserAction.NONE);
  
  // Add this useEffect to load data on initial component mount
  useEffect(() => {
    loadBookmarkGroups().then(initialGroups => {
      setBookmarkGroups(initialGroups);
      setIsLoading(false); // Mark loading as complete
    });
  }, []); // Empty dependency array [] ensures this runs only once

  // Modify your original useEffect to respect the loading state
  useEffect(() => {
    // Don't do anything until the initial data has been loaded
    if (isLoading) {
      return;
    }
    const alreadyHasEmptyGroup = bookmarkGroups.some(
      (group) => (group.groupName === EMPTY_GROUP_IDENTIFIER) && (group.bookmarks.length == 0)
    );
    if (!alreadyHasEmptyGroup) {
      addEmptyBookmarkGroup(setBookmarkGroups);
    }
  }, [bookmarkGroups, isLoading]); // Add isLoading to the dependency array

  async function handleDeleteBookmarkGroup(event, groupIndex) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the entire group " +
        bookmarkGroups[groupIndex].groupName +
        "?"
    );
    if (shouldDelete) {
      lastActionRef.current = UserAction.DELETE_GROUP;
      await deleteBookmarkGroup(groupIndex, setBookmarkGroups);
    }
  }

  async function handleAddEmptyBookmarkGroup() {
    lastActionRef.current = UserAction.ADD_EMPTY_GROUP;
    addEmptyBookmarkGroup(setBookmarkGroups);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeGroup = bookmarkGroups.find((group) => group.id === active.id);
    const overGroup = bookmarkGroups.find((group) => group.id === over.id);

    if (activeGroup && overGroup) {
      const sourceGroupIndex = bookmarkGroups.findIndex(
        (group) => group.id === active.id
      );
      const destinationGroupIndex = bookmarkGroups.findIndex(
        (group) => group.id === over.id
      );
      reorderBookmarkGroups(
        sourceGroupIndex,
        destinationGroupIndex,
        setBookmarkGroups
      );
    } else {
      let sourceGroupIndex = -1;
      let sourceBookmarkIndex = -1;
      let destinationGroupIndex = -1;
      let destinationBookmarkIndex = -1;

      bookmarkGroups.forEach((group, gIndex) => {
        const bIndex = group.bookmarks.findIndex(
          (bookmark) => bookmark.id === active.id
        );
        if (bIndex !== -1) {
          sourceGroupIndex = gIndex;
          sourceBookmarkIndex = bIndex;
        }
      });

      bookmarkGroups.forEach((group, gIndex) => {
        const bIndex = group.bookmarks.findIndex(
          (bookmark) => bookmark.id === over.id
        );
        if (bIndex !== -1) {
          destinationGroupIndex = gIndex;
          destinationBookmarkIndex = bIndex;
        }
      });
      if (
        sourceGroupIndex !== -1 &&
        sourceBookmarkIndex !== -1 &&
        destinationGroupIndex !== -1 &&
        destinationBookmarkIndex !== -1 &&
        sourceGroupIndex === destinationGroupIndex
      ) {
        reorderBookmarks(
          sourceBookmarkIndex,
          destinationBookmarkIndex,
          sourceGroupIndex,
          destinationGroupIndex,
          setBookmarkGroups
        );
      }
    }
  }

  async function exportBookmarksToJSON() {
    let bookmarkGroupsData = await loadBookmarkGroups();

    const jsonData = JSON.stringify(bookmarkGroupsData);

    const blob = new Blob([jsonData], { type: "application/json" });

    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "bookmarks.json";

    anchor.click();
  }

  async function handleFileSelection(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async function (event) {
      const contents = event.target.result;
      const data = JSON.parse(contents);
      await overwriteBookmarkGroupsToStorage(data, setBookmarkGroups);
      console.log("Bookmarks saved to local storage:", data);
    };

    reader.readAsText(file);
  }

  function loadBookmarksFromLocalFile() {
    const input = document.createElement("input");
    input.type = "file";

    input.addEventListener("change", handleFileSelection);

    input.click();
  }

  useEffect(() => {
    function handleStorageChange(changes, area) {
      console.log("Handling storage change");
      if (area === "local" && changes[STORAGE_KEY_BOOKMARK_GROUPS]) {
        loadBookmarkGroups().then(setBookmarkGroups);
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    if (
      lastBookmarkGroupRef.current &&
      lastActionRef.current == UserAction.ADD_EMPTY_GROUP
    ) {
      lastBookmarkGroupRef.current.querySelector(".editable-heading").focus();
    }
  }, [bookmarkGroups]);

  return (
    <div>
      <div className="export-bookmarks-button-container">
        <button
          className="export-or-load-bookmarks-button"
          onClick={exportBookmarksToJSON}
        >
          Export Bookmarks
        </button>
        <button
          className="export-or-load-bookmarks-button"
          onClick={loadBookmarksFromLocalFile}
        >
          Load Bookmarks
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={bookmarkGroups.map((group) => group.id)}
          strategy={rectSortingStrategy}
        >
          <div className="bookmark-groups-container">
            {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
              <BookmarkGroup
                key={bookmarkGroup.id}
                bookmarkGroup={bookmarkGroup}
                groupIndex={groupIndex}
                sensors={sensors}
                handleDragEnd={handleDragEnd}
                handleDeleteBookmarkGroup={handleDeleteBookmarkGroup}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

ReactDOM.render(
  <AppContextProvider>
    <NewTabUI />
  </AppContextProvider>,
  document.getElementById("root")
);
