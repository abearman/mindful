import React from 'react'; 
import { renderHook, act } from '@testing-library/react';
import { useBookmarkManager } from '../../scripts/useBookmarkManager';
import { AppContext } from '../../scripts/AppContext';
import { EMPTY_GROUP_IDENTIFIER } from '../../scripts/Constants';

// Mock dependencies
// Mocking chrome APIs for a Node (Jest) environment
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: jest.fn(),
  },
};

// Mock the v4 function from the uuid library
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

// Mock the utilities module
jest.mock('../../scripts/Utilities.js', () => ({
  getUserStorageKey: (userId) => `bookmarks-${userId}`,
  refreshOtherMindfulTabs: jest.fn(),
}));


// --- Test Suite ---

describe('useBookmarkManager', () => {
  // A reusable wrapper component to provide the mock context to the hook
  const createWrapper = (mockContextValue) => {
    return ({ children }) => (
      <AppContext.Provider value={mockContextValue}>
        {children}
      </AppContext.Provider>
    );
  };

  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add a new bookmark in a new group before the EMPTY_GROUP_IDENTIFIER', async () => {
    // 1. ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      { groupName: 'Work', id: '1', bookmarks: [] },
      { groupName: 'Personal', id: '2', bookmarks: [] },
      { groupName: EMPTY_GROUP_IDENTIFIER, id: 'empty-id', bookmarks: [] },
    ];

    const mockContextValue = {
      bookmarkGroups: initialGroups,
      setBookmarkGroups,
      userId: 'test-user-123',
    };

    // Render the hook with the mocked context
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper(mockContextValue),
    });

    // 2. ACT
    // Use 'act' to wrap state-updating logic
    await act(async () => {
      await result.current.addNamedBookmark('New Site', 'https://newsite.com', 'Social Media');
    });

    // 3. ASSERT
    // Check that our state update function was called
    expect(setBookmarkGroups).toHaveBeenCalledTimes(1);

    // Get the new array that was passed to our state setter
    const finalGroups = setBookmarkGroups.mock.calls[0][0];

    // Verify the order and content
    expect(finalGroups.length).toBe(4);
    expect(finalGroups[0].groupName).toBe('Work');
    expect(finalGroups[1].groupName).toBe('Personal');
    expect(finalGroups[2].groupName).toBe('Social Media'); // The new group is here
    expect(finalGroups[3].groupName).toBe(EMPTY_GROUP_IDENTIFIER); // The empty group is last

    // Verify the new bookmark was added correctly
    expect(finalGroups[2].bookmarks[0].name).toBe('New Site');
    expect(finalGroups[2].bookmarks[0].id).toBe('mock-uuid-1234');

    // Verify that the correctly ordered array was saved to chrome storage
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
      'bookmarks-test-user-123': finalGroups,
    });
  });

  it('should add a new named group before the EMPTY_GROUP_IDENTIFIER', async () => {
    // 1. ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      { groupName: 'Reading List', id: '1', bookmarks: [] },
      { groupName: EMPTY_GROUP_IDENTIFIER, id: 'empty-id', bookmarks: [] },
    ];

    const mockContextValue = {
      bookmarkGroups: initialGroups,
      setBookmarkGroups,
      userId: 'test-user-456',
    };

    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper(mockContextValue),
    });

    // 2. ACT
    await act(async () => {
      // Call the actual hook function
      await result.current.addNamedBookmarkGroup('New Project');
    });
     
    // 3. ASSERT
    // Get the array passed to the state setter
    const finalGroups = setBookmarkGroups.mock.calls[0][0];

    // Check the order
    expect(finalGroups.length).toBe(3);
    expect(finalGroups[0].groupName).toBe('Reading List');
    expect(finalGroups[1].groupName).toBe('New Project');
    expect(finalGroups[2].groupName).toBe(EMPTY_GROUP_IDENTIFIER);

    // Check that it was saved to storage correctly
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
      'bookmarks-test-user-456': finalGroups,
    });
  });
  
  // You can add more tests here for other functions like delete, reorder, etc.
});
