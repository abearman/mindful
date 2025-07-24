/* components/DraggableGrid.jsx */

import React, { useContext } from "react";
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { BookmarkGroup } from './BookmarkGroup';
import { AppContext } from "../scripts/AppContext.jsx";
import { useBookmarkManager } from '../scripts/useBookmarkManager.js';

const DraggableGrid = () => {
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);

  // Get all actions from the custom bookmarks hook
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

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isDraggingGroup = bookmarkGroups.some((group) => group.id === active.id);

    // Scenario 1: Reordering bookmark groups
    if (isDraggingGroup) {
      const sourceGroupIndex = bookmarkGroups.findIndex((group) => group.id === active.id);
      // Ensure the drop target is also a group
      const destinationGroupIndex = bookmarkGroups.findIndex((group) => group.id === over.id);

      if (sourceGroupIndex !== -1 && destinationGroupIndex !== -1) {
        reorderBookmarkGroups(sourceGroupIndex, destinationGroupIndex);
      }
      return;
    }

    // Scenario 2: Moving a bookmark
    const source = { groupIndex: -1, bookmarkIndex: -1 };
    const destination = { groupIndex: -1, bookmarkIndex: -1 };

    // Find the source group and bookmark index
    for (let i = 0; i < bookmarkGroups.length; i++) {
      const bookmarkIndex = bookmarkGroups[i].bookmarks.findIndex((bm) => bm.id === active.id);
      if (bookmarkIndex !== -1) {
        source.groupIndex = i;
        source.bookmarkIndex = bookmarkIndex;
        break;
      }
    }

    // Find the destination group and bookmark index
    const overIsGroupContainer = bookmarkGroups.some((group) => group.id === over.id);
    
    if (overIsGroupContainer) {
      // Dropped on a group container
      destination.groupIndex = bookmarkGroups.findIndex((group) => group.id === over.id);
      destination.bookmarkIndex = bookmarkGroups[destination.groupIndex].bookmarks.length; // Add to the end
    } else {
      // Dropped on another bookmark
      for (let i = 0; i < bookmarkGroups.length; i++) {
        const bookmarkIndex = bookmarkGroups[i].bookmarks.findIndex((bm) => bm.id === over.id);
        if (bookmarkIndex !== -1) {
          destination.groupIndex = i;
          destination.bookmarkIndex = bookmarkIndex;
          break;
        }
      }
    }

    // If we couldn't find a valid source or destination, bail out
    if (source.groupIndex === -1 || destination.groupIndex === -1) {
      return;
    }

    // If dragging within the same group, reorder bookmarks
    if (source.groupIndex === destination.groupIndex) {
      reorderBookmarks(source.bookmarkIndex, destination.bookmarkIndex, source.groupIndex);
    } else {
      // If dragging to a different group, move the bookmark
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
  );
};

export default DraggableGrid;