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
  /* Get the name of the bookmarkGroup and ID of the Add Link button clicked */
  const buttonId = event.target.id;
  console.log("button Id: " + buttonId);
  let addLinkButton = document.getElementById(buttonId);
  const groupName = buttonId.replace(new RegExp('^' + ADD_LINK_BUTTON_ID_PREFIX + '-'), '');

  /* Create the HTML of the popup menu */
  const popupContainer = document.createElement("div");
  popupContainer.setAttribute("id", "new-link-popup-container");
  popupContainer.setAttribute("style", "display: none; position: absolute;");
  popupContainer.innerHTML = `
    <button id="close-popup-button">X</button>  
    <form id="add-link-button-form">
      <label for="bookmark-name">Name</label>
      <input type="text" id="bookmark-name" name="bookmark-name" required>

      <label for="bookmark-url">URL</label>
      <!-- We make the URL be type of text so we can validate its format on our own, and we don't require the user to put https:// in front -->
      <input type="text" id="bookmark-url" name="bookmark-url" pattern="^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$" required>

      <button type="submit" class="add-bookmark-button">Add Bookmark</button>
    </form> 
  `;
  const bookmarkGroupsContainer = document.getElementById('bookmark-groups-container');
  bookmarkGroupsContainer.appendChild(popupContainer);

  /* Create the close button element on the popup menu */
  const closeButton = popupContainer.querySelector("#close-popup-button");
  closeButton.addEventListener("click", function() {
    popupContainer.style.display = "none";
  });

  /* Display the popup menu */
  popupContainer.style.display = 'block';
  popupContainer.style.top = addLinkButton.offsetTop + addLinkButton.offsetHeight + 'px';
  popupContainer.style.left = addLinkButton.offsetLeft + 'px';
  console.log(addLinkButton.offsetTop + " " + addLinkButton.offsetHeight + " " + addLinkButton.offsetLeft);

  /* Handle the popup form submission */
  const form = document.getElementById('add-link-button-form');
  form.addEventListener('submit', function(event) {
    event.preventDefault(); // prevent the form from submitting normally
    const name = form.elements['bookmark-name'].value;
    const url = constructValidURL(form.elements['bookmark-url'].value);
    saveBookmark(name, url, groupName);
    form.reset();
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