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
  const isPlaceholder = props.groupIndex === -1;

  const bookmarkGroup = isPlaceholder 
    ? { groupName: "New Group" } // Placeholder text
    : bookmarkGroups[props.groupIndex];

  // State to control when the heading is editable
  const [isEditing, setIsEditing] = useState(false);
  const headingRef = useRef(null);

  // Effect to focus the element and select its text when editing starts
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

  // Handle blur to save changes and exit edit mode
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
  
  // Conditionally set the onClick handler
  const handleClick = () => {
    if (!isPlaceholder) {
      setIsEditing(true);
    }
  };

  return (
    <h2
      ref={headingRef}
      // Make contentEditable conditional on the isEditing state and not being a placeholder
      contentEditable={isEditing && !isPlaceholder}
      onBlur={handleBlur}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      // This handler enables edit mode on click, only if it's not a placeholder
      onClick={handleClick}
      // This stops the click from propagating to dnd-kit's listeners
      onPointerDown={(e) => !isPlaceholder && e.stopPropagation()}
      className={`editable-heading ${isPlaceholder ? 'placeholder-text' : ''}`}
      suppressContentEditableWarning={true}
    >
      {bookmarkGroup.groupName}
    </h2>
  );
}

export { EditableBookmarkGroupHeading };