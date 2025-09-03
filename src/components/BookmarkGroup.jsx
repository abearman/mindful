import React from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookmarkItem } from '@/components/BookmarkItem.jsx';
import { EditableBookmarkGroupHeading } from '@/components/EditableBookmarkGroupHeading.jsx';
import { AddBookmarkInline } from '@/components/AddBookmarkInline.jsx';
import { EMPTY_GROUP_IDENTIFIER } from '@/scripts/Constants.js';

export const BookmarkGroup = ({ bookmarkGroup, groupIndex, handleDeleteBookmarkGroup }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, 
  } = useSortable({ id: bookmarkGroup.id });

  // Dynamic styles for dnd-kit animations MUST remain inline
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Hide the original component when it's being dragged
  };

  const headingIsEntered = bookmarkGroup.groupName && bookmarkGroup.groupName !== EMPTY_GROUP_IDENTIFIER;
  const bookmarkIds = bookmarkGroup.bookmarks.map((bookmark) => bookmark.id);

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bookmark-group-box"
      {...attributes}
      {...listeners}
    >
      {/* The delete button is now a direct child of the group box,
          allowing it to be positioned absolutely relative to it. */}
      {headingIsEntered && (
        <button
          className="delete-bookmark-group-button"
          onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)}
          onPointerDown={stopPropagation}
        >
          <img src="./assets/delete-icon.svg" alt="Delete Group" />
        </button>
      )}

      {/* Header Section */}
      <div onPointerDown={stopPropagation} className="bookmark-group-header">
        <EditableBookmarkGroupHeading
          bookmarkGroup={bookmarkGroup}
          groupIndex={groupIndex}
        />
      </div>

      {/* Scrollable Content Section */}
      <div
        onPointerDown={stopPropagation}
        className="bookmark-group-content"
      >
        <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
          {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              bookmarkIndex={bookmarkIndex}
              groupIndex={groupIndex}
            />
          ))}
        </SortableContext>
        {headingIsEntered && <AddBookmarkInline groupIndex={groupIndex} />}
      </div>
    </div>
  );
};
