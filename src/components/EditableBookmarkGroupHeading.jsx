import React, { useContext, useState, useRef, useEffect } from 'react';

/* CSS styles */
import '../styles/EditableBookmarkGroupHeading.css';

/* Bookmark Storage */
import {
  editBookmarkGroupHeading,
} from "../scripts/BookmarkManagement.js";
import { AppContext } from '../scripts/AppContext.jsx';

function EditableBookmarkGroupHeading(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const bookmarkGroup = bookmarkGroups[props.groupIndex];

  // 1. State to control when the heading is editable
  const [isEditing, setIsEditing] = useState(false);
  const headingRef = useRef(null);

  // 4. Effect to focus the element and select its text when editing starts
  useEffect(() => {
    if (isEditing && headingRef.current) {
      headingRef.current.focus();
      // Select all text for a better user experience
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(headingRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [isEditing]);

  // 3. Handle blur to save changes and exit edit mode
  async function handleBlur(event) {
    setIsEditing(false);
    const newGroupName = event.target.textContent.trim();
    
    if (newGroupName) {
      await editBookmarkGroupHeading(props.groupIndex, newGroupName, setBookmarkGroups);
    } else {
      // If the name is cleared, revert to the original name
      event.target.textContent = bookmarkGroup.groupName;
    }
  }

  // Handle Enter and Escape keys for better UX
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // prevent creating a new line
      event.target.blur();    // trigger blur to save
    } else if (event.key === 'Escape') {
      event.target.textContent = bookmarkGroup.groupName; // revert changes
      setIsEditing(false); // exit edit mode
    }
  }

  return (
    <h2
      ref={headingRef}
      // 2. Make contentEditable conditional on the isEditing state
      contentEditable={isEditing}
      onBlur={handleBlur}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      // 5. This handler enables edit mode on click
      onClick={() => setIsEditing(true)}
      // 6. This stops the click from propagating to dnd-kit's listeners
      onPointerDown={(e) => e.stopPropagation()}
      className="editable-heading"
      suppressContentEditableWarning={true}
    >
      {bookmarkGroup.groupName}
    </h2>
  );
}

export { EditableBookmarkGroupHeading };