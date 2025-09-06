import React, { useContext, useState } from "react"; // Add useState
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core'; // Add DragOverlay
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { BookmarkGroup } from '@/components/BookmarkGroup';
import { BookmarkItem } from '@/components/BookmarkItem'; // Import BookmarkItem to render in the overlay
import { AppContext } from "@/scripts/AppContext.jsx";
import { useBookmarkManager } from '@/scripts/useBookmarkManager.js';

const DraggableGrid = () => {
  const { bookmarkGroups, setBookmarkGroups, userId, storageType, setStorageType } = useContext(AppContext);  
 
  const [activeItem, setActiveItem] = useState(null);

  const {
    deleteBookmarkGroup,
    reorderBookmarkGroups,
    reorderBookmarks,
    moveBookmark,
  } = useBookmarkManager();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event) {
    const { active } = event;
    const { id } = active;
    let currentItem = null;

    // Find if the dragged item is a group and get its index
    const groupIndex = bookmarkGroups.findIndex((group) => group.id === id);
    if (groupIndex > -1) {
        currentItem = { ...bookmarkGroups[groupIndex], groupIndex }; // Store the group and its index
    } else {
        // If not a group, find the bookmark
        for (let i = 0; i < bookmarkGroups.length; i++) {
            const bookmark = bookmarkGroups[i].bookmarks.find((bm) => bm.id === id);
            if (bookmark) {
                // Mark it as a bookmark for the overlay to know which component to render
                currentItem = { ...bookmark, isBookmark: true };
                break;
            }
        }
    }
    setActiveItem(currentItem);
  }

  async function handleDragEnd(event) {
    setActiveItem(null); // Clear the active item on drag end
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // ... (Your existing handleDragEnd logic remains exactly the same)
    const isDraggingGroup = bookmarkGroups.some((group) => group.id === active.id);

    // Scenario 1: Reordering bookmark groups
    if (isDraggingGroup) {
      const sourceGroupIndex = bookmarkGroups.findIndex((group) => group.id === active.id);
      const destinationGroupIndex = bookmarkGroups.findIndex((group) => group.id === over.id);

      if (sourceGroupIndex !== -1 && destinationGroupIndex !== -1) {
        reorderBookmarkGroups(sourceGroupIndex, destinationGroupIndex);
      }
      return;
    }

    // Scenario 2: Moving a bookmark
    const source = { groupIndex: -1, bookmarkIndex: -1 };
    const destination = { groupIndex: -1, bookmarkIndex: -1 };

    for (let i = 0; i < bookmarkGroups.length; i++) {
      const bookmarkIndex = bookmarkGroups[i].bookmarks.findIndex((bm) => bm.id === active.id);
      if (bookmarkIndex !== -1) {
        source.groupIndex = i;
        source.bookmarkIndex = bookmarkIndex;
        break;
      }
    }

    const overIsGroupContainer = bookmarkGroups.some((group) => group.id === over.id);
    
    if (overIsGroupContainer) {
      destination.groupIndex = bookmarkGroups.findIndex((group) => group.id === over.id);
      destination.bookmarkIndex = bookmarkGroups[destination.groupIndex].bookmarks.length;
    } else {
      for (let i = 0; i < bookmarkGroups.length; i++) {
        const bookmarkIndex = bookmarkGroups[i].bookmarks.findIndex((bm) => bm.id === over.id);
        if (bookmarkIndex !== -1) {
          destination.groupIndex = i;
          destination.bookmarkIndex = bookmarkIndex;
          break;
        }
      }
    }

    if (source.groupIndex === -1 || destination.groupIndex === -1) {
      return;
    }

    if (source.groupIndex === destination.groupIndex) {
      reorderBookmarks(source.bookmarkIndex, destination.bookmarkIndex, source.groupIndex);
    } else {
      moveBookmark(source, destination);
    }
  }

  async function handleDeleteBookmarkGroup(event, groupIndex) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the entire group " +
        bookmarkGroups[groupIndex].groupName +
        "?"
    );
    if (shouldDelete) {
      await deleteBookmarkGroup(groupIndex);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart} // Add this
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveItem(null)} // Add this for safety
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
              handleDeleteBookmarkGroup={handleDeleteBookmarkGroup}
            />
          ))}
        </div>
      </SortableContext>

      {/* This overlay renders the component being dragged */}
      <DragOverlay className="drag-overlay-item">
        {activeItem ? (
          activeItem.isBookmark ? (
            <BookmarkItem bookmark={activeItem} />
          ) : (
            // Pass the group data AND its index, but NOT the delete handler
            <BookmarkGroup
              bookmarkGroup={activeItem}
              groupIndex={activeItem.groupIndex}
            />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableGrid;