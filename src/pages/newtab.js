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
        <div
          className="bookmark-group-box"
          id={createUniqueID()}
        >
          <h2
            className={BOOKMARK_GROUP_TITLE_PREFIX}
            id={BOOKMARK_GROUP_TITLE_PREFIX + '-' + bookmarkGroup.groupName}
            contentEditable={true}
            onKeyDown={(event) => handleBookmarkNameEdit(event, index)}
            onBlur={(event) => handleBookmarkGroupHeaderBlur(event, index)}
          >
            {bookmarkGroup.groupName}
          </h2>

          <button
            className={ADD_LINK_BUTTON_ID_PREFIX}
            id={ADD_LINK_BUTTON_ID_PREFIX + '-' + bookmarkGroup.groupName}
            onClick={handleNewLinkButtonClick}
          >
            + Add Link
          </button>

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
                  contentEditable={true}
                  onBlur={(event) => handleBookmarkNameEdit(event, index, bookmarkIndex)}
                >
                  {bookmark.name}
                </a>
                <button
                  className="modify-link-button"
                  onClick={() => handleBookmarkDelete(index, bookmarkIndex)}
                >
                  <img
                    className="modify-link-button-img"
                    src="assets/delete-icon.svg"
                    alt="delete"
                  />
                </button>
              </div>
            ))}
          </div>

        </div>
      ))}
    </div>
  );


  // return (
  //   <div id="bookmark-groups-container">
  //     {bookmarkGroups.map(bookmarkGroup => (
  //       <div key={createUniqueID()} className="bookmark-group-box">
          
  //         <h2
  //           className={BOOKMARK_GROUP_TITLE_PREFIX}
  //           id={`${BOOKMARK_GROUP_TITLE_PREFIX}-${bookmarkGroup.groupName}`}
  //           contentEditable={true}
  //           onKeyDown={handleHeaderKeyDown}
  //           onBlur={handleHeaderNameUpdate}
  //         >
  //           {bookmarkGroup.groupName}
  //         </h2>

  //         {bookmarkGroup.bookmarks.map(bookmark => (
  //           <div key={bookmark.name} className="bookmark-container">
  //             <img className="favicon" src={getFaviconUrl(bookmark.url)} alt="" />
  //             <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
  //               {bookmark.name}
  //             </a>
  //             {/* {renderModifyBookmarkButtons(bookmarkContainer, link, ModifyButtonType.EDIT, bookmark.name, bookmarkGroup.groupName)} */}
  //             {/* {renderModifyBookmarkButtons(bookmarkContainer, link, ModifyButtonType.DELETE, bookmark.name, bookmarkGroup.groupName)} */}
  //           </div>
  //         ))}

  //         <NewLinkButton groupName={bookmarkGroup.groupName}/>

  //       </div>
  //     ))}
  //   </div>
  // );
}


function NewLinkButton({ groupName }) {
  const [popupVisible, setPopupVisible] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const togglePopup = () => {
    setPopupVisible((prev) => !prev);
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validUrl = constructValidURL(url);
    saveBookmark(name, validUrl, groupName, true);
    setName('');
    setUrl('');
    setPopupVisible(false);
  };

  return (
    <>
      <button
        className={`${ADD_LINK_BUTTON_ID_PREFIX}-button`}
        onClick={togglePopup}
      >
        + Add Link
      </button>
      {popupVisible && (
        <div
          className="new-link-popup-container"
          style={{ position: 'absolute' }}
        >
          <button onClick={togglePopup}>X</button>
          <form onSubmit={handleSubmit}>
            <label htmlFor="bookmark-name">Name</label>
            <input
              type="text"
              id="bookmark-name"
              name="bookmark-name"
              required
              value={name}
              onChange={handleNameChange}
            />
            <label htmlFor="bookmark-url">URL</label>
            <input
              type="text"
              id="bookmark-url"
              name="bookmark-url"
              required
              value={url}
              onChange={handleUrlChange}
              pattern="^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$"
            />
            <button type="submit" className="add-bookmark-button">
              Add Bookmark
            </button>
          </form>
        </div>
      )}
    </>
  );
}


function ModifyBookmarkButton({ linkElement, buttonType, bookmarkName, groupName, onBookmarkNameChange, onDeleteBookmark }) {
  const buttonImage = buttonType === ModifyButtonType.EDIT ? editIcon : deleteIcon;
  
  function handleEditButtonClick() {
    // Make the link element's content editable
    linkElement.setAttribute('contentEditable', true);
    linkElement.focus();
    document.execCommand('selectAll', false, null);
    
    // Listen for "keydown - Enter" and "blur" events on the link element
    linkElement.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') { 
        event.preventDefault(); 
        linkElement.blur(); // Remove focus from the linkElement to trigger the blur function
      }
    });
    linkElement.addEventListener('blur', (event) => {
      const newBookmarkName = event.target.textContent.trim();
      if (newBookmarkName !== bookmarkName) {
        onBookmarkNameChange(bookmarkName, groupName, newBookmarkName);
      }
      linkElement.setAttribute('contentEditable', false);
    });
  }
  
  function handleDeleteButtonClick() {
    const shouldDelete = window.confirm(`Are you sure you want to delete the ${bookmarkName} bookmark from ${groupName}?`);
    if (shouldDelete) {
      onDeleteBookmark(bookmarkName, groupName);
    }
  }

  return (
    <button className="modify-link-button" onClick={buttonType === ModifyButtonType.EDIT ? handleEditButtonClick : handleDeleteButtonClick}>
      <img className="modify-link-button-img" src={buttonImage} alt={buttonType === ModifyButtonType.EDIT ? "Edit bookmark" : "Delete bookmark"} />
    </button>
  );
}



ReactDOM.render(<NewTabUI />, document.getElementById('root'));


  //         <button
  //           className={ADD_LINK_BUTTON_ID_PREFIX}
  //           onClick={() => handleNewLinkButtonClick(bookmarkGroup.groupName)}
  //         >
  //           + Add Link
  //         </button>
  //         {bookmarkGroup.bookmarks.map((bookmark) => (
  //           <div key={createUniqueID()} className="bookmark-container">
  //             <img
  //               className="favicon"
  //               src={getFaviconUrl(bookmark.url)}
  //               alt=""
  //             />
  //             <a href={bookmark.url}>{bookmark.name}</a>
  //             <button
  //               className="modify-link-button"
  //               onClick={() =>
  //                 handleModifyButtonClick(
  //                   ModifyButtonType.EDIT,
  //                   bookmark,
  //                   bookmarkGroup.groupName
  //                 )
  //               }
  //             >
  //               Edit
  //             </button>
  //             <button
  //               className="modify-link-button"
  //               onClick={() =>
  //                 handleModifyButtonClick(
  //                   ModifyButtonType.DELETE,
  //                   bookmark,
  //                   bookmarkGroup.groupName
  //                 )
  //               }
  //             >
  //               Delete
  //             </button>
  //           </div>


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

