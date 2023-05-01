import React, { useState, useEffect, useRef, useContext } from 'react';
import ReactDOM from 'react-dom';
import Modal from 'react-modal';

import '../styles/NewTab.css';
import {
  createUniqueID,
  constructValidURL,
} from "../scripts/Utilities.js";
import {
  deleteBookmark,
  loadBookmarkGroups,
  overwriteBookmarkGroupsToStorage,
  saveBookmark,
  deleteBookmarkGroup,
} from "../scripts/BookmarkManagement.js";
import { AppContextProvider, AppContext } from '../scripts/AppContext';
import { URL_PATTERN } from '../scripts/Constants.js';

const ModifyButtonType = Object.freeze({
  EDIT: "edit",
  DELETE: "delete",
});

//Binding popup modal for accessibility
Modal.setAppElement('#root');


function NewTabUI() {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);

  function handleDeleteBookmarkGroup(event, groupIndex) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the entire group " + bookmarkGroups[groupIndex].groupName + "?"
    ); 
    if (shouldDelete) {
      deleteBookmarkGroup(groupIndex);
      setBookmarkGroups(loadBookmarkGroups()); 
    } 
  }

  return (
    <div>
      <div className="bookmark-groups-container">
        {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
          <div key={createUniqueID()} className="bookmark-group-box">
            <button 
              className="delete-bookmark-group-button" 
              onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)} 
            >
              <img src="./assets/delete-icon.svg" />
            </button>
            <EditableBookmarkGroupHeading key={createUniqueID} bookmarkGroup={bookmarkGroup} groupIndex={groupIndex}/>

            <div className="bookmark-list">
              {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
                <EditableBookmark key={createUniqueID()} bookmark={bookmark} bookmarkIndex={bookmarkIndex} groupIndex={groupIndex} />
              ))}
            </div>

            <PopupContainer groupName={bookmarkGroups[groupIndex].groupName}/>
          </div>
        ))}
      </div>
      <button className='add-group-button'>
        + Add Group
      </button>
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
      deleteBookmark(bookmarkIndex, groupIndex);
      setBookmarkGroups(loadBookmarkGroups()); 
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


function PopupContainer(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [bookmarkName, setBookmarkName] = React.useState('')
  const [bookmarkUrl, setBookmarkUrl] = React.useState('')

  function handleBookmarkNameChange(event) {
    setBookmarkName(event.target.value);
  }

  function handleBookmarkUrlChange(event) {
    setBookmarkUrl(event.target.value);
  }

  const customStyles = {
    content: {
      width: '250px',
      height: '250px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #a6a4a4',
      boxShadow: '0px 0px 5px 0px rgba(130, 128, 128, 0.75)',
      zIndex: '9999',
      borderRadius: '5px',
      padding: '10px',
    }
  };

  function openModal() {
    setIsOpen(true);
  }

  function afterOpenModal() {
    // Pass
  }

  function closeModal() {
    setIsOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault(); // prevent the form from submitting normally
    saveBookmark(bookmarkName, constructValidURL(bookmarkUrl), props.groupName);
    
    setBookmarkGroups(loadBookmarkGroups());    
    setBookmarkName('');
    setBookmarkUrl('');
    event.target.reset();  
  }

  // We make the URL be of type text so we can validate its format on our own, and we don't require the user to put https:// in front
  return (
    <div> 
      <button className="add-bookmark-button" onClick={openModal}>
        + Add Link
      </button>
      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        contentLabel="Add New Bookmark"
        style={customStyles}
      >
        <button className="close-popup-button" onClick={closeModal}>X</button>
        <form onSubmit={handleSubmit}>
          <label htmlFor="bookmark-name">Name</label>
          <input type="text" id="bookmark-name" value={bookmarkName} onChange={handleBookmarkNameChange} required />
          <label htmlFor="bookmark-url">URL</label>
          <input type="text" id="bookmark-url" value={bookmarkUrl} onChange={handleBookmarkUrlChange} pattern={URL_PATTERN} required></input>
          <button type="submit" className="add-bookmark-button">Add Bookmark</button>
        </form>
      </Modal>
    </div>
  );
}


ReactDOM.render(
  <AppContextProvider>
    <NewTabUI />
  </AppContextProvider>,
  document.getElementById('root')
);