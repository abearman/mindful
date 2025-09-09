import React from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookmarkItem } from '@/components/BookmarkItem';
import { EditableBookmarkGroupHeading } from '@/components/EditableBookmarkGroupHeading';
import { AddBookmarkInline } from '@/components/AddBookmarkInline';
import { 
  EMPTY_GROUP_IDENTIFIER,
  ONBOARDING_BOOKMARK_NAME_PREFILL, 
  ONBOARDING_BOOKMARK_URL_PREFILL
} from '@/scripts/Constants';

export const BookmarkGroup = ({
  bookmarkGroup,
  groupIndex,
  handleDeleteBookmarkGroup,

  // optional external control for title editing (only passed for active group)
  isTitleEditing,
  titleInputRef,
  onCommitTitle,
  onCancelTitleEdit,

  // inline add-link control
  autoAddLink = false,
  addLinkInputRef,
  onAddLinkDone,
}) => {
  const {
    attributes,          // 👉 apply these to the DRAGGABLE CONTAINER (ARIA, tabIndex, etc.)
    listeners,           // 👉 apply these ONLY on the HANDLE
    setNodeRef,
    setActivatorNodeRef, // 👉 HANDLE ref
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmarkGroup.id });

  // dnd-kit transforms must stay inline
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const headingIsEntered =
    bookmarkGroup.groupName && bookmarkGroup.groupName !== EMPTY_GROUP_IDENTIFIER;

  const bookmarks = Array.isArray(bookmarkGroup.bookmarks) ? bookmarkGroup.bookmarks : [];
  const bookmarkIds = bookmarks.map((b) => b.id);

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bookmark-group-box"
      // ⚠️ Keep attributes on the container (safe). Do NOT put listeners here.
      {...attributes}
    >
      {/* Drag handle — only this starts dragging */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        className="group-drag-handle"
        aria-label="Drag group"
        title="Drag group"
        onPointerDown={stopPropagation} // don’t bubble into header/content
      >
        {/* a simple 6-dot grip; style via CSS */}
        <svg width="16" height="16" viewBox="0 0 16 16" className="opacity-60">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
        </svg>
      </button>

      {/* Delete button is positioned relative to the group box */}
      {headingIsEntered && (
        <button
          className="delete-bookmark-group-button"
          onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)}
          onPointerDown={stopPropagation}
        >
          <img src="./assets/delete-icon.svg" alt="Delete group" />
        </button>
      )}

      {/* Header — free to handle clicks/contentEditable */}
      <div onPointerDown={stopPropagation} className="bookmark-group-header">
        <EditableBookmarkGroupHeading
          bookmarkGroup={bookmarkGroup}
          groupIndex={groupIndex}
          // external control (only passed for the active group from the Grid)
          isEditing={isTitleEditing}
          inputRef={titleInputRef}
          onCommit={onCommitTitle}
          onCancel={onCancelTitleEdit}
        />
      </div>

      {/* Content */}
      <div onPointerDown={stopPropagation} className="bookmark-group-content">
        <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
          {bookmarks.map((bookmark, bookmarkIndex) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              bookmarkIndex={bookmarkIndex}
              groupIndex={groupIndex}
            />
          ))}
        </SortableContext>

        {/* Inline add link: shown only when the group has a real title */}
        {headingIsEntered && (
          <AddBookmarkInline
            groupIndex={groupIndex}
            autoFocus={autoAddLink}     // Grid toggles this when placeholder → named
            inputRef={addLinkInputRef}  // Grid can also focus/select
            onDone={onAddLinkDone}      // clear auto-add flag after submit/close
            prefillName={ONBOARDING_BOOKMARK_NAME_PREFILL}
            prefillUrl={ONBOARDING_BOOKMARK_URL_PREFILL}
          />
        )}
      </div>
    </div>
  );
};
