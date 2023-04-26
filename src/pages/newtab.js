import React, { useState, useEffect, useRef, useContext } from 'react';
import ReactDOM from 'react-dom';

import '../styles/newtab.css';
import {
  STORAGE_KEY_BOOKMARK_GROUPS,
} from "../scripts/constants.js";
import {
  createUniqueID,
  constructValidURL,
} from "../scripts/utilities.js";
import {
  loadBookmarkGroups,
  deleteBookmark,
  editBookmarkName,
  overwriteBookmarkGroupsToStorage,
  saveBookmark,
  clearBookmarkGroups,
} from "../scripts/bookmark_management.js";
import { AppContextProvider, AppContext } from '../scripts/AppContext';


import editIcon from '../../public/assets/edit-icon.svg';
import deleteIcon from '../../public/assets/delete-icon.svg';

const ADD_LINK_BUTTON_ID_PREFIX = "add-link-button";
const BOOKMARK_GROUP_TITLE_PREFIX = "bookmark-group-box-title";

const ModifyButtonType = Object.freeze({
  EDIT: "edit",
  DELETE: "delete",
});


function NewTabUI() {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);

  const getFaviconUrl = (bookmarkUrl) => {
    return `https://www.google.com/s2/favicons?sz=16&domain=${bookmarkUrl}`;
  };

  function handleBookmarkGroupHeaderBlur(event, index) {
    const newGroupName = event.target.textContent.trim();
    if (newGroupName !== bookmarkGroups[index].groupName) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[index].groupName = newGroupName;
      setBookmarkGroups(updatedGroups);
      overwriteBookmarkGroupsToStorage(updatedGroups);
    }
  }

  function handleAddBookmarkSubmit(event, index) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements['bookmark-name'].value;
    const url = constructValidURL(form.elements['bookmark-url'].value);
    saveBookmark(name, url, bookmarkGroups[index].groupName, /*should refresh */ true);
    form.reset();
    const groups = loadBookmarkGroups();
    setBookmarkGroups(groups);
  }


  const handleLinkEditBlur = (bookmark, groupName, event) => {
    const newBookmarkName = event.target.textContent.trim();
    if (newBookmarkName !== bookmark.name) {
      editBookmarkName(bookmark.name, groupName, newBookmarkName);
    }
  };

  const handleNewLinkButtonClick = (groupName) => {
    // TODO: Implement the adding of a new bookmark link.
  };

  return (
    <div className="bookmark-groups-container">
      {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
        <div key={createUniqueID()} className="bookmark-group-box">
          <h2 
            id={BOOKMARK_GROUP_TITLE_PREFIX + '-' + bookmarkGroup.groupName}
            className={BOOKMARK_GROUP_TITLE_PREFIX}
            contentEditable={true}
          >
            {bookmarkGroup.groupName}
          </h2>

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


function EditableBookmark(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [text, setText] = useState(props.bookmark.name);
  const [url, setUrl] = useState(props.bookmark.url);

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
        overwriteBookmarkGroupsToStorage(updatedGroups, /* shouldRefresh */ false);
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
      overwriteBookmarkGroupsToStorage(updatedGroups, /* shouldRefresh */ false);
    }
  }

  const aRef = useRef(null);
  return (
    <div key={createUniqueID()} className="bookmark-container">
      <img
        className="favicon"
        src={`https://www.google.com/s2/favicons?sz=16&domain=${props.bookmark.url}`}
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