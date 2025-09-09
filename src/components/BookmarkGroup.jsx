import React from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookmarkItem } from '@/components/BookmarkItem';
import { EditableBookmarkGroupHeading } from '@/components/EditableBookmarkGroupHeading';
import { AddBookmarkInline } from '@/components/AddBookmarkInline';
import { EMPTY_GROUP_IDENTIFIER } from '@/scripts/Constants';

export const BookmarkGroup = ({
  bookmarkGroup,
  groupIndex,
  handleDeleteBookmarkGroup,

  // optional props from DraggableGrid when forcing edit mode
  isTitleEditing,
  titleInputRef,
  onCommitTitle,
  onCancelTitleEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,    // ⬅️ NEW: use a handle for dragging
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmarkGroup.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const headingIsEntered =
    bookmarkGroup.groupName && bookmarkGroup.groupName !== EMPTY_GROUP_IDENTIFIER;

  const bookmarkIds = bookmarkGroup.bookmarks.map((bookmark) => bookmark.id);

  const stopPropagation = (event) => event.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bookmark-group-box"
      // IMPORTANT: do NOT spread {...attributes} {...listeners} here anymore
    >
      {/* Drag handle (only this starts group dragging) */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="group-drag-handle"
        aria-label="Drag group"
        title="Drag group"
        onPointerDown={stopPropagation} // don’t bubble into header/content
      >
        {/* a simple 6-dot grip, or your own icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" className="opacity-60">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
        </svg>
      </button>

      {/* Delete button remains positioned relative to the group box */}
      {headingIsEntered && (
        <button
          className="delete-bookmark-group-button"
          onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)}
          onPointerDown={stopPropagation}
        >
          <img src="./assets/delete-icon.svg" alt="Delete Group" />
        </button>
      )}

      {/* Header — now free to become contentEditable on click */}
      <div onPointerDown={stopPropagation} className="bookmark-group-header">
        <EditableBookmarkGroupHeading
          bookmarkGroup={bookmarkGroup}
          groupIndex={groupIndex}
          // optional external control (only passed for the one active group)
          isEditing={isTitleEditing}
          inputRef={titleInputRef}
          onCommit={onCommitTitle}
          onCancel={onCancelTitleEdit}
        />
      </div>

      {/* Content */}
      <div onPointerDown={stopPropagation} className="bookmark-group-content">
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
