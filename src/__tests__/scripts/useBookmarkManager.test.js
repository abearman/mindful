import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkManager } from '../../scripts/useBookmarkManager';
import { AppContext } from '../../scripts/AppContext';
import { EMPTY_GROUP_IDENTIFIER } from '../../scripts/Constants';

// --- Mocks ---

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

// Mock the v4 function from the uuid library to return predictable IDs
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

// Mock the utilities module
jest.mock('../../scripts/Utilities.js', () => ({
  getUserStorageKey: (userId) => `bookmarks-${userId}`,
  refreshOtherMindfulTabs: jest.fn(),
}));

// Mock the dnd-kit arrayMove utility
jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: (array, from, to) => {
    const newArray = [...array];
    const [movedItem] = newArray.splice(from, 1);
    newArray.splice(to, 0, movedItem);
    return newArray;
  },
}));

// Import after mocks are defined
const { v4: mockV4 } = require('uuid'); // Get a reference to the mock function
const { refreshOtherMindfulTabs } = require('../../scripts/Utilities.js');


// --- Test Suite ---

describe('useBookmarkManager', () => {
  // A reusable wrapper to provide the mock context to the hook
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
    // Reset the uuid mock's implementation for each test
    let count = 1;
    mockV4.mockImplementation(() => `mock-uuid-${count++}`);
  });

  // --- Test Cases ---

  it('should add a new bookmark in a NEW group', async () => {
    // ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      { groupName: 'Work', id: 'group-1', bookmarks: [] },
      { groupName: EMPTY_GROUP_IDENTIFIER, id: 'empty-id', bookmarks: [] },
    ];
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({ bookmarkGroups: initialGroups, setBookmarkGroups, userId: 'user-1' }),
    });

    // ACT
    await act(async () => {
      await result.current.addNamedBookmark('New Site', 'https://newsite.com', 'Social Media');
    });

    // ASSERT
    expect(setBookmarkGroups).toHaveBeenCalledTimes(1);
    const finalGroups = setBookmarkGroups.mock.calls[0][0];

    expect(finalGroups.length).toBe(3);
    expect(finalGroups[0].groupName).toBe('Work');
    expect(finalGroups[1].groupName).toBe('Social Media'); // New group inserted before empty
    expect(finalGroups[2].groupName).toBe(EMPTY_GROUP_IDENTIFIER);

    const newGroup = finalGroups[1];
    expect(newGroup.id).toBe('mock-uuid-2'); // From mocked uuid
    expect(newGroup.bookmarks[0].name).toBe('New Site');
    expect(newGroup.bookmarks[0].id).toBe('mock-uuid-1'); // Second call to uuid

    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ 'bookmarks-user-1': finalGroups });
    expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
  });

  it('should add a new bookmark to an EXISTING group', async () => {
    // ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      { groupName: 'Work', id: 'group-1', bookmarks: [{ name: 'Internal Docs', url: 'https://docs.internal', id: 'bm-1' }] },
      { groupName: 'Personal', id: 'group-2', bookmarks: [] },
    ];
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({ bookmarkGroups: initialGroups, setBookmarkGroups, userId: 'user-2' }),
    });

    // ACT
    await act(async () => {
      await result.current.addNamedBookmark('Company Blog', 'https://blog.co', 'Work');
    });

    // ASSERT
    expect(setBookmarkGroups).toHaveBeenCalledTimes(1);
    const finalGroups = setBookmarkGroups.mock.calls[0][0];
    const workGroup = finalGroups.find(g => g.groupName === 'Work');

    expect(workGroup.bookmarks.length).toBe(2);
    expect(workGroup.bookmarks[1].name).toBe('Company Blog');
    expect(workGroup.bookmarks[1].id).toBe('mock-uuid-1'); // First call to uuid in this test

    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ 'bookmarks-user-2': finalGroups });
    expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
  });

  it('should add a new named group before the empty group identifier', async () => {
    // ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      { groupName: 'Reading List', id: 'group-1', bookmarks: [] },
      { groupName: EMPTY_GROUP_IDENTIFIER, id: 'empty-id', bookmarks: [] },
    ];
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({ bookmarkGroups: initialGroups, setBookmarkGroups, userId: 'user-3' }),
    });

    // ACT
    await act(async () => {
      await result.current.addNamedBookmarkGroup('New Project');
    });

    // ASSERT
    const finalGroups = setBookmarkGroups.mock.calls[0][0];
    expect(finalGroups.length).toBe(3);
    expect(finalGroups[1].groupName).toBe('New Project');
    expect(finalGroups[1].id).toBe('mock-uuid-1');
    expect(finalGroups[2].groupName).toBe(EMPTY_GROUP_IDENTIFIER);

    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ 'bookmarks-user-3': finalGroups });
    expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
  });

  it('should delete a bookmark group', async () => {
    // ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      { groupName: 'Work', id: 'group-1', bookmarks: [] },
      { groupName: 'To Delete', id: 'group-2', bookmarks: [] },
      { groupName: 'Personal', id: 'group-3', bookmarks: [] },
    ];
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({ bookmarkGroups: initialGroups, setBookmarkGroups, userId: 'user-4' }),
    });

    // ACT
    await act(async () => {
      await result.current.deleteBookmarkGroup(1); // Delete 'To Delete' group
    });

    // ASSERT
    const finalGroups = setBookmarkGroups.mock.calls[0][0];
    expect(finalGroups.length).toBe(2);
    expect(finalGroups.map(g => g.groupName)).toEqual(['Work', 'Personal']);

    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ 'bookmarks-user-4': finalGroups });
    expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
  });

  it('should edit a bookmark group heading', async () => {
    // ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [{ groupName: 'Old Name', id: 'group-1', bookmarks: [] }];
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({ bookmarkGroups: initialGroups, setBookmarkGroups, userId: 'user-5' }),
    });

    // ACT
    await act(async () => {
      await result.current.editBookmarkGroupHeading(0, 'New Shiny Name');
    });

    // ASSERT
    const finalGroups = setBookmarkGroups.mock.calls[0][0];
    expect(finalGroups[0].groupName).toBe('New Shiny Name');
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ 'bookmarks-user-5': finalGroups });
    expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
  });

  it('should delete a bookmark from a group', async () => {
    // ARRANGE
    const setBookmarkGroups = jest.fn();
    const initialGroups = [
      {
        groupName: 'Work', id: 'group-1', bookmarks: [
          { name: 'Docs', url: '...', id: 'bm-1' },
          { name: 'To Delete', url: '...', id: 'bm-2' },
          { name: 'Reports', url: '...', id: 'bm-3' },
        ]
      },
    ];
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({ bookmarkGroups: initialGroups, setBookmarkGroups, userId: 'user-6' }),
    });

    // ACT
    await act(async () => {
      await result.current.deleteBookmark(1, 0); // Delete bookmark at index 1 from group at index 0
    });

    // ASSERT
    const finalGroups = setBookmarkGroups.mock.calls[0][0];
    const workGroup = finalGroups[0];
    expect(workGroup.bookmarks.length).toBe(2);
    expect(workGroup.bookmarks.map(b => b.name)).toEqual(['Docs', 'Reports']);

    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ 'bookmarks-user-6': finalGroups });
    expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
  });
});