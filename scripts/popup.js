/* Imports */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';
import { createUniqueID } from './utilities.js';


// Get references to the form and list elements in the HTML
const form = document.getElementById('add-bookmark-form');

// Construct the groups dropdown
document.addEventListener('DOMContentLoaded', () => {
  //localStorage.clear(); // TODO: remove
  let groupDropdown = document.getElementById('group-dropdown');
  const bookmarkGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS)) || [];
  console.log("bookmarkGroups: " + JSON.stringify(bookmarkGroups, null, 2));

  // Add options to the group name dropdown
  refreshGroupDropdown();

  // Initialize the bookmark group dropdown with the "New Group" 
  const NEW_GROUP_OPTION_TEXT = "New Group";
  addGroupToDropdownUI(NEW_GROUP_OPTION_TEXT, 'new-group-option')

  // Detect if there are no pre-saved group, so we must show the "New Group" input field
  const newGroupLabel = document.getElementById('new-group-label');
  const newGroupInput = document.getElementById('new-group-input');
  if (bookmarkGroups.length === 0) {
    newGroupLabel.style.display = 'block';
    newGroupInput.style.display = 'block';  
  }

  // Detect when the "New Group" dropdown option is selected 
  groupDropdown.addEventListener('change', (event) => {
    if (event.target.value === NEW_GROUP_OPTION_TEXT) {
      newGroupLabel.style.display = 'block';
      newGroupInput.style.display = 'block';
    } else {
      newGroupLabel.style.display = 'none';
      newGroupInput.style.display = 'none';
    }
  });
});



form.addEventListener('submit', function(event) {
  /* Adds an event listener to the form for when it's submitted
   */ 
  event.preventDefault(); // prevent the form from submitting normally

  // Get the values from the form fields
  const name = form.elements['bookmark-name'].value;
  const url = form.elements['bookmark-url'].value;
  const newGroupInput = document.getElementById('new-group-input') 
  const group = newGroupInput.value === '' ? form.elements['group-dropdown'].value : newGroupInput.value;

  // save the bookmark to local storage
  saveBookmark(name, url, group);

  // Update the group dropdown against the saved bookmark groups
  refreshGroupDropdown();

  // clear the form fields
  form.reset();
});


// Refresh the options in the group dropdown against the saved bookmark groups
function refreshGroupDropdown() {
  let bookmarkGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS)) || [];
  bookmarkGroups.forEach(bookmarkGroup => {
    addGroupToDropdownUI(bookmarkGroup.groupName, createUniqueID());
  });
}

// Add a group with a provided name to the group dropdown UI
function addGroupToDropdownUI(name, id) {
  let groupDropdown = document.getElementById('group-dropdown');
  console.log("groupDropdown: " + groupDropdown);
  const groupExistsInDropdown = Array.from(groupDropdown.options).some(option => option.text === name);
  
  if (!groupExistsInDropdown) {
    const newGroupOption = document.createElement('option');
    newGroupOption.id = id;  
    newGroupOption.value = name;  
    newGroupOption.text = name;  
    groupDropdown.add(newGroupOption);
  } 
}


// function to save a bookmark to local storage
function saveBookmark(bookmarkName, url, groupName) {
  let bookmarkGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS)) || [];
  let bookmark = { name: bookmarkName, url: url };
  
  // Check if bookmark name already exists in the current group
  let existingGroupIndex = bookmarkGroups.findIndex((item) => item.groupName === groupName);
  if (existingGroupIndex !== -1) {
    let existingGroup = bookmarkGroups[existingGroupIndex];
    if (!existingGroup.bookmarks.some((item) => item.bookmarkName === name)) {
      existingGroup.bookmarks.push(bookmark);
    } else {
      alert(`A bookmark with the name "${bookmarkName}" already exists in the "${groupName}" group.`);
    }
  } else {
    bookmarkGroups.push({ groupName: groupName, bookmarks: [bookmark] });
  }
  
  localStorage.setItem(STORAGE_KEY_BOOKMARK_GROUPS, JSON.stringify(bookmarkGroups));
}
