/* Imports */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';
import { createUniqueID, constructValidURL } from './utilities.js';
import { saveBookmark } from './common.js';

/* Constants */
const ADD_LINK_BUTTON_ID_PREFIX = 'add-link-button'; 

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

    // Set class and content of bookmarkGroupBox element
    bookmarkGroupBox.classList.add('bookmark-group-box');

    // Create the header for the bookmarkGroupBox
    const groupHeader = document.createElement("h2");
    groupHeader.setAttribute('class', 'bookmark-group-box-title');
    groupHeader.textContent = bookmarkGroup.groupName;
    bookmarkGroupBox.appendChild(groupHeader);

    /* Add the list of bookmark name/URL pairs to each bookmark group */
    bookmarkGroup.bookmarks.forEach(bookmark => {
      // Create link element
      const link = document.createElement('a');
      
      // Set attributes and content of link element
      link.textContent = bookmark.name;

      // Remove the chrome-extension protocol from the URL
      let bookmarkURL = bookmark.url;
      link.setAttribute('href', bookmarkURL);
      
      // Add link element to bookmarkGroupBox element
      bookmarkGroupBox.appendChild(link);
    });

    // Create the "Add Link" button for the bookmarkGroupBox
    const addLinkButton = document.createElement("button");
    addLinkButton.setAttribute('class', ADD_LINK_BUTTON_ID_PREFIX); 
    addLinkButton.setAttribute('id', ADD_LINK_BUTTON_ID_PREFIX + '-' + bookmarkGroup.groupName);
    addLinkButton.textContent = "+ Add Link";
    addLinkButton.addEventListener("click", newLinkButtonClicked);
    bookmarkGroupBox.appendChild(addLinkButton);

    // Add box element to bookmarkGroupsContainer element
    bookmarkGroupsContainer.appendChild(bookmarkGroupBox);
  });
}


function newLinkButtonClicked(event) {
  const buttonId = event.target.id;
  const groupName = buttonId.replace(new RegExp('^' + ADD_LINK_BUTTON_ID_PREFIX + '-'), '');
  const popupWindow = window.open('add_link_popup.html', 'Popup', 'width=300,height=250');
  // add an event listener to the popup window to handle the close event
  popupWindow.addEventListener('beforeunload', () => {
    const form = popupWindow.document.getElementById('add-link-button-form');
    const bookmarkName = form.elements['bookmark-name'].value;
    const url = constructValidURL(form.elements['bookmark-url'].value);
    saveBookmark(bookmarkName, url, groupName);
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