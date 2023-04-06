/* Imports */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';
import { createUniqueID, constructValidURL } from './utilities.js';
import { loadBookmarkGroups, saveBookmark } from './bookmark_management.js';


// Get references to the form and list elements in the HTML
const form = document.getElementById('add-bookmark-form');

// Construct the groups dropdown
document.addEventListener('DOMContentLoaded', () => {
  //localStorage.clear(); // TODO: remove
  let groupDropdown = document.getElementById('group-dropdown');
  const bookmarkGroups = loadBookmarkGroups(); 

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
  const url = constructValidURL(form.elements['bookmark-url'].value);
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
  let bookmarkGroups = loadBookmarkGroups();
  bookmarkGroups.forEach(bookmarkGroup => {
    addGroupToDropdownUI(bookmarkGroup.groupName, createUniqueID());
  });
}

// Add a group with a provided name to the group dropdown UI
function addGroupToDropdownUI(name, id) {
  let groupDropdown = document.getElementById('group-dropdown');
  const groupExistsInDropdown = Array.from(groupDropdown.options).some(option => option.text === name);
  
  if (!groupExistsInDropdown) {
    const newGroupOption = document.createElement('option');
    newGroupOption.id = id;  
    newGroupOption.value = name;  
    newGroupOption.text = name;  
    groupDropdown.add(newGroupOption);
  } 
}



