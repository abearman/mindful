import React, { useContext, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

/* CSS styles */
import './styles/NewTab.css';

/* Utilities */
import {
  createUniqueID,
} from "./scripts/Utilities.js";

/* Constants */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './scripts/Constants.js';

/* Bookmark Storage */
import {
  addEmptyBookmarkGroup,
  deleteBookmarkGroup,
  loadBookmarkGroups,
  reorderBookmarks,
  reorderBookmarkGroups,
  addMissingBookmarkIDs,
  overwriteBookmarkGroupsToStorage,
} from "./scripts/BookmarkManagement.js";
import { AppContextProvider, AppContext } from './scripts/AppContext.jsx';

/* Components */
import {
  EditableBookmark
} from "./components/EditableBookmark.jsx";
import {
  EditableBookmarkGroupHeading
} from "./components/EditableBookmarkGroupHeading.jsx";
import {
  AddLinkInline
} from "./components/AddLinkInline.jsx";




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

  async function handleDeleteBookmarkGroup(event, groupIndex) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete the entire group " + bookmarkGroups[groupIndex].groupName + "?"
    ); 
    if (shouldDelete) {
      //setLastAction(UserAction.DELETE_GROUP);
      lastActionRef.current = UserAction.DELETE_GROUP;
      await deleteBookmarkGroup(groupIndex, setBookmarkGroups);
    } 
  }

  async function handleAddEmptyBookmarkGroup() {
    //setLastAction(UserAction.ADD_EMPTY_GROUP);
    lastActionRef.current = UserAction.ADD_EMPTY_GROUP;
    addEmptyBookmarkGroup(setBookmarkGroups);
  }

  async function handleOnDragEnd(result) {
    if (!result.destination) {
      return;
    }
    const { source, destination, type } = result;

    // if you're dragging groups
    if (type == 'bookmark-group') {
      const sourceGroupIndex = source.index;
      const destinationGroupIndex = destination.index;
      reorderBookmarkGroups(sourceGroupIndex, destinationGroupIndex, setBookmarkGroups);
    }

    // if you're dragging bookmarks
    if (type === 'bookmark') {
      const sourceBookmarkIndex = source.index;
      const destinationBookmarkIndex = destination.index;
      const sourceGroupIndex = parseInt(source.droppableId);
      const destinationGroupIndex = parseInt(destination.droppableId);
      reorderBookmarks(sourceBookmarkIndex, destinationBookmarkIndex, sourceGroupIndex, destinationGroupIndex, setBookmarkGroups);
    }
  }


  async function exportBookmarksToJSON() {
    let bookmarkGroupsData = await loadBookmarkGroups();
    
    // Convert the data to JSON
    const jsonData = JSON.stringify(bookmarkGroupsData);
  
    // Create a file blob with the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' });
  
    // Create a temporary anchor element
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'bookmarks.json';
  
    // Programmatically click the anchor to initiate the download
    anchor.click();
  }

  async function handleFileSelection(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
  
    // Read the contents of the file
    reader.onload = async function (event) {
      const contents = event.target.result;
      const data = JSON.parse(contents);
      // Save the parsed data to local storage
      await overwriteBookmarkGroupsToStorage(data, setBookmarkGroups);
      setBookmarkGroups(await loadBookmarkGroups());   
      console.log('Bookmarks saved to local storage:', data);
    };

    // Read the file as text
    reader.readAsText(file);
  }

  function loadBookmarksFromLocalFile() {
    // Create an input element
    const input = document.createElement('input');
    input.type = 'file';

    // Add an event listener for the file selection
    input.addEventListener('change', handleFileSelection);

    // Programmatically trigger a click event to open the file dialog
    input.click();
  }

  // Automatically refresh the new tab page if the state is change (e.g., from the popup menu)
  useEffect(() => {
    function handleStorageChange(changes, area) {
      console.log('Handling storage change');
      if (area === 'local' && changes[STORAGE_KEY_BOOKMARK_GROUPS]) {
        loadBookmarkGroups().then(setBookmarkGroups);
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    if ((lastBookmarkGroupRef.current) && (lastActionRef.current == UserAction.ADD_EMPTY_GROUP)) {
      lastBookmarkGroupRef.current.querySelector('.editable-heading').focus();
    }
  }, [bookmarkGroups]);

  return (
    <div>
      <div className="export-bookmarks-button-container">
        <button className='export-or-load-bookmarks-button' onClick={exportBookmarksToJSON}>Export Bookmarks</button>
        <button className='export-or-load-bookmarks-button' onClick={loadBookmarksFromLocalFile}>Load Bookmarks</button>
      </div>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="all-groups" type="bookmark-group">
          {(provided, snapshot) => (
            <div 
              className="bookmark-groups-container"
              ref={provided.innerRef} 
              {...provided.droppableProps}
            >
              {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
                <Draggable key={bookmarkGroup.id} draggableId={bookmarkGroup.id} index={groupIndex}>
                  {(provided, snapshot) => (
                    <div
                      className="bookmark-group-box"
                      ref={provided.innerRef} 
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      {/* your bookmark group content */}
                      <button 
                      className="delete-bookmark-group-button" 
                      onClick={(event) => handleDeleteBookmarkGroup(event, groupIndex)} 
                    >
                      <img src="./assets/delete-icon.svg" />
                    </button>
                      <EditableBookmarkGroupHeading 
                        key={"heading-" + bookmarkGroup.id} 
                        bookmarkGroup={bookmarkGroup} 
                        groupIndex={groupIndex}
                      />

                      <Droppable droppableId={groupIndex.toString()} type="bookmark">
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}>
                            {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
                              <Draggable key={bookmark.id} draggableId={bookmark.id} index={bookmarkIndex}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                    <EditableBookmark bookmark={bookmark} bookmarkIndex={bookmarkIndex} groupIndex={groupIndex} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

ReactDOM.render(
  <AppContextProvider>
    <NewTabUI />
  </AppContextProvider>,
  document.getElementById('root')
);