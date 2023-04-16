/* Imports */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';
import { createUniqueID, constructValidURL } from './utilities.js';
import { loadBookmarkGroups, deleteBookmark, editBookmarkName, overwriteBookmarkGroups, saveBookmark } from './bookmark_management.js';

/* Constants */
const ADD_LINK_BUTTON_ID_PREFIX = 'add-link-button'; 
const BOOKMARK_GROUP_TITLE_PREFIX = 'bookmark-group-box-title';
const ModifyButtonType = Object.freeze({
  EDIT: 'edit',
  DELETE: 'delete',
});

/* Main code entrypoint */
main();

function main() {
  // Get the bookmarks data from localStorage
  let bookmarkGroups = loadBookmarkGroups();
  if (bookmarkGroups != null) { 
    renderSavedBookmarks(bookmarkGroups);
    makeBookmarkGroupsDraggable(bookmarkGroups);
  } else {
    // No saved bookmarks
    // TODO: Decide what to render in this case 
  }

  // TODO: Retain info about the popup window if the user switches tabs
  // let activeWindowId = null;
  // let activeTabId = null;

  // chrome.windows.onFocusChanged.addListener(windowId => {
  //   if (windowId === chrome.windows.WINDOW_ID_NONE) {
  //     // The user switched to a non-Chrome window
  //     activeWindowId = null;
  //     activeTabId = null;
  //     console.log("User switched to a non-Chrome window");
  //   } else {
  //     // The user switched to a Chrome window
  //     activeWindowId = windowId;
  //     chrome.tabs.query({ active: true, windowId: activeWindowId }, tabs => {
  //       if (tabs.length > 0) {
  //         activeTabId = tabs[0].id;
  //       }
  //     });
  //     console.log("User switched to a Chrome window");
  //   }
  // });

  // chrome.tabs.onActivated.addListener(info => {
  //   if (info.windowId === activeWindowId) {
  //     activeTabId = info.tabId;
  //     console.log("User switched back to active tab");
  //   }
  // });

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
    groupHeader.setAttribute('class', BOOKMARK_GROUP_TITLE_PREFIX); 
    groupHeader.setAttribute('id', BOOKMARK_GROUP_TITLE_PREFIX + '-' + bookmarkGroup.groupName);
    groupHeader.setAttribute('contenteditable', 'true'); 
    groupHeader.textContent = bookmarkGroup.groupName;
    // Listen for "keydown - Enter" and "blur" events on the <h2> header element
    groupHeader.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') { 
        event.preventDefault(); 
        groupHeader.blur(); // Remove focus from the header to trigger the blur function
      }
    });
    groupHeader.addEventListener('blur', (event) => {
      const newGroupName = event.target.textContent.trim();
      if (newGroupName !== bookmarkGroup.groupName) {
        bookmarkGroup.groupName = newGroupName;
        overwriteBookmarkGroups(bookmarkGroups);      
      }
    });
    bookmarkGroupBox.appendChild(groupHeader);

    // Create the "Add Link" button for the bookmarkGroupBox
    const addLinkButton = document.createElement("button");
    addLinkButton.setAttribute('class', ADD_LINK_BUTTON_ID_PREFIX); 
    addLinkButton.setAttribute('id', ADD_LINK_BUTTON_ID_PREFIX + '-' + bookmarkGroup.groupName);
    addLinkButton.textContent = "+ Add Link";
    addLinkButton.addEventListener("click", newLinkButtonClicked);
    bookmarkGroupBox.appendChild(addLinkButton);

    /* Add the list of bookmark name/URL pairs to each bookmark group */
    bookmarkGroup.bookmarks.forEach(bookmark => {
      // Create container element for bookmark
      const bookmarkContainer = document.createElement('div');
      bookmarkContainer.classList.add('bookmark-container');

      // Create favicon element
      const favicon = document.createElement('img');
      favicon.classList.add('favicon');
      let faviconUrl = getFaviconUrl(bookmark.url);
      favicon.setAttribute('src', faviconUrl);
      bookmarkContainer.appendChild(favicon);

      // Create link element 
      const link = document.createElement('a');
      link.textContent = bookmark.name;
      let bookmarkURL = bookmark.url;
      link.setAttribute('href', bookmarkURL);  // Remove the chrome-extension protocol from the URL
      bookmarkContainer.appendChild(link);

      // Create the link edit and delete buttons. They should only appear when bookmarkContainer is hovered over. 
      renderModifyBookmarkButtons(bookmarkContainer, link, ModifyButtonType.EDIT, bookmark.name, bookmarkGroup.groupName);
      renderModifyBookmarkButtons(bookmarkContainer, link, ModifyButtonType.DELETE, bookmark.name, bookmarkGroup.groupName);

      // Add bookmark container to bookmarkGroupBox element
      bookmarkGroupBox.appendChild(bookmarkContainer);
    });

    // Add box element to bookmarkGroupsContainer element
    bookmarkGroupsContainer.appendChild(bookmarkGroupBox);
  });
}


