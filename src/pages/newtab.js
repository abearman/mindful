import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import {
  STORAGE_KEY_BOOKMARK_GROUPS,
} from "./constants.js";
import {
  createUniqueID,
  constructValidURL,
} from "./utilities.js";
import {
  loadBookmarkGroups,
  deleteBookmark,
  editBookmarkName,
  overwriteBookmarkGroups,
  saveBookmark,
} from "./bookmark_management.js";

const ADD_LINK_BUTTON_ID_PREFIX = "add-link-button";
const BOOKMARK_GROUP_TITLE_PREFIX = "bookmark-group-box-title";

const ModifyButtonType = Object.freeze({
  EDIT: "edit",
  DELETE: "delete",
});

function NewTab() {
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

  const handleGroupTitleBlur = (bookmarkGroup, event) => {
    const newGroupName = event.target.textContent.trim();
    if (newGroupName !== bookmarkGroup.groupName) {
      bookmarkGroup.groupName = newGroupName;
      overwriteBookmarkGroups(bookmarkGroups);
    }
  };

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
      {bookmarkGroups.map((bookmarkGroup) => (
        <div
          key={createUniqueID()}
          className="bookmark-group-box"
        >
          <h2
            className={BOOKMARK_GROUP_TITLE_PREFIX}
            contentEditable
            onBlur={(event) =>
              handleGroupTitleBlur(bookmarkGroup, event)
            }
          >
            {bookmarkGroup.groupName}
          </h2>
          <button
            className={ADD_LINK_BUTTON_ID_PREFIX}
            onClick={() => handleNewLinkButtonClick(bookmarkGroup.groupName)}
          >
            + Add Link
          </button>
          {bookmarkGroup.bookmarks.map((bookmark) => (
            <div key={createUniqueID()} className="bookmark-container">
              <img
                className="favicon"
                src={getFaviconUrl(bookmark.url)}
                alt=""
              />
              <a href={bookmark.url}>{bookmark.name}</a>
              <button
                className="modify-link-button"
                onClick={() =>
                  handleModifyButtonClick(
                    ModifyButtonType.EDIT,
                    bookmark,
                    bookmarkGroup.groupName
                  )
                }
              >
                Edit
              </button>
              <button
                className="modify-link-button"
                onClick={() =>
                  handleModifyButtonClick(
                    ModifyButtonType.DELETE,
                    bookmark,
                    bookmarkGroup.groupName
                  )
                }
              >
                Delete
              </button>
            </div>

ReactDOM.render(<NewTab />, document.getElementById('root'));

  // const newLinkButtonClicked = (event, bookmarkGroup) => {
  //   const groupName = bookmarkGroup.groupName;

  //   const popupContainer = document.createElement('div');
  //   popupContainer.setAttribute('id', 'new-link-popup-container');
  //   popupContainer.setAttribute('style', 'display: none; position: absolute;');
  //   popupContainer.innerHTML = `
  //   <button id="close-popup-button">X</button>  
  //   <form id="add-link-button-form">

    


// function newLinkButtonClicked(event) {
//   const buttonId = event.target.id;
//   let addLinkButton = document.getElementById(buttonId);
//   const groupName = buttonId.replace(new RegExp('^' + ADD_LINK_BUTTON_ID_PREFIX + '-'), '');

//   /* Create the HTML of the popup menu */
//   const popupContainer = document.createElement("div");
//   popupContainer.setAttribute("id", "new-link-popup-container");
//   popupContainer.setAttribute("style", "display: none; position: absolute;");
//   popupContainer.innerHTML = `
//     <button id="close-popup-button">X</button>  
//     <form id="add-link-button-form">
//       <label for="bookmark-name">Name</label>
//       <input type="text" id="bookmark-name" name="bookmark-name" required>

//       <label for="bookmark-url">URL</label>
//       <!-- We make the URL be type of text so we can validate its format on our own, and we don't require the user to put https:// in front -->
//       <input type="text" id="bookmark-url" name="bookmark-url" pattern="^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$" required>

//       <button type="submit" class="add-bookmark-button">Add Bookmark</button>
//     </form> 
//   `;
//   const bookmarkGroupsContainer = document.getElementById('bookmark-groups-container');
//   bookmarkGroupsContainer.appendChild(popupContainer);

//   /* Create the close button element on the popup menu */
//   const closeButton = popupContainer.querySelector("#close-popup-button");
//   closeButton.addEventListener("click", function() {
//     popupContainer.style.display = "none";
//   });

//   /* Display the popup menu */
//   popupContainer.style.display = 'block';
//   const rect = addLinkButton.getBoundingClientRect();
//   popupContainer.style.top = rect.bottom + 'px';
//   popupContainer.style.left = rect.left + 'px';

//   /* Handle the popup form submission */
//   const form = document.getElementById('add-link-button-form');
//   form.addEventListener('submit', function(event) {
//     event.preventDefault(); // prevent the form from submitting normally
//     const name = form.elements['bookmark-name'].value;
//     const url = constructValidURL(form.elements['bookmark-url'].value);
//     saveBookmark(name, url, groupName, /*should refresh */ true);
//     form.reset();
//   });

