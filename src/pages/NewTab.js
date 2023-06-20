import React, { useContext, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
//import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Responsive, WidthProvider } from "react-grid-layout"; 

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
  reorderBookmarks,
  reorderBookmarkGroups,
  setBookmarkGroups,
  addMissingBookmarkIDs,
  overwriteBookmarkGroupsToStorage,
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

/* Responsive grid layout */
const ResponsiveReactGridLayout = WidthProvider(Responsive);

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

  function handleOnDragEnd(result) {
    if (!result.destination) {
      return;
    }
    const { source, destination, type } = result;

    // if you're dragging groups
    if (type == 'bookmark-group') {
      const sourceGroupIndex = source.index;
      const destinationGroupIndex = destination.index;
      reorderBookmarkGroups(sourceGroupIndex, destinationGroupIndex);
    }

    // if you're dragging bookmarks
    if (type === 'bookmark') {
      const sourceBookmarkIndex = source.index;
      const destinationBookmarkIndex = destination.index;
      const sourceGroupIndex = parseInt(source.droppableId);
      const destinationGroupIndex = parseInt(destination.droppableId);
      reorderBookmarks(sourceBookmarkIndex, destinationBookmarkIndex, sourceGroupIndex, destinationGroupIndex);
    }

    setBookmarkGroups(loadBookmarkGroups()); 
  }


  function exportBookmarksToJSON() {
    let bookmarkGroupsData = loadBookmarkGroups();
    
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

  function handleFileSelection(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
  
    // Read the contents of the file
    reader.onload = function (event) {
      const contents = event.target.result;
      const data = JSON.parse(contents);
      // Save the parsed data to local storage
      overwriteBookmarkGroupsToStorage(data);
      setBookmarkGroups(loadBookmarkGroups());   
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
  
  useEffect(() => {
    if ((lastBookmarkGroupRef.current) && (lastActionRef.current == UserAction.ADD_EMPTY_GROUP)) {
      lastBookmarkGroupRef.current.querySelector('.editable-heading').focus();
    }
  }, [bookmarkGroups]);
  
  const grid_layout = [
    { i: "a", x: 0, y: 0, w: 1, h: 2, static: true },
    { i: "b", x: 1, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
    { i: "c", x: 4, y: 0, w: 1, h: 2 }
  ];

  return (
    <div>
      <div className="export-bookmarks-button-container">
        <button className='export-or-load-bookmarks-button' onClick={exportBookmarksToJSON}>Export Bookmarks</button>
        <button className='export-or-load-bookmarks-button' onClick={loadBookmarksFromLocalFile}>Load Bookmarks</button>
      </div>

      <ResponsiveReactGridLayout
        className="layout"
        rowHeight={150}
        onLayoutChange={function() {}}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      >
        {bookmarkGroups.map((bookmarkGroup, groupIndex) => (
          <div className="bookmark-group-box" key={bookmarkGroup.id}>
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
            {bookmarkGroup.bookmarks.map((bookmark, bookmarkIndex) => (
              <EditableBookmark bookmark={bookmark} bookmarkIndex={bookmarkIndex} groupIndex={groupIndex} key={bookmark.id} />
            ))}
          </div>
        ))} 
      </ResponsiveReactGridLayout>
    </div>
  );

      {/* <DragDropContext onDragEnd={handleOnDragEnd}>
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
    </div> */}
}

ReactDOM.render(
  <AppContextProvider>
    <NewTabUI />
  </AppContextProvider>,
  document.getElementById('root')
);