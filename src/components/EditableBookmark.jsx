import React, { useState, useRef, useContext } from 'react';

/* CSS styles */
import '../styles/Index.css';

/* Hooks and Utilities */
import { useBookmarkManager } from '../scripts/useBookmarkManager.js';
import { AppContext } from '../scripts/AppContext.jsx';
import { createUniqueID } from "../scripts/Utilities.js";


function EditableBookmark(props) {
  // Consume state from the context 
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);

  // Get all actions from the custom bookmarks hook
  const { 
    deleteBookmark,
    editBookmarkName, 
  } = useBookmarkManager();  
  
  const [text, setText] = useState(props.bookmark.name);
  const [url, setUrl] = useState(props.bookmark.url);

  const getFaviconUrl = (bookmarkUrl) => {
    return `https://www.google.com/s2/favicons?sz=16&domain=${bookmarkUrl}`;
  };

  function handleBookmarkNameEdit(event, groupIndex, bookmarkIndex, aRef) {
    // Make the <a> element's content editable
    let aElement = aRef.current;
    aElement.setAttribute('contenteditable', 'true'); 
    aElement.focus();
    
    // Select all text in the <a> element
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(aElement);
    selection.removeAllRanges();
    selection.addRange(range);

    // Listen for "keydown - Enter" and "blur" events on the link element
    aElement.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') { 
        event.preventDefault(); 
        aElement.blur(); // Remove focus from the linkElement to trigger the blur function
      }
    });
    aElement.addEventListener('blur', async (event) => {
      const newBookmarkName = event.target.textContent.trim();
      setText(newBookmarkName);
      await editBookmarkName(groupIndex, bookmarkIndex, newBookmarkName);
      aElement.setAttribute('contenteditable', 'false'); 
    });
  }

  async function handleBookmarkDelete(event, groupIndex, bookmarkIndex) {
    const bookmarkGroup = bookmarkGroups[groupIndex];
    const bookmark = bookmarkGroup.bookmarks[bookmarkIndex];
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the " + bookmark.name + " bookmark from " + bookmarkGroup.groupName + "?"
    ); 
    if (shouldDelete) {
      await deleteBookmark(bookmarkIndex, groupIndex);
    }
  }

  const aRef = useRef(null);
  return (
    <div key={createUniqueID()} className="bookmark-container">
      <img
        className="favicon"
        src={getFaviconUrl(props.bookmark.url)}
        alt={`${props.bookmark.name} favicon`} 
      />
      
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        ref={aRef}
      >
        {text}
      </a>

      <ModifyBookmarkButton 
        imagePath="assets/edit-icon.svg" 
        onClick={(event) => handleBookmarkNameEdit(event, props.groupIndex, props.bookmarkIndex, aRef)} 
        aria-label="Edit bookmark"
      />
      <ModifyBookmarkButton 
        imagePath="assets/delete-icon.svg" 
        onClick={(event) => handleBookmarkDelete(event, props.groupIndex, props.bookmarkIndex)}  
        aria-label="Delete bookmark"
      />
      
    </div>
  );
}

function ModifyBookmarkButton(props) {
  return (
    <button 
      className='modify-link-button' 
      onClick={props.onClick}
      aria-label={props['aria-label']}
    >
      <img src={props.imagePath} className='modify-link-button-img'/>
    </button>
  );
}

export { EditableBookmark };