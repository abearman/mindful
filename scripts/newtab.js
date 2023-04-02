// Get the bookmarks data from localStorage
const bookmarks = JSON.parse(localStorage.getItem('bookmarks'));
console.log("Saved bookmarks: " + JSON.stringify(bookmarks, null, 2));

// Loop through the categories and render them on the page
bookmarks.forEach(bookmarkGroup => {
  const category = bookmarkGroup.category;
  console.log("bookmarkGroup: " + JSON.stringify(bookmarkGroup, null, 2));
  // Create a heading for the category
  console.log("Category: " + category);
  const categoryHeading = document.createElement('h2');
  categoryHeading.textContent = category;
  document.body.appendChild(categoryHeading);

  // Create an unordered list for the bookmarks in the category
  const bookmarkList = document.createElement('ul');

  // Loop through the bookmarks in the category and add them to the list
  bookmarkGroup.bookmarks.forEach(bookmark => {
    console.log("Bookmark: " + bookmark);
    const bookmarkItem = document.createElement('li');
    const bookmarkLink = document.createElement('a');
    bookmarkLink.href = bookmark.url;
    bookmarkLink.textContent = bookmark.name;
    bookmarkItem.appendChild(bookmarkLink);
    bookmarkList.appendChild(bookmarkItem);
  });

  document.body.appendChild(bookmarkList);
});