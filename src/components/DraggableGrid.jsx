// components/DraggableGrid.jsx
import React, {
  useContext,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
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

const DraggableGrid = forwardRef(function DraggableGrid(_, ref) {
  const { bookmarkGroups } = useContext(AppContext);

  const [activeItem, setActiveItem] = useState(null);

  // Which group title is in edit mode?
  const [editingGroupId, setEditingGroupId] = useState(null);

  // Which group should auto-open AddBookmarkInline?
  const [addingToGroupId, setAddingToGroupId] = useState(null);

  // Refs to contentEditable <h2> nodes for titles
  const titleInputRefs = useRef(new Map()); // Map<string, HTMLElement>

  // Refs to the inline "add link" input (URL or Name field)
  const addInputRefs = useRef(new Map()); // Map<string, HTMLInputElement | HTMLElement>

  const {
    deleteBookmarkGroup,
    reorderBookmarkGroups,
    reorderBookmarks,
    moveBookmark,
    addEmptyBookmarkGroup,
    editBookmarkGroupHeading,
  } = useBookmarkManager();

  // Keep a live pointer to groups to avoid stale closures inside imperative calls
  const groupsRef = useRef(bookmarkGroups);
  useEffect(() => {
    groupsRef.current = bookmarkGroups;
  }, [bookmarkGroups]);

  // Imperative API: ensure placeholder exists, enter rename mode, focus/select
  useImperativeHandle(ref, () => ({
    async startCreateGroup({ prefill, select = "all" } = {}) {
      // 1) find/create placeholder
      let placeholder = (groupsRef.current || []).find(
        (g) => g.groupName === EMPTY_GROUP_IDENTIFIER
      );
      if (!placeholder) {
        const created = await addEmptyBookmarkGroup();
        // Let state flush, then recheck from context (created may be undefined)
        await Promise.resolve();
        placeholder =
          (groupsRef.current || []).find(
            (g) => g.groupName === EMPTY_GROUP_IDENTIFIER
          ) || created || null;
      }
      if (!placeholder) return;

      // 2) switch that card into edit mode
      const id = String(placeholder.id ?? placeholder._id ?? placeholder.uuid ?? "");
      if (!id) return;
      setEditingGroupId(id);

      // 3) after mount, focus + (optionally) prefill + set selection
      setTimeout(() => {
        const el = titleInputRefs.current.get(id); // this is the <h2 contentEditable>
        if (!el) return;

        el.focus?.();

        if (prefill !== undefined) {
          el.textContent = prefill;
          el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        }

        const sel = window.getSelection?.();
        if (!sel) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        if (select === "end") range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    },
  }));

  // Safety focus when editingGroupId flips true (covers user click path)
  useLayoutEffect(() => {
    if (!editingGroupId) return;
    const tryFocus = () => {
      const el = titleInputRefs.current.get(String(editingGroupId));
      if (el) {
        el.focus?.();
        return true;
      }
      return false;
    };
    if (tryFocus()) return;
    const t = setTimeout(tryFocus, 0);
    return () => clearTimeout(t);
  }, [editingGroupId, bookmarkGroups]);

  // Detect placeholder → named transition to auto-open AddBookmarkInline
  const prevNamesRef = useRef(new Map());
  useEffect(() => {
    const prev = prevNamesRef.current;
    let promotedId = null;

    (bookmarkGroups || []).forEach((g) => {
      const prevName = prev.get(g.id);
      const nowName = g.groupName;
      if (
        prevName === EMPTY_GROUP_IDENTIFIER &&
        nowName &&
        nowName !== EMPTY_GROUP_IDENTIFIER
      ) {
        promotedId = String(g.id);
      }
    });

    // snapshot current
    const next = new Map();
    (bookmarkGroups || []).forEach((g) => next.set(g.id, g.groupName));
    prevNamesRef.current = next;

    if (promotedId) setAddingToGroupId(promotedId);
  }, [bookmarkGroups]);

  // Focus the inline Add link input when addingToGroupId is set
  useLayoutEffect(() => {
    if (!addingToGroupId) return;
    const el = addInputRefs.current.get(String(addingToGroupId));
    if (!el) return;
    el.focus?.();
    el.select?.(); // only works for <input>
  }, [addingToGroupId]);

  // DnD sensors
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

    const isDraggingGroup = bookmarkGroups.some((g) => g.id === active.id);

    // Reorder groups
    if (isDraggingGroup) {
      const src = bookmarkGroups.findIndex((g) => g.id === active.id);
      const dst = bookmarkGroups.findIndex((g) => g.id === over.id);
      if (src !== -1 && dst !== -1) reorderBookmarkGroups(src, dst);
      return;
    }

    // Move a bookmark
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
      destination.bookmarkIndex =
        bookmarkGroups[destination.groupIndex].bookmarks.length;
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
            const isEditing = String(editingGroupId) === String(bookmarkGroup.id);
            const autoAdd = String(addingToGroupId) === String(bookmarkGroup.id);
            const idKey = String(bookmarkGroup.id);

            return (
              <BookmarkGroup
                key={bookmarkGroup.id}
                bookmarkGroup={bookmarkGroup}
                groupIndex={groupIndex}
                handleDeleteBookmarkGroup={handleDeleteBookmarkGroup}
                // Only pass title-editing props for the active group
                {...(isEditing
                  ? {
                      isTitleEditing: true,
                      titleInputRef: (el) => {
                        if (el) titleInputRefs.current.set(idKey, el);
                        else titleInputRefs.current.delete(idKey);
                      },
                      onCommitTitle: async (newName) => {
                        if (
                          newName &&
                          newName !== bookmarkGroup.groupName
                        ) {
                          await editBookmarkGroupHeading(groupIndex, newName);
                        }
                        setEditingGroupId(null);
                      },
                      onCancelTitleEdit: () => setEditingGroupId(null),
                    }
                  : {
                      // For non-active groups, ensure we clear any stale ref
                      titleInputRef: (el) => {
                        if (!el) titleInputRefs.current.delete(idKey);
                      },
                    })}
                // Auto open + focus AddBookmarkInline after naming
                autoAddLink={autoAdd}
                addLinkInputRef={(el) => {
                  if (el) addInputRefs.current.set(idKey, el);
                  else addInputRefs.current.delete(idKey);
                }}
                onAddLinkDone={() => setAddingToGroupId(null)}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay className="drag-overlay-item">
        {activeItem ? (
          activeItem.isBookmark ? (
            <BookmarkItem bookmark={activeItem} />
          ) : (
            // In overlay, never show the inline editor
            <BookmarkGroup
              bookmarkGroup={activeItem}
              groupIndex={activeItem.groupIndex}
              isTitleEditing={false}
            />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

export default DraggableGrid;
