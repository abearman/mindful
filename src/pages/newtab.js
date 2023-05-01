import React, { useContext } from 'react';
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
  loadBookmarkGroups,
  deleteBookmarkGroup,
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

            <AddLinkInline groupName={bookmarkGroups[groupIndex].groupName}/>
          </div>
        ))}
      </div>
      <button className='add-group-button'>
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