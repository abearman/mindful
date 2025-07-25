/* __tests__/DraggableGrid.test.jsx */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import DraggableGrid from '../../components/DraggableGrid';
import { AppContext } from '../../scripts/AppContext';
import { useBookmarkManager } from '../../scripts/useBookmarkManager';

// --- FIXED & EXPANDED MOCKS ---

// We need to capture all drag handlers passed to DndContext.
let capturedOnDragStart, capturedOnDragEnd, capturedOnDragCancel;

jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  // Mock DndContext to capture all its drag-related event handlers.
  DndContext: ({ children, onDragStart, onDragEnd, onDragCancel }) => {
    capturedOnDragStart = onDragStart;
    capturedOnDragEnd = onDragEnd;
    capturedOnDragCancel = onDragCancel;
    // Render children to ensure the component tree is built.
    return <div>{children}</div>;
  },
  // DragOverlay is a portal, so we just render its children for the test.
  DragOverlay: ({ children }) => <>{children}</>,
}));

// Mock the custom hook `useBookmarkManager`.
jest.mock('../../scripts/useBookmarkManager.js', () => ({
  useBookmarkManager: jest.fn(),
}));

// Mock child components to simplify testing.
jest.mock('../../components/BookmarkGroup', () => ({
  BookmarkGroup: ({ bookmarkGroup, handleDeleteBookmarkGroup, groupIndex }) => (
    <div data-testid={`bookmark-group-${bookmarkGroup.id}`}>
      <h3>{bookmarkGroup.groupName}</h3>
      <button onClick={(e) => handleDeleteBookmarkGroup(e, groupIndex)}>
        Delete Group
      </button>
      {bookmarkGroup.bookmarks.map(bookmark => (
        <div key={bookmark.id} data-testid={`bookmark-${bookmark.id}`}>{bookmark.name}</div>
      ))}
    </div>
  ),
}));

// Add a mock for BookmarkItem, which is used by the DragOverlay.
jest.mock('../../components/BookmarkItem', () => ({
    BookmarkItem: ({ bookmark }) => <div data-testid={`overlay-bookmark-${bookmark.id}`}>{bookmark.name}</div>,
}));

// --- TEST SETUP ---

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
    ],
  },
];

describe('DraggableGrid Component', () => {
  let mockSetBookmarkGroups;
  let mockDeleteBookmarkGroup;
  let mockReorderBookmarkGroups;
  let mockReorderBookmarks;
  let mockMoveBookmark; // Add mock for the new function

  beforeEach(() => {
    mockSetBookmarkGroups = jest.fn();
    mockDeleteBookmarkGroup = jest.fn();
    mockReorderBookmarkGroups = jest.fn();
    mockReorderBookmarks = jest.fn();
    mockMoveBookmark = jest.fn(); // Initialize the new mock

    useBookmarkManager.mockReturnValue({
      deleteBookmarkGroup: mockDeleteBookmarkGroup,
      reorderBookmarkGroups: mockReorderBookmarkGroups,
      reorderBookmarks: mockReorderBookmarks,
      moveBookmark: mockMoveBookmark, // Provide the new mock function
    });

    window.confirm = jest.fn(() => true);
    
    // Reset all captured functions before each test.
    capturedOnDragStart = undefined;
    capturedOnDragEnd = undefined;
    capturedOnDragCancel = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  // --- TESTS ---

  test('renders all bookmark groups from context', () => {
    renderComponent();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Work Tools')).toBeInTheDocument();
    expect(screen.getAllByTestId(/bookmark-group-/)).toHaveLength(2);
  });

  test('calls reorderBookmarkGroups when a group is dragged and dropped', () => {
    renderComponent();
    const dragEvent = { active: { id: 'group-1' }, over: { id: 'group-2' } };
    
    // Simulate the full drag-and-drop lifecycle
    act(() => {
        capturedOnDragStart(dragEvent);
        capturedOnDragEnd(dragEvent);
    });

    expect(mockReorderBookmarkGroups).toHaveBeenCalledWith(0, 1);
    expect(mockReorderBookmarks).not.toHaveBeenCalled();
    expect(mockMoveBookmark).not.toHaveBeenCalled();
  });
  
  test('calls reorderBookmarks when a bookmark is dragged within the same group', () => {
    renderComponent();
    const dragEvent = { active: { id: 'bookmark-1-1' }, over: { id: 'bookmark-1-2' } };

    act(() => {
        capturedOnDragStart(dragEvent);
        capturedOnDragEnd(dragEvent);
    });

    // Corrected Assertion: The function takes 3 arguments
    expect(mockReorderBookmarks).toHaveBeenCalledWith(0, 1, 0);
    expect(mockReorderBookmarkGroups).not.toHaveBeenCalled();
    expect(mockMoveBookmark).not.toHaveBeenCalled();
  });

  test('calls moveBookmark when a bookmark is dragged to a different group', () => {
    renderComponent();
    const dragEvent = { active: { id: 'bookmark-1-1' }, over: { id: 'bookmark-2-1' } };

    act(() => {
        capturedOnDragStart(dragEvent);
        capturedOnDragEnd(dragEvent);
    });

    const expectedSource = { groupIndex: 0, bookmarkIndex: 0 };
    const expectedDestination = { groupIndex: 1, bookmarkIndex: 0 };

    expect(mockMoveBookmark).toHaveBeenCalledWith(expectedSource, expectedDestination);
    expect(mockReorderBookmarkGroups).not.toHaveBeenCalled();
    expect(mockReorderBookmarks).not.toHaveBeenCalled();
  });

  test('calls deleteBookmarkGroup when delete is clicked and confirmed', async () => {
    renderComponent();
    const deleteButtons = screen.getAllByText('Delete Group');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete the entire group Social Media?"
    );

    await expect(mockDeleteBookmarkGroup).toHaveBeenCalledWith(0);
  });

  test('does not call deleteBookmarkGroup when delete is cancelled', async () => {
    window.confirm.mockReturnValue(false);
    renderComponent();
    const deleteButtons = screen.getAllByText('Delete Group');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    await expect(mockDeleteBookmarkGroup).not.toHaveBeenCalled();
  });
});