import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkManager } from '../../scripts/useBookmarkManager';
// Note: We still import AppContext here, but Jest will swap it with our mock below.
import { AppContext } from '../../scripts/AppContext';
import { EMPTY_GROUP_IDENTIFIER, StorageType } from '../../scripts/Constants';

// --- Mocks ---

// THE DEFINITIVE FIX: This mock completely replaces the real `AppContext.jsx`
// file. It uses `require('react')` inside the factory to avoid the
// out-of-scope variable error.
jest.mock('../../scripts/AppContext', () => ({
  // The test needs an object named `AppContext` to use its `.Provider` property.
  // We must use `require` here because `jest.mock` is hoisted above `import`.
  AppContext: require('react').createContext(),
}));


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

// --- Robust Mocking Strategy ---
let mockStorageSave;
let mockStorageLoad;

jest.mock('../../scripts/storage.js', () => ({
  Storage: jest.fn().mockImplementation(() => {
    return {
      save: mockStorageSave,
      load: mockStorageLoad,
    };
  }),
}));

// Import after mocks are defined to get a reference to the mock functions
const { v4: mockV4 } = require('uuid');
const { refreshOtherMindfulTabs } = require('../../scripts/Utilities.js');


// --- Test Suite ---

describe.each([
  { storageType: StorageType.LOCAL, description: 'local' },
  { storageType: StorageType.REMOTE, description: 'remote' },
])('useBookmarkManager with $description storage', ({ storageType }) => {

  const createWrapper = (mockContextValue) => {
    return ({ children }) => (
      <AppContext.Provider value={mockContextValue}>
        {children}
      </AppContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageSave = jest.fn().mockResolvedValue(undefined);
    mockStorageLoad = jest.fn().mockResolvedValue([]);
    refreshOtherMindfulTabs.mockResolvedValue(undefined);

    let count = 1;
    mockV4.mockImplementation(() => `mock-uuid-${count++}`);
  });

  // --- Test Cases (will run for each storage type) ---

  it('should add a new bookmark in a NEW group', async () => {
    // ARRANGE
    const initialGroups = [
      { groupName: 'Work', id: 'group-1', bookmarks: [] },
      { groupName: EMPTY_GROUP_IDENTIFIER, id: 'empty-id', bookmarks: [] },
    ];
    
    const setBookmarkGroups = jest.fn().mockImplementation(updater => {
        if (typeof updater === 'function') {
            updater(initialGroups);
        }
    });
    
    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({
        bookmarkGroups: initialGroups,
        setBookmarkGroups,
        userId: 'user-1',
        storageType: storageType,
        setStorageType: jest.fn(),
        user: { identityId: 'user-1' },
      }),
    });

    // ACT
    await act(async () => {
      await result.current.addNamedBookmark('New Site', 'https://newsite.com', 'Social Media');
    });

    // ASSERT
    expect(setBookmarkGroups).toHaveBeenCalledTimes(1);
    const updaterFn = setBookmarkGroups.mock.calls[0][0];
    const finalGroups = updaterFn(initialGroups);

    expect(finalGroups.length).toBe(3);
    expect(mockStorageSave).toHaveBeenCalledWith(finalGroups, 'user-1');
    
    // Conditional assertion based on storage type
    if (storageType === StorageType.LOCAL) {
      expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
    } else {
      expect(refreshOtherMindfulTabs).not.toHaveBeenCalled();
    }
  });

  it('should add a new bookmark to an EXISTING group', async () => {
    // ARRANGE
    const initialGroups = [
      { groupName: 'Work', id: 'group-1', bookmarks: [{ name: 'Internal Docs', url: 'https://docs.internal', id: 'bm-1' }] },
      { groupName: 'Personal', id: 'group-2', bookmarks: [] },
    ];

    const setBookmarkGroups = jest.fn().mockImplementation(updater => {
        if (typeof updater === 'function') {
            updater(initialGroups);
        }
    });

    const { result } = renderHook(() => useBookmarkManager(), {
      wrapper: createWrapper({
        bookmarkGroups: initialGroups,
        setBookmarkGroups,
        userId: 'user-2',
        storageType: storageType,
        setStorageType: jest.fn(),
        user: { identityId: 'user-2' },
      }),
    });

    // ACT
    await act(async () => {
      await result.current.addNamedBookmark('Company Blog', 'https://blog.co', 'Work');
    });

    // ASSERT
    const updaterFn = setBookmarkGroups.mock.calls[0][0];
    const finalGroups = updaterFn(initialGroups);
    const workGroup = finalGroups.find(g => g.groupName === 'Work');

    expect(workGroup.bookmarks.length).toBe(2);
    expect(workGroup.bookmarks[1].name).toBe('Company Blog');
    expect(mockStorageSave).toHaveBeenCalledWith(finalGroups, 'user-2');
    
    if (storageType === StorageType.LOCAL) {
      expect(refreshOtherMindfulTabs).toHaveBeenCalledTimes(1);
    } else {
      expect(refreshOtherMindfulTabs).not.toHaveBeenCalled();
    }
  });
});
