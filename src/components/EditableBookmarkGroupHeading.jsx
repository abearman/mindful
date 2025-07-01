import React, { useState, useContext } from 'react';

/* CSS styles */
import '../styles/EditableBookmarkGroupHeading.css'

/* Bookmark Storage */
import {
  editBookmarkGroupHeading,
} from "../scripts/BookmarkManagement.js";
import { AppContext } from '../scripts/AppContext.jsx';


function EditableBookmarkGroupHeading(props) {
  const [text, setText] = useState(props.bookmarkGroup.groupName);
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);

  async function handleBlur(event) {
    setText(event.target.textContent.trim());

    const bookmarkGroupIndex = props.groupIndex;
    const newGroupName = event.target.textContent.trim();
    await editBookmarkGroupHeading(bookmarkGroupIndex, newGroupName, setBookmarkGroups);
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