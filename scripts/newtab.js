/* Constants */
STORAGE_KEY_BOOKMARK_GROUPS = "bookmarkGroups";


/* Render the static list of bookmarks, for debugging */ 
// Get the bookmarks data from localStorage
const bookmarkGroups = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARK_GROUPS));
console.log("Saved bookmark groups: " + JSON.stringify(bookmarkGroups, null, 2));

// Loop through the bookmark groups and render them on the page
bookmarkGroups.forEach(bookmarkGroup => {
  const groupName = bookmarkGroup.groupName;
  console.log("bookmarkGroup: " + JSON.stringify(bookmarkGroup, null, 2));
  // Create a heading for the group
  const groupHeading = document.createElement('h2');
  groupHeading.textContent = groupName;
  document.body.appendChild(groupHeading);

  // Create an unordered list for the bookmarks in the group 
  const bookmarkList = document.createElement('ul');

  // Loop through the bookmarks in the group and add them to the list
  bookmarkGroup.bookmarks.forEach(bookmark => {
    console.log("Bookmark: " + JSON.stringify(bookmark));
    const bookmarkItem = document.createElement('li');
    const bookmarkLink = document.createElement('a');
    bookmarkLink.href = bookmark.url;
    bookmarkLink.textContent = bookmark.name;
    bookmarkItem.appendChild(bookmarkLink);
    bookmarkList.appendChild(bookmarkItem);
  });

  document.body.appendChild(bookmarkList);
});


// const container = document.getElementById('bookmark-groups-container');

// bookmarkGroups.forEach(bookmarkGroup => {
//   // create box element
//   const box = document.createElement('div');
  
//   // set class and content of box element
//   box.classList.add('bookmark-group-box');
//   box.innerHTML = `<h2>${bookmarkGroup.groupName}</h2>`;
  
//   // add box element to container element
//   container.appendChild(box);
// });