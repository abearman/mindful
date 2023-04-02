// Get references to the form and list elements in the HTML
const form = document.getElementById('add-bookmark-form');
const categoryList = document.getElementById('category-dropdown');
//const bookmarkList = document.getElementById('bookmark-list');

// Construct the categories drop-down
document.addEventListener('DOMContentLoaded', () => {
  //localStorage.clear(); // TODO: remove
  let categoryDropdown = document.getElementById('category-dropdown');
  const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
  console.log("bookmarks: " + JSON.stringify(bookmarks, null, 2));

  // Add options to the category dropdown
  refreshCategoryDropdown();

  // Add "New Category" option to the category dropdown
  addCategoryOptionToDropdownUI('New Category', 'new-category-option');

  // Detect if there are no pre-saved categories, so we must show the "New Category" input field
  const newCategoryLabel = document.getElementById('new-category-label');
  const newCategoryInput = document.getElementById('new-category-input');
  if (bookmarks.length === 0) {
    newCategoryLabel.style.display = 'block';
    newCategoryInput.style.display = 'block';  
  }

  // Detect when the "New Category" dropdown option is selected 
  categoryDropdown.addEventListener('change', (event) => {
    if (event.target.value === 'New Category') {
      newCategoryLabel.style.display = 'block';
      newCategoryInput.style.display = 'block';
    } else {
      newCategoryLabel.style.display = 'none';
      newCategoryInput.style.display = 'none';
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
  const newCategoryInput = document.getElementById('new-category-input') 
  const category = newCategoryInput.value === '' ? form.elements['category-dropdown'].value : newCategoryInput.value;

  // save the bookmark to local storage
  saveBookmark(name, url, category);

  // Update the categories dropdown against the saved bookmarks
  refreshCategoryDropdown();

  // clear the form fields
  form.reset();
});


// Refresh the options in the categories dropdown against the saved bookmarks
function refreshCategoryDropdown() {
  let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
  bookmarks.forEach(bookmark => {
    let category = bookmark.category;
    addCategoryOptionToDropdownUI(bookmark.category, getUniqueID());
  });
}

// Add a new category option to the category dropdown UI
function addCategoryOptionToDropdownUI(name, id) {
  let categoryDropdown = document.getElementById('category-dropdown');
  const categoryExistsInDropdown = Array.from(categoryDropdown.options).some(option => option.text === name);
  
  if (!categoryExistsInDropdown) {
    const newCategoryOption = document.createElement('option');
    newCategoryOption.id = id;  
    newCategoryOption.value = name;  
    newCategoryOption.text = name;  
    categoryDropdown.add(newCategoryOption);
  } 
}

function getUniqueID() {
  return Date.now() + Math.random();
}


// function to save a bookmark to local storage
function saveBookmark(name, url, category) {
  let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
  let bookmark = { name: name, url: url };
  
  // Check if bookmark name already exists in the current category
  let existingCategoryIndex = bookmarks.findIndex((item) => item.category === category);
  if (existingCategoryIndex !== -1) {
    let existingCategory = bookmarks[existingCategoryIndex];
    if (!existingCategory.bookmarks.some((item) => item.name === name)) {
      existingCategory.bookmarks.push(bookmark);
    } else {
      alert(`A bookmark with the name "${name}" already exists in the "${category}" category.`);
    }
  } else {
    bookmarks.push({ category: category, bookmarks: [bookmark] });
  }
  
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}
