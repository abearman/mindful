import React, { useState, useContext } from 'react';

/* CSS styles */
import '../styles/EditableBookmarkGroupHeading.css'

/* Bookmark Storage */
import {
  editBookmarkGroupHeading,
} from "../scripts/BookmarkManagement.js";
import { AppContext } from '../scripts/AppContext.jsx';


function EditableBookmarkGroupHeading(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const bookmarkGroup = bookmarkGroups[props.groupIndex]

  async function handleBlur(event) {
    const newGroupName = event.target.textContent.trim();
    await editBookmarkGroupHeading(props.groupIndex, newGroupName, setBookmarkGroups);
  }

  return (
    <h2 
      contentEditable 
      onBlur={handleBlur} 
      className="editable-heading"
      suppressContentEditableWarning={true}
    >
      {bookmarkGroup.groupName}
    </h2>
  );
}

export { EditableBookmarkGroupHeading };