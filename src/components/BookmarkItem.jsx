// components/BookmarkItem.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EditableBookmark } from '@/components/EditableBookmark';

export const BookmarkItem = ({ bookmark, bookmarkIndex, groupIndex }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,  // Hide the original component when it's being dragged
  };

  // The outer div handles all the drag-and-drop logic
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EditableBookmark
        bookmark={bookmark}
        bookmarkIndex={bookmarkIndex}
        groupIndex={groupIndex}
      />
    </div>
  );
};