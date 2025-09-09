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

  // external control for title editing (active group only)
  isTitleEditing,
  titleInputRef,
  onCommitTitle,
  onCancelTitleEdit,

  // inline add-link control
  autoAddLink = false,
  addLinkInputRef,
  onAddLinkDone,
  // when true, we're in onboarding (use constants + allow clipboard)
  autofillFromClipboard = false,
}) => {
  const {
    attributes,          // put ARIA/tabIndex on container
    listeners,           // put on drag handle only
    setNodeRef,
    setActivatorNodeRef,
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

  const bookmarks = Array.isArray(bookmarkGroup.bookmarks) ? bookmarkGroup.bookmarks : [];
  const bookmarkIds = bookmarks.map((b) => b.id);

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bookmark-group-box"
      {...attributes}  // safe here; do NOT add listeners on the container
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        className="group-drag-handle"
        aria-label="Drag group"
        title="Drag group"
        onPointerDown={stopPropagation}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="opacity-60">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
        </svg>
      </button>

      {/* Delete */}
      {headingIsEntered && (
        <button
          className="delete-bookmark-group-button"
          onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)}
          onPointerDown={stopPropagation}
        >
          <img src="./assets/delete-icon.svg" alt="Delete group" />
        </button>
      )}

      {/* Header */}
      <div onPointerDown={stopPropagation} className="bookmark-group-header">
        <EditableBookmarkGroupHeading
          bookmarkGroup={bookmarkGroup}
          groupIndex={groupIndex}
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
            autoFocus={autoAddLink}
            inputRef={addLinkInputRef}
            onDone={onAddLinkDone}

            /* Only during onboarding: pass constant prefills
               (explicit prefills take precedence over clipboard inside the component) */
            prefillName={autofillFromClipboard ? ONBOARDING_BOOKMARK_NAME_PREFILL : undefined}
            prefillUrl={autofillFromClipboard ? ONBOARDING_BOOKMARK_URL_PREFILL : undefined}
            autofillFromClipboard={autofillFromClipboard}
          />
        )}
      </div>
    </div>
  );
};
