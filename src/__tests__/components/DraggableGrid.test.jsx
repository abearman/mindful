/* __tests__/DraggableGrid.test.jsx */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the component to be tested
import DraggableGrid from '../../components/DraggableGrid';

// Mocks for dependencies
import { AppContext } from '../../scripts/AppContext';
import { useBookmarkManager } from '../../scripts/useBookmarkManager';

// We need to capture the onDragEnd function passed to DndContext.
// We'll create a variable to hold it and mock the context provider at the top level.
let capturedOnDragEnd;

// Mock the entire @dnd-kit/core module to intercept the DndContext component
jest.mock('@dnd-kit/core', () => ({
  // Keep the original exports for things we don't want to mock (like useSensor)
  ...jest.requireActual('@dnd-kit/core'),
  // Mock DndContext specifically
  DndContext: ({ children, onDragEnd }) => {
    // When the real DndContext is rendered by DraggableGrid, this mock will be used instead.
    // We capture the onDragEnd prop so we can call it directly in our tests.
    capturedOnDragEnd = onDragEnd;
    // We must render the children for the rest of the component tree to appear.
    return <div>{children}</div>;
  },
}));

// Mock the custom hook `useBookmarkManager`
jest.mock('../../scripts/useBookmarkManager.js', () => ({
  useBookmarkManager: jest.fn(),
}));

// Mock the BookmarkGroup child component to simplify testing
jest.mock('../../components/BookmarkGroup', () => ({
  BookmarkGroup: ({ bookmarkGroup, handleDeleteBookmarkGroup, groupIndex }) => (
    <div data-testid={`bookmark-group-${bookmarkGroup.id}`}>
      <h3>{bookmarkGroup.groupName}</h3>
      {/* Mock a delete button to test the delete functionality */}
      <button onClick={(e) => handleDeleteBookmarkGroup(e, groupIndex)}>
        Delete Group
      </button>
      {/* Mock bookmarks to test item reordering */}
      {bookmarkGroup.bookmarks.map(bookmark => (
        <div key={bookmark.id} data-testid={`bookmark-${bookmark.id}`}>{bookmark.name}</div>
      ))}
    </div>
  ),
}));

// Mock data for our tests
const mockBookmarkGroups = [
  {
    id: 'group-1',
    groupName: 'Social Media',
    bookmarks: [
      { id: 'bookmark-1-1', name: 'Facebook', url: 'https://facebook.com' },
      { id: 'bookmark-1-2', name: 'Twitter', url: 'https://twitter.com' },
    ],
  },
  {
    id: 'group-2',
    groupName: 'Work Tools',
    bookmarks: [
      { id: 'bookmark-2-1', name: 'Gmail', url: 'https://gmail.com' },
      { id: 'bookmark-2-2', name: 'Google Docs', url: 'https://docs.google.com' },
    ],
  },
];

describe('DraggableGrid Component', () => {
  let mockSetBookmarkGroups;
  let mockDeleteBookmarkGroup;
  let mockReorderBookmarkGroups;
  let mockReorderBookmarks;

  // Before each test, set up the mocks
  beforeEach(() => {
    mockSetBookmarkGroups = jest.fn();
    mockDeleteBookmarkGroup = jest.fn();
    mockReorderBookmarkGroups = jest.fn();
    mockReorderBookmarks = jest.fn();

    // Provide the mock implementation for the useBookmarkManager hook
    useBookmarkManager.mockReturnValue({
      deleteBookmarkGroup: mockDeleteBookmarkGroup,
      reorderBookmarkGroups: mockReorderBookmarkGroups,
      reorderBookmarks: mockReorderBookmarks,
    });

    // Mock window.confirm
    window.confirm = jest.fn(() => true); 
    
    // Reset the captured function before each test to ensure test isolation
    capturedOnDragEnd = undefined;
  });

  // Clean up mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Simplified helper function to render the component with the necessary context
  const renderComponent = (groups = mockBookmarkGroups) => {
    return render(
      <AppContext.Provider
        value={{
          bookmarkGroups: groups,
          setBookmarkGroups: mockSetBookmarkGroups,
          userId: 'test-user-123',
        }}
      >
        <DraggableGrid />
      </AppContext.Provider>
    );
  };

  test('renders all bookmark groups from context', () => {
    renderComponent();
    
    // Check if both group titles are rendered
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Work Tools')).toBeInTheDocument();
    
    // Check if the correct number of groups are rendered
    expect(screen.getAllByTestId(/bookmark-group-/)).toHaveLength(2);
  });

  test('calls reorderBookmarkGroups when a group is dragged and dropped', () => {
    renderComponent();
    
    // Define a mock drag event for reordering groups
    const dragEvent = {
      active: { id: 'group-1' },
      over: { id: 'group-2' },
    };
    
    // Verify that our mock successfully captured the onDragEnd function
    expect(capturedOnDragEnd).toBeInstanceOf(Function);
    
    // Manually call the captured onDragEnd handler to simulate a drag
    capturedOnDragEnd(dragEvent);

    // Expect reorderBookmarkGroups to be called with correct indices
    expect(mockReorderBookmarkGroups).toHaveBeenCalledWith(0, 1);
    expect(mockReorderBookmarks).not.toHaveBeenCalled();
  });
  
  test('calls reorderBookmarks when a bookmark is dragged and dropped within the same group', () => {
    renderComponent();

    // Mock drag event for reordering bookmarks inside 'group-1'
    const dragEvent = {
      active: { id: 'bookmark-1-1' },
      over: { id: 'bookmark-1-2' },
    };

    // Verify that our mock successfully captured the onDragEnd function
    expect(capturedOnDragEnd).toBeInstanceOf(Function);

    // Manually call the captured onDragEnd handler
    capturedOnDragEnd(dragEvent);

    // Expect reorderBookmarks to be called with correct indices
    expect(mockReorderBookmarks).toHaveBeenCalledWith(0, 1, 0, 0);
    expect(mockReorderBookmarkGroups).not.toHaveBeenCalled();
  });

  test('calls deleteBookmarkGroup when delete is clicked and confirmed', async () => {
    renderComponent();

    // Find the delete button for the first group and click it
    const deleteButtons = screen.getAllByText('Delete Group');
    fireEvent.click(deleteButtons[0]);

    // Check that window.confirm was called
    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete the entire group Social Media?"
    );

    // Check that deleteBookmarkGroup was called with the correct index
    // The `await` in the component means we should wait for the mock to be called
    await expect(mockDeleteBookmarkGroup).toHaveBeenCalledWith(0);
  });

  test('does not call deleteBookmarkGroup when delete is clicked and cancelled', async () => {
    // Mock window.confirm to return false for this specific test
    window.confirm.mockReturnValue(false);
    
    renderComponent();

    const deleteButtons = screen.getAllByText('Delete Group');
    fireEvent.click(deleteButtons[0]);

    // Check that window.confirm was called
    expect(window.confirm).toHaveBeenCalled();

    // Check that deleteBookmarkGroup was NOT called
    await expect(mockDeleteBookmarkGroup).not.toHaveBeenCalled();
  });
});
