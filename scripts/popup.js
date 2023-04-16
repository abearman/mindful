/* Imports */
import { STORAGE_KEY_BOOKMARK_GROUPS } from './constants.js';
import { createUniqueID, constructValidURL } from './utilities.js';
import { loadBookmarkGroups, saveBookmark } from './bookmark_management.js';

/* Main entrypoint to code */
main();

function main() {
  constructPopupUI();
}

function constructPopupUI() {
  // Get references to the form and list elements in the HTML
  const form = document.getElementById('add-bookmark-form');

  // Construct and populate the groups dropdown menu
  constructGroupsDropdown();

  // Pre-populate URL and our best guess at the bookmark name
  chrome.tabs.query({active: true, currentWindow: true }, function(tabs) {
    var currentTab = tabs[0]; // there will be only one in this array
    let currentTabURL = currentTab.url;
    let currentTabTitle = currentTab.title;
    document.getElementById('bookmark-url').value = currentTabURL;
    document.getElementById('bookmark-name').value = currentTabTitle;
  });

  // Adds an event listener to the form for when it's submitted 
  let submitButton = document.getElementById('submit-form-button');
  submitButton.addEventListener('click', function(event) {
    respondToFormSubmission(form, event);
  });
  // form.addEventListener('submit', function(event) {
  //   respondToFormSubmission(form, event);
  // });
 
  // Store popup state when it loses focus
  window.addEventListener('blur', function() {
    // Store state in local storage
    /*localStorage.setItem('popupState', JSON.stringify({
      // store any relevant data about the popup state here
    }));*/
  });

  // Restore popup state when it gains focus
  window.addEventListener('focus', function() {
    // Check if there is stored state
    // const popupState = localStorage.getItem('popupState');
    // if (popupState) {
    //   // Restore state from local storage
    //   const state = JSON.parse(popupState);
    //   // do any necessary actions to restore the popup state here
    //   // for example, if you need to update the UI, you can do that here
    // }
  });
}

/* Construct the groups dropdown with info from the saved bookmark groups */
function constructGroupsDropdown() {
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
}

/* Respond to form submission */
function respondToFormSubmission(form, event) {
  // Prevent the page from refreshing
  event.preventDefault(); 

  // Get the values from the form fields
  const name = form.elements['bookmark-name'].value;
  // Do not call constructValidURL if we're populating from the open tab
  const url = form.elements['bookmark-url'].value;
  const newGroupInput = document.getElementById('new-group-input') 
  const group = newGroupInput.value === '' ? form.elements['group-dropdown'].value : newGroupInput.value;

  // save the bookmark to local storage
  saveBookmark(name, url, group);

  // Update the group dropdown against the saved bookmark groups
  refreshGroupDropdown();

  // clear the form fields
  form.reset();
}

/* Refresh the options in the group dropdown against the saved bookmark groups */
function refreshGroupDropdown() {
  let bookmarkGroups = loadBookmarkGroups();
  bookmarkGroups.forEach(bookmarkGroup => {
    addGroupToDropdownUI(bookmarkGroup.groupName, createUniqueID());
  });
}

/* Add a group with a provided name to the group dropdown UI */
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



