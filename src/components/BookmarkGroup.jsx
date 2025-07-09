import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem.jsx';
import { EditableBookmarkGroupHeading } from './EditableBookmarkGroupHeading.jsx'; 
import { EditableBookmark } from './EditableBookmark.jsx'; 
import { AddBookmarkInline } from './AddBookmarkInline.jsx'; 
import { EMPTY_GROUP_IDENTIFIER } from '../scripts/Constants.js';

class BookmarkGroup extends React.Component {
  render() {
    const {
      bookmarkGroup,
      groupIndex,
      sensors,
      handleDragEnd,
      handleDeleteBookmarkGroup,
    } = this.props;

    const canShowAddBookmarkInline = bookmarkGroup.groupName && bookmarkGroup.groupName !== EMPTY_GROUP_IDENTIFIER;

    return (
      <SortableItem key={bookmarkGroup.id} id={bookmarkGroup.id}>
        <div className="bookmark-group-box">
          <button
            className="delete-bookmark-group-button"
            onClick={(event) =>
              handleDeleteBookmarkGroup(event, groupIndex)
            }
          >
            <img src="./assets/delete-icon.svg" alt="Delete Group" />
          </button>
          <EditableBookmarkGroupHeading
            key={"heading-" + bookmarkGroup.id}
            bookmarkGroup={bookmarkGroup}
            groupIndex={groupIndex}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={bookmarkGroup.bookmarks.map((bookmark) => bookmark.id)}
              strategy={verticalListSortingStrategy}
            >
              {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
                <SortableItem key={bookmark.id} id={bookmark.id}>
                  <EditableBookmark
                    key={bookmark.id}
                    bookmark={bookmark}
                    bookmarkIndex={bookmarkIndex}
                    groupIndex={groupIndex}
                  />
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
          {canShowAddBookmarkInline && <AddBookmarkInline groupIndex={groupIndex} />}
        </div>
      </SortableItem>
    );
  }
}

export { BookmarkGroup };