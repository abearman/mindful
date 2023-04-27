import React, { useState, useEffect, useRef, useContext } from 'react';
import ReactDOM from 'react-dom';

import '../styles/NewTab.css';
import {
  createUniqueID,
  constructValidURL,
} from "../scripts/Utilities.js";
import {
  loadBookmarkGroups,
  overwriteBookmarkGroupsToStorage,
  saveBookmark,
} from "../scripts/BookmarkManagement.js";
import { AppContextProvider, AppContext } from '../scripts/AppContext';


const ModifyButtonType = Object.freeze({
  EDIT: "edit",
  DELETE: "delete",
});


function NewTabUI() {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);

  function handleAddBookmarkSubmit(event, index) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements['bookmark-name'].value;
    const url = constructValidURL(form.elements['bookmark-url'].value);
    saveBookmark(name, url, bookmarkGroups[index].groupName); 
    form.reset();
    const groups = loadBookmarkGroups();
    setBookmarkGroups(groups);
  }

  const handleNewLinkButtonClick = (groupName) => {
    // TODO: Implement the adding of a new bookmark link.
  };

  return (
    <div className="bookmark-groups-container">
      {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
        <div key={createUniqueID()} className="bookmark-group-box">
          <EditableBookmarkGroupHeading key={createUniqueID} bookmarkGroup={bookmarkGroup} groupIndex={groupIndex}/>

          <div className="bookmark-list">
            {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
              <EditableBookmark key={createUniqueID()} bookmark={bookmark} bookmarkIndex={bookmarkIndex} groupIndex={groupIndex} />
            ))}
          </div>

        </div>
      ))}
    </div>
  );
}


function EditableBookmarkGroupHeading(props) {
  const [text, setText] = useState(props.bookmarkGroup.groupName);
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);

  function handleBlur(event) {
    setText(event.target.textContent.trim());

    const newGroupName = event.target.textContent.trim();
    if (newGroupName !== props.bookmarkGroup.groupName) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[props.groupIndex].groupName = newGroupName;
      setBookmarkGroups(updatedGroups);
      overwriteBookmarkGroupsToStorage(bookmarkGroups);      
    }
  }

  return (
    <h2 contentEditable onBlur={handleBlur} className="bookmark-group-box-title">
      {text}
    </h2>
  );
}


function EditableBookmark(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
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
    aElement.addEventListener('blur', (event) => {
      const bookmarkGroup = bookmarkGroups[groupIndex];
      const bookmark = bookmarkGroup.bookmarks[bookmarkIndex];
      const newBookmarkName = event.target.textContent.trim();
      if (newBookmarkName !== bookmark.name) {
        const updatedGroups = [...bookmarkGroups];
        updatedGroups[groupIndex].bookmarks[bookmarkIndex].name = newBookmarkName;
        setBookmarkGroups(updatedGroups);
        overwriteBookmarkGroupsToStorage(updatedGroups); 
      }
      aElement.setAttribute('contenteditable', 'false'); 
    });
  }

  function handleBookmarkDelete(event, groupIndex, bookmarkIndex) {
    const bookmarkGroup = bookmarkGroups[groupIndex];
    const bookmark = bookmarkGroup.bookmarks[bookmarkIndex];
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the " + bookmark.name + " bookmark from " + bookmarkGroup.groupName + "?"
    ); 
    if (shouldDelete) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[groupIndex].bookmarks.splice(bookmarkIndex, 1);
      setBookmarkGroups(updatedGroups);
      overwriteBookmarkGroupsToStorage(updatedGroups); 
    }
  }

  const aRef = useRef(null);
  return (
    <div key={createUniqueID()} className="bookmark-container">
      <img
        className="favicon"
        src={getFaviconUrl(props.bookmark.url)}
        alt=""
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
      />
      <ModifyBookmarkButton 
        imagePath="assets/delete-icon.svg" 
        onClick={(event) => handleBookmarkDelete(event, props.groupIndex, props.bookmarkIndex)}  
      />
      
    </div>
  );
}

function ModifyBookmarkButton(props) {
  return (
    <button className='modify-link-button' onClick={props.onClick}>
      <img src={props.imagePath} className='modify-link-button-img'/>
    </button>
  );
}


ReactDOM.render(
  <AppContextProvider>
    <NewTabUI />
  </AppContextProvider>,
  document.getElementById('root')
);