import React, { useContext, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Modal from 'react-modal';

/* CSS styles */
import '../styles/NewTab.css';

/* Utilities */
import {
  createUniqueID,
} from "../scripts/Utilities.js";

/* Bookmark Storage */
import {
  addEmptyBookmarkGroup,
  deleteBookmarkGroup,
  loadBookmarkGroups,
  setBookmarkGroups,
} from "../scripts/BookmarkManagement.js";
import { AppContextProvider, AppContext } from '../scripts/AppContext';

/* Components */
import {
  EditableBookmark
} from "../components/EditableBookmark.js";
import {
  EditableBookmarkGroupHeading
} from "../components/EditableBookmarkGroupHeading.js";
import {
  AddLinkInline
} from "../components/AddLinkInline.js";


// Binding popup modal for accessibility
Modal.setAppElement('#root');

const UserAction = {
  ADD_EMPTY_GROUP: 'add_empty_group',
  DELETE_GROUP: 'delete_group',
  NONE: 'none',
};

function NewTabUI() {
  const { bookmarkGroups, setBookmarkGroups } = useContext(AppContext);
  const lastBookmarkGroupRef = useRef(null);
  //const [lastAction, setLastAction] = useState(UserAction.NONE);
  const lastActionRef = useRef(UserAction.NONE);

  function handleDeleteBookmarkGroup(event, groupIndex) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the entire group " + bookmarkGroups[groupIndex].groupName + "?"
    ); 
    if (shouldDelete) {
      //setLastAction(UserAction.DELETE_GROUP);
      lastActionRef.current = UserAction.DELETE_GROUP;
      deleteBookmarkGroup(groupIndex);
      setBookmarkGroups(loadBookmarkGroups()); 
    } 
  }

  function handleAddEmptyBookmarkGroup() {
    addEmptyBookmarkGroup();
    //setLastAction(UserAction.ADD_EMPTY_GROUP);
    lastActionRef.current = UserAction.ADD_EMPTY_GROUP;
    setBookmarkGroups(loadBookmarkGroups());
  }

  useEffect(() => {
    if ((lastBookmarkGroupRef.current) && (lastActionRef.current == UserAction.ADD_EMPTY_GROUP)) {
      lastBookmarkGroupRef.current.querySelector('.editable-heading').focus();
    }
  }, [bookmarkGroups]);
  
  return (
    <div>
      <div className="bookmark-groups-container">
        {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
          <div key={createUniqueID()} className="bookmark-group-box" ref={bookmarkGroups.length - 1 === groupIndex ? lastBookmarkGroupRef : null}>            <button 
              className="delete-bookmark-group-button" 
              onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)} 
            >
              <img src="./assets/delete-icon.svg" />
            </button>
            <EditableBookmarkGroupHeading 
              key={createUniqueID} 
              bookmarkGroup={bookmarkGroup} 
              groupIndex={groupIndex}
            />

            <div className="bookmark-list">
              {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
                <EditableBookmark key={createUniqueID()} bookmark={bookmark} bookmarkIndex={bookmarkIndex} groupIndex={groupIndex} />
              ))}
            </div>

            <AddLinkInline groupName={bookmarkGroups[groupIndex].groupName}/>
          </div>
        ))}
      </div>
      <button className='add-group-button' onClick={handleAddEmptyBookmarkGroup}>
        + Add Group
      </button>
    </div>
  );
}


ReactDOM.render(
  <AppContextProvider>
    <NewTabUI />
  </AppContextProvider>,
  document.getElementById('root')
);