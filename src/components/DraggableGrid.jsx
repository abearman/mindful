/* components/DraggableGrid.jsx */

import React, { useContext } from "react";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { BookmarkGroup } from './BookmarkGroup';
import { AppContext } from "../scripts/AppContext.jsx";
import { useBookmarkManager } from '../scripts/useBookmarkManager.js';

const DraggableGrid = () => {
  // Consume state from the context 
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);

  // Get all actions from the custom bookmarks hook
  const { 
    deleteBookmarkGroup,
    reorderBookmarkGroups,
    reorderBookmarks,
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
        );
      }
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
  );
};

export default DraggableGrid;