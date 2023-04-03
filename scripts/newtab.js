/* Imports */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';
import { createUniqueID } from './utilities.js';

// Get the bookmarks data from localStorage
if (STORAGE_KEY_BOOKMARK_GROUPS in localStorage) {
  const bookmarkGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS));
  renderSavedBookmarks(bookmarkGroups);
  makeBookmarkGroupsDraggable(bookmarkGroups);
} else {
  // No saved bookmarks
  // TODO: Decide what to render in this case 
}

/* Render the draggable grid of bookmark groups */ 
function renderSavedBookmarks(bookmarkGroups) {
  //console.log("Saved bookmark groups: " + JSON.stringify(bookmarkGroups, null, 2));

  const bookmarkGroupsContainer = document.getElementById('bookmark-groups-container');
  bookmarkGroups.forEach(bookmarkGroup => {
    // create box element
    const bookmarkGroupBox = document.createElement('div');  
    bookmarkGroupBox.id = createUniqueID();

    // set class and content of bookmarkGroupBox element
    bookmarkGroupBox.classList.add('bookmark-group-box');
    bookmarkGroupBox.innerHTML = `<h2 class=bookmark-group-title>${bookmarkGroup.groupName}</h2>`;
    
    // add box element to bookmarkGroupsContainer element
    bookmarkGroupsContainer.appendChild(bookmarkGroupBox);

    bookmarkGroup.bookmarks.forEach(bookmark => {
      // create link element
      const link = document.createElement('a');
      
      // set attributes and content of link element
      link.textContent = bookmark.name;

      // Remove the chrome-extension protocol from the URL
      let bookmarkURL = bookmark.url;
      link.setAttribute('href', bookmarkURL);
      
      // add link element to bookmarkGroupBox element
      bookmarkGroupBox.appendChild(link);
    });
  });
}


function makeBookmarkGroupsDraggable(bookmarkGroups) {
  const bookmarkGroupsContainer = document.querySelector('#bookmark-groups-container');

  const bookmarkGroupBoxes = document.querySelectorAll('.bookmark-group-box');
  bookmarkGroupBoxes.forEach(bookmarkGroupBox => {
    // Implement dragstart and dragover event listeners for each bookmarkGroupBox
    bookmarkGroupBox.setAttribute('draggable', true);
    bookmarkGroupBox.addEventListener('dragstart', dragStartHandler);
    console.log("bookmarkGroupBox ID when listeners are set up: " + bookmarkGroupBox.id);
  });

  // Implement a dragover and drop event listener for the overall bookmarkGroupContainer
  bookmarkGroupsContainer.addEventListener('dragover', dragOverHandler);
  bookmarkGroupsContainer.addEventListener('drop', dropHandler);
}


function dragStartHandler(event) {
  event.dataTransfer.setData('text/plain', event.target.id);
  console.log("Drag start detected with event: " + JSON.stringify(event));
  console.log("event.target.id in dragStartHandler: " + event.target.id);
}


function dragOverHandler(event) {
  console.log("Drag over detected with event: " + JSON.stringify(event));
  event.preventDefault();
}


function dropHandler(event) {
  console.log("Drop detected with event: " + JSON.stringify(event));
  event.preventDefault();
  const draggedBookmarkGroupId = event.dataTransfer.getData('text/plain');
  const draggedBookmarkGroupBox = document.getElementById(draggedBookmarkGroupId);
  console.log("draggedBookmarkGroupId in dropHandler: " + draggedBookmarkGroupId);
  console.log("event.target in dropHandler: " + JSON.stringify(event.target));
  const dropTarget = getDropTarget(event);
  bookmarkGroupsContainer.insertBefore(bookmarkGroupBox, dropTarget);
}