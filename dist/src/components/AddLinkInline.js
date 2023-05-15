import React, { useContext, useState } from 'react';

/* CSS styles */
import '../styles/AddLinkInline.css';

/* Bookmark Storage */
import {
  loadBookmarkGroups,
  saveBookmark,
} from "../scripts/BookmarkManagement.js";
import { AppContext } from '../scripts/AppContext';

/* Utilities */
import {
  constructValidURL
} from "../scripts/Utilities.js";

/* Constants */
import {
  URL_PATTERN
} from '../scripts/Constants.js'

function AddLinkInline(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [linkBeingEdited, setLinkBeingEdited] = useState(false);

  function handleAddLinkClicked(event) {
    setLinkBeingEdited(true);
  }

  // We make the URL be of type text so we can validate its format on our own, and we don't require the user to put https:// in front
  return (
    <div className="add-link-inline-container">
      {!linkBeingEdited ? (
        <AddLinkButton onClick={handleAddLinkClicked} />
      ) : (
        <CreateNewBookmark groupName={props.groupName} setLinkBeingEdited={setLinkBeingEdited}/>
      )}
    </div> 
  );
}


function AddLinkButton(props) {
  return (
    <div>
      <button className="add-bookmark-button-1" onClick={props.onClick}> 
        + Add Link
      </button>
    </div>
  );
}


function CreateNewBookmark(props) {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const [bookmarkName, setBookmarkName] = React.useState('')
  const [bookmarkUrl, setBookmarkUrl] = React.useState('') 

  function handleBookmarkNameChange(event) {
    setBookmarkName(event.target.value);
  }

  function handleBookmarkUrlChange(event) {
    setBookmarkUrl(event.target.value);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // prevent the form from submitting
      handleSubmit(event);
    }
  }

  function handleSubmit(event) {
    event.preventDefault(); // prevent the form from submitting normally
    const urlWithProtocol = constructValidURL(bookmarkUrl);
    saveBookmark(bookmarkName, urlWithProtocol, props.groupName);
    
    setBookmarkGroups(loadBookmarkGroups());    
    setBookmarkName('');
    setBookmarkUrl('');
  }

  function closeForm(event) {
    props.setLinkBeingEdited(false);
  }

  return (
    <div className="create-new-bookmark-component"> 
      <div className="form-container">
        <form onKeyDown={handleKeyDown}>
          <input type="text" placeholder="Enter a bookmark name ..." autoFocus value={bookmarkName} onChange={handleBookmarkNameChange} required />
          <input type="text" placeholder="Enter a bookmark URL ..." value={bookmarkUrl} onChange={handleBookmarkUrlChange} pattern={URL_PATTERN} required></input>
        </form>
      </div>
      <button type="submit" className="add-bookmark-button-2" onClick={handleSubmit}>Add Bookmark</button>
      <button className="close-form-button" onClick={(event) => closeForm(event)}>
        <img src="./assets/delete-icon.svg" />
      </button>
    </div>
  );
}


export { AddLinkInline };