function getFaviconUrl(bookmarkUrl) {
  return `https://www.google.com/s2/favicons?sz=16&domain=${bookmarkUrl}`
}


function renderModifyBookmarkButtons(bookmarkContainer, linkElement, button_type, bookmarkName, groupName) {
  const imagePath = button_type == ModifyButtonType.EDIT ? "assets/edit-icon.svg" : "assets/delete-icon.svg";
  const button = document.createElement('button');
  const img = document.createElement("img");
  img.classList.add('modify-link-button-img');
  img.src = imagePath; 
  button.appendChild(img);

  button.classList.add('modify-link-button');
  button.addEventListener("click", function() {
    /* Callback for clicking on the edit button */
    if (button_type == ModifyButtonType.EDIT) {
      // Make the link element's content editable
      linkElement.setAttribute('contenteditable', 'true'); 
      linkElement.focus();
      document.execCommand('selectAll', false, null);

      // Listen for "keydown - Enter" and "blur" events on the link element
      linkElement.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') { 
          event.preventDefault(); 
          linkElement.blur(); // Remove focus from the linkElement to trigger the blur function
        }
      });
      linkElement.addEventListener('blur', (event) => {
        const newBookmarkName = event.target.textContent.trim();
        if (newBookmarkName !== bookmarkName) {
          editBookmarkName(bookmarkName, groupName, newBookmarkName);
        }
        linkElement.setAttribute('contenteditable', 'false'); 
      });

    /* Callback for clicking on the delete button */
    } else if (button_type == ModifyButtonType.DELETE) {
      const shouldDelete = window.confirm(
        "Are you sure you want to delete the " + bookmarkName + " bookmark from " + groupName + "?"
      ); 
      if (shouldDelete) {
        deleteBookmark(bookmarkName, groupName);
      }
    }
  });

  bookmarkContainer.appendChild(button);
}


function newLinkButtonClicked(event) {
  /* Get the name of the bookmarkGroup and ID of the Add Link button clicked */
  const buttonId = event.target.id;
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
  const rect = addLinkButton.getBoundingClientRect();
  popupContainer.style.top = rect.bottom + 'px';
  popupContainer.style.left = rect.left + 'px';

  /* Handle the popup form submission */
  const form = document.getElementById('add-link-button-form');
  form.addEventListener('submit', function(event) {
    event.preventDefault(); // prevent the form from submitting normally
    const name = form.elements['bookmark-name'].value;
    const url = constructValidURL(form.elements['bookmark-url'].value);
    saveBookmark(name, url, groupName, /*should refresh */ true);
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
  });

  // Implement a dragover and drop event listener for the overall bookmarkGroupContainer
  bookmarkGroupsContainer.addEventListener('dragover', dragOverHandler);
  bookmarkGroupsContainer.addEventListener('drop', dropHandler);
}


function dragStartHandler(event) {
  event.dataTransfer.setData('text/plain', event.target.id);
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