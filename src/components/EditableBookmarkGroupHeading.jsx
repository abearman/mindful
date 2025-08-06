import React, { useContext, useState, useRef, useEffect } from 'react';

/* CSS styles */
import '../styles/EditableBookmarkGroupHeading.css';

/* Constants */
import { EMPTY_GROUP_IDENTIFIER } from "../scripts/Constants.js";

/* Hooks and Utilities */
import { useBookmarkManager } from '../scripts/useBookmarkManager';
import { AppContext } from '../scripts/AppContext.jsx';

const NEW_GROUP_NAME = "+ Add a group"; 


function EditableBookmarkGroupHeading(props) {
  // Consume state from the context 
  const { bookmarkGroups, setBookmarkGroups, userId, storageType, setStorageType } = useContext(AppContext);

  // Get all actions from the custom bookmarks hook
  const { 
    editBookmarkGroupHeading,
  } = useBookmarkManager();  

  const { bookmarkGroup, groupIndex } = props;
  
  const hasTitle = bookmarkGroup && bookmarkGroup.groupName && bookmarkGroup.groupName !== EMPTY_GROUP_IDENTIFIER;

  // State to control when the heading is editable
  const [isEditing, setIsEditing] = useState(false);
  // State to track if the content is a placeholder
  const [isPlaceholder, setIsPlaceholder] = useState(!hasTitle);
  const headingRef = useRef(null);

  // Effect to focus the element and select its text when editing starts
  useEffect(() => {
    if (isEditing && headingRef.current) {
      headingRef.current.focus();
    }
  }, [isEditing]);

  // Handle blur to save changes and exit edit mode
  async function handleBlur(event) {
    setIsEditing(false);
    const newGroupName = event.target.textContent.trim();

    if (newGroupName === '') {
      // If the heading is empty, revert to the original name and bookmark identifier
      headingRef.current.textContent = hasTitle ? bookmarkGroup.groupName : NEW_GROUP_NAME;
      bookmarkGroup.groupName = EMPTY_GROUP_IDENTIFIER;
      setIsPlaceholder(!hasTitle);
    } else {
      // Otherwise, save the new heading
      setIsPlaceholder(false);
      await editBookmarkGroupHeading(groupIndex, newGroupName);
    }
  }

  // Handle Enter and Escape keys for better UX
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // prevent creating a new line
      event.target.blur();    // trigger blur to save
    } else if (event.key === 'Escape') {
      // Revert text and placeholder state
      event.target.textContent = hasTitle ? bookmarkGroup.groupName : NEW_GROUP_NAME;
      setIsPlaceholder(!hasTitle);
      setIsEditing(false); // exit edit mode
    }
  }

  // NEW: Handle input to dynamically update placeholder state
  function handleInput(event) {
    // If there's any text content, it's not a placeholder
    setIsPlaceholder(event.target.textContent.trim() === '');
  }
  
  // Conditionally set the onClick handler
  const handleClick = () => {
    // If the current text is the placeholder, clear it for editing
    if (headingRef.current && isPlaceholder) {
      headingRef.current.textContent = '';
    }
    setIsEditing(true);
  };

  return (
    <h2
      ref={headingRef}
      contentEditable={isEditing}
      onBlur={handleBlur}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      onInput={isEditing ? handleInput : undefined} // Add the onInput handler
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      // Use the new state to control the class
      className={`editable-heading ${isPlaceholder ? 'placeholder-text' : ''}`}
      suppressContentEditableWarning={true}
    >
      {hasTitle ? bookmarkGroup.groupName : NEW_GROUP_NAME}
    </h2>
  );
}

export { EditableBookmarkGroupHeading };