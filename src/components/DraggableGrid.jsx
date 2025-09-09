import React, {
  useContext, useState, useRef, forwardRef,
  useImperativeHandle, useLayoutEffect
} from "react";
import {
  DndContext,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

import { BookmarkGroup } from "@/components/BookmarkGroup";
import { BookmarkItem } from "@/components/BookmarkItem";
import { AppContext } from "@/scripts/AppContextProvider";
import { useBookmarkManager } from "@/scripts/useBookmarkManager";
import { EMPTY_GROUP_IDENTIFIER } from "@/scripts/Constants";

// ⬇️ Make the component ref-forwardable so NewTabPage can call methods on it.
const DraggableGrid = forwardRef(function DraggableGrid(_, ref) {
  const { bookmarkGroups } = useContext(AppContext);

  const [activeItem, setActiveItem] = useState(null);

  // ⬇️ New: track which group should show a title <input>
  const [editingGroupId, setEditingGroupId] = useState(null);

  // ⬇️ Keep refs to each title input so we can focus/select them
  const titleInputRefs = useRef(new Map()); // Map<string, HTMLInputElement> 

  const {
    deleteBookmarkGroup,
    reorderBookmarkGroups,
    reorderBookmarks,
    moveBookmark,
    addEmptyBookmarkGroup,   // ⬅️ make sure your hook exports this
    editBookmarkGroupHeading,             // ⬅️ and this too
  } = useBookmarkManager();

  // ⬇️ Imperative method that: ensures +Add group exists, switches it to edit, selects text
  useImperativeHandle(ref, () => ({
    async startCreateGroup({ prefill, select = 'all' } = {}) {
      // Find the placeholder group or create it
      let target = bookmarkGroups?.find(
        (g) => g.groupName === EMPTY_GROUP_IDENTIFIER
      );
      if (!target) {
        // If your hook returns the created group, great; otherwise this will
        // re-render and we can find it next render.
        const created = await addEmptyBookmarkGroup();
        target = created || null;
      }
      
      const id = String(target.id);
      setEditingGroupId(id);
  
      // After it mounts, focus + set text + position caret/selection
      setTimeout(() => {
        const el = titleInputRefs.current.get(id);
        if (!el) return;
  
        el.focus();
  
        // If caller provided text, update contentEditable and notify React via input event
        if (prefill !== undefined) {
          el.textContent = prefill;
          // trigger your onInput handler (keeps placeholder class in sync)
          el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
  
        // Select behavior
        const sel = window.getSelection?.();
        if (!sel) return;
        const range = document.createRange();
        if (select === 'end') {
          range.selectNodeContents(el);
          range.collapse(false);              // caret at end
        } else { // 'all'
          range.selectNodeContents(el);       // highlight all
        }
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    }
  }));

  // Focus/select once the input is actually mounted
  useLayoutEffect(() => {
    if (!editingGroupId) return;

    const tryFocus = () => {
      const el = titleInputRefs.current.get(String(editingGroupId));
      if (el) { 
        el.focus();
        return true; 
      }
      return false;
    };

    if (tryFocus()) return;

    // Fallback: next tick (covers StrictMode / async add)
    const t = setTimeout(tryFocus, 0);
    return () => clearTimeout(t);
  }, [editingGroupId, bookmarkGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event) {
    const { id } = event.active;
    let currentItem = null;

    const groupIndex = bookmarkGroups.findIndex((g) => g.id === id);
    if (groupIndex > -1) {
      currentItem = { ...bookmarkGroups[groupIndex], groupIndex };
    } else {
      for (let i = 0; i < bookmarkGroups.length; i++) {
        const bookmark = bookmarkGroups[i].bookmarks.find((bm) => bm.id === id);
        if (bookmark) {
          currentItem = { ...bookmark, isBookmark: true };
          break;
        }
      }
    }
    setActiveItem(currentItem);
  }

  async function handleDragEnd(event) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isDraggingGroup = bookmarkGroups.some((group) => group.id === active.id);

    // Scenario 1: Reordering groups
    if (isDraggingGroup) {
      const src = bookmarkGroups.findIndex((g) => g.id === active.id);
      const dst = bookmarkGroups.findIndex((g) => g.id === over.id);
      if (src !== -1 && dst !== -1) reorderBookmarkGroups(src, dst);
      return;
    }

    // Scenario 2: Moving a bookmark
    const source = { groupIndex: -1, bookmarkIndex: -1 };
    const destination = { groupIndex: -1, bookmarkIndex: -1 };

    for (let i = 0; i < bookmarkGroups.length; i++) {
      const idx = bookmarkGroups[i].bookmarks.findIndex((bm) => bm.id === active.id);
      if (idx !== -1) {
        source.groupIndex = i;
        source.bookmarkIndex = idx;
        break;
      }
    }

    const overIsGroupContainer = bookmarkGroups.some((g) => g.id === over.id);
    if (overIsGroupContainer) {
      destination.groupIndex = bookmarkGroups.findIndex((g) => g.id === over.id);
      destination.bookmarkIndex = bookmarkGroups[destination.groupIndex].bookmarks.length;
    } else {
      for (let i = 0; i < bookmarkGroups.length; i++) {
        const idx = bookmarkGroups[i].bookmarks.findIndex((bm) => bm.id === over.id);
        if (idx !== -1) {
          destination.groupIndex = i;
          destination.bookmarkIndex = idx;
          break;
        }
      }
    }

    if (source.groupIndex === -1 || destination.groupIndex === -1) return;

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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveItem(null)}
    >
      <SortableContext
        items={bookmarkGroups.map((g) => g.id)}
        strategy={rectSortingStrategy}
      >
        <div className="bookmark-groups-container">
        {bookmarkGroups.map((bookmarkGroup, groupIndex) => {
          const editing = String(editingGroupId) === String(bookmarkGroup.id);
          return (
            <BookmarkGroup
              key={bookmarkGroup.id}
              bookmarkGroup={bookmarkGroup}
              groupIndex={groupIndex}
              handleDeleteBookmarkGroup={handleDeleteBookmarkGroup}
              {...(editing ? {
                isTitleEditing: true,
                titleInputRef: (el) => {
                  const key = String(bookmarkGroup.id);
                  if (el) titleInputRefs.current.set(key, el);
                  else titleInputRefs.current.delete(key);
                },
                onCommitTitle: (newName) => {
                  if (newName && newName !== bookmarkGroup.groupName) {
                    editBookmarkGroupHeading(bookmarkGroup.id, newName);
                  }
                  setEditingGroupId(null);
                },
                onCancelTitleEdit: () => setEditingGroupId(null),
              } : {})}
            />
          );
        })} 
        </div>
      </SortableContext>

      <DragOverlay className="drag-overlay-item">
        {activeItem
          ? (activeItem.isBookmark
              ? <BookmarkItem bookmark={activeItem} />
              : <BookmarkGroup bookmarkGroup={activeItem} groupIndex={activeItem.groupIndex} isTitleEditing={false} />)
          : null}
      </DragOverlay>
    </DndContext>
  );
});

export default DraggableGrid;
