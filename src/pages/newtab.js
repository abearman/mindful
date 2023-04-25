import React, { useState, useEffect } from 'react';
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
  overwriteBookmarkGroups,
  saveBookmark,
  clearBookmarkGroups,
} from "../scripts/bookmark_management.js";

import editIcon from '../../public/assets/edit-icon.svg';
import deleteIcon from '../../public/assets/delete-icon.svg';

const ADD_LINK_BUTTON_ID_PREFIX = "add-link-button";
const BOOKMARK_GROUP_TITLE_PREFIX = "bookmark-group-box-title";

const ModifyButtonType = Object.freeze({
  EDIT: "edit",
  DELETE: "delete",
});


function NewTabUI() {
  const [bookmarkGroups, setBookmarkGroups] = useState([]);

  useEffect(() => {
    let groups = loadBookmarkGroups();
    if (groups !== null) {
      setBookmarkGroups(groups);
    } else {
      // TODO: Decide what to render for the landing page if there are no saved bookmarks
    }
  }, []);

  const getFaviconUrl = (bookmarkUrl) => {
    return `https://www.google.com/s2/favicons?sz=16&domain=${bookmarkUrl}`;
  };

  function handleBookmarkGroupHeaderBlur(event, index) {
    const newGroupName = event.target.textContent.trim();
    if (newGroupName !== bookmarkGroups[index].groupName) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[index].groupName = newGroupName;
      setBookmarkGroups(updatedGroups);
      overwriteBookmarkGroups(updatedGroups);
    }
  }

  function handleBookmarkNameEdit(event, index, bookmarkIndex) {
    const newBookmarkName = event.target.textContent.trim();
    const bookmarkGroup = bookmarkGroups[index];
    const bookmark = bookmarkGroup.bookmarks[bookmarkIndex];
    if (newBookmarkName !== bookmark.name) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[index].bookmarks[bookmarkIndex].name = newBookmarkName;
      setBookmarkGroups(updatedGroups);
      editBookmarkName(bookmark.name, bookmarkGroup.groupName, newBookmarkName);
    }
  }

  function handleBookmarkDelete(index, bookmarkIndex) {
    const bookmarkGroup = bookmarkGroups[index];
    const bookmark = bookmarkGroup.bookmarks[bookmarkIndex];
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the " + bookmark.name + " bookmark from " + bookmarkGroup.groupName + "?"
    ); 
    if (shouldDelete) {
      const updatedGroups = [...bookmarkGroups];
      updatedGroups[index].bookmarks.splice(bookmarkIndex, 1);
      setBookmarkGroups(updatedGroups);
      deleteBookmark(bookmark.name, bookmarkGroup.groupName);
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

  const handleModifyButtonClick = (buttonType, bookmark, groupName) => {
    if (buttonType === ModifyButtonType.EDIT) {
      // TODO: Implement the editing of the bookmark name.
    } else if (buttonType === ModifyButtonType.DELETE) {
      const shouldDelete = window.confirm(
        `Are you sure you want to delete the ${bookmark.name} bookmark from ${groupName}?`
      );
      if (shouldDelete) {
        deleteBookmark(bookmark.name, groupName);
      }
    }
  };

  const handleNewLinkButtonClick = (groupName) => {
    // TODO: Implement the adding of a new bookmark link.
  };

  return (
    <div id="bookmark-groups-container">
      {bookmarkGroups.map((bookmarkGroup, index) => (
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
              <div key={createUniqueID()} className="bookmark-container">
                <img
                  className="favicon"
                  src={`https://www.google.com/s2/favicons?sz=16&domain=${bookmark.url}`}
                  alt=""
                />
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onBlur={(event) => handleBookmarkNameEdit(event, index, bookmarkIndex)}
                >
                  {bookmark.name}
                </a>

                <ModifyBookmarkButton buttonType={ModifyButtonType.DELETE}/>
                
              </div>
            ))}
          </div>

        </div>
      ))}
    </div>
  );
}


function ModifyBookmarkButton(props) {
  console.log("Button type: " + props.buttonType);
  const imagePath = props.buttonType == ModifyButtonType.EDIT ? "assets/edit-icon.svg" : "assets/delete-icon.svg";
  return (
    <button className='modify-link-button'>
      <img src={imagePath} className='modify-link-button-img'/>
    </button>
  );
}


ReactDOM.render(<NewTabUI />, document.getElementById('root'));