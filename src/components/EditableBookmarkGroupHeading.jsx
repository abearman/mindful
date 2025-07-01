import React, { useState, useContext } from 'react';

/* CSS styles */
import '../styles/EditableBookmarkGroupHeading.css'

/* Bookmark Storage */
import {
  overwriteBookmarkGroupsToStorage,
} from "../scripts/BookmarkManagement.js";
import { AppContext } from '../scripts/AppContext.jsx';


function EditableBookmarkGroupHeading(props) {
  const [text, setText] = useState(props.bookmarkGroup.groupName);
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);

  async function handleBlur(event) {
    setText(event.target.textContent.trim());

    const newGroupName = event.target.textContent.trim();
    if (newGroupName !== props.bookmarkGroup.groupName) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[props.groupIndex].groupName = newGroupName;
      setBookmarkGroups(updatedGroups);
      await overwriteBookmarkGroupsToStorage(bookmarkGroups, setBookmarkGroups);      
    }
  }

  return (
    <h2 
      contentEditable 
      onBlur={handleBlur} 
      className="editable-heading"
      suppressContentEditableWarning={true}
    >
      {text}
    </h2>
  );
}

export { EditableBookmarkGroupHeading };