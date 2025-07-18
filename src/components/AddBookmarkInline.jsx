import React, { useContext, useState } from 'react';

/* CSS styles */
import '../styles/AddBookmarkInline.css';

/* Constants */
import { URL_PATTERN } from '../scripts/Constants.js'

/* Hooks and Utilities */
import { useBookmarkManager } from '../scripts/useBookmarkManager.js';
import { AppContext } from '../scripts/AppContext.jsx';
import { constructValidURL } from "../scripts/Utilities.js";


function AddBookmarkInline(props) {
  // Consume state from the context 
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);

  const [linkBeingEdited, setLinkBeingEdited] = useState(false);
  const bookmarkGroupName = bookmarkGroups[props.groupIndex].groupName;

  function handleAddLinkClicked(event) {
    setLinkBeingEdited(true);
  }

  // We make the URL be of type text so we can validate its format on our own, and we don't require the user to put https:// in front
  return (
    <div className="add-link-inline-container">
      {!linkBeingEdited ? (
        <AddLinkButton onClick={handleAddLinkClicked} />
      ) : (
        <CreateNewBookmark groupName={bookmarkGroupName} setLinkBeingEdited={setLinkBeingEdited}/>
      )}
    </div> 
  );
}


function AddLinkButton(props) {
  return (
    <div>
      <button className="add-bookmark-button-1" onClick={props.onClick}> 
        + Add a link 
      </button>
    </div>
  );
}


function CreateNewBookmark(props) {
  // Consume state from the context 
  const { bookmarkGroups, setBookmarkGroups, userId } = useContext(AppContext);

  // Get all actions from the custom bookmarks hook
  const { 
    addNamedBookmark, 
  } = useBookmarkManager();    
  
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

  async function handleSubmit(event) {
    event.preventDefault(); // prevent the form from submitting normally
    const urlWithProtocol = constructValidURL(bookmarkUrl);
    addNamedBookmark(bookmarkName, urlWithProtocol, props.groupName);

    setBookmarkName('');
    setBookmarkUrl('');

    // Add this line to hide the form
    props.setLinkBeingEdited(false); 
  }

  function closeForm(event) {
    props.setLinkBeingEdited(false);
  }

  return (
    <div className="create-new-bookmark-component"> 
      <div className="form-container">
        <form onKeyDown={handleKeyDown}>
          <input type="text" placeholder="Enter a link name" autoFocus value={bookmarkName} onChange={handleBookmarkNameChange} required />
          <input type="text" placeholder="Enter a link URL" value={bookmarkUrl} onChange={handleBookmarkUrlChange} pattern={URL_PATTERN} required></input>
        </form>
      </div>
      <button type="submit" className="add-bookmark-button-2" onClick={handleSubmit}>Add link</button>
      <button className="close-form-button" onClick={(event) => closeForm(event)}>
        <img src="./assets/delete-icon.svg" />
      </button>
    </div>
  );
}


export { AddBookmarkInline };