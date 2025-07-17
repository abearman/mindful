import React from 'react';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// The component to test (must be exported from its file)
import { NewTabUI } from '../NewTab'; 

// Mock dependencies
import { AppContextProvider, AppContext } from '../scripts/AppContext.jsx'; 
import * as BookmarkManagement from '../scripts/BookmarkManagement.js';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { EMPTY_GROUP_IDENTIFIER, STORAGE_KEY_BOOKMARK_GROUPS } from '../scripts/Constants.js';

// Mock child components for isolation
jest.mock('../components/TopBanner.jsx', () => (props) => (
  <div data-testid="top-banner">
    <button onClick={props.onLoadBookmarks}>Load Bookmarks</button>
    <button onClick={props.onExportBookmarks}>Export Bookmarks</button>
    <button onClick={props.onSignOut}>Sign Out</button>
    <span>{`Signed In: ${props.isSignedIn}`}</span>
    <span>{props.userAttributes?.email}</span>
  </div>
));

jest.mock('../components/DraggableGrid.jsx', () => ({ bookmarkGroups }) => (
  <div data-testid="draggable-grid">
    {bookmarkGroups.map(group => <div key={group.groupName}>{group.groupName}</div>)}
  </div>
));

// Mock external modules
jest.mock('aws-amplify/auth');
jest.mock('../scripts/BookmarkManagement.js', () => ({
  loadBookmarkGroups: jest.fn(),
  addEmptyBookmarkGroup: jest.fn(),
  loadBookmarksFromLocalFile: jest.fn(),
  exportBookmarksToJSON: jest.fn(),
}));

// Mock the Chrome browser API
global.chrome = {
  storage: {
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// --- Test Data ---
const mockUser = { id: '123', username: 'testuser' };
const mockUserAttributes = { email: 'test@example.com' };
const mockBookmarkGroups = [
  { groupName: 'Work', bookmarks: [{ id: 'b1', title: 'Doc', url: 'https://docs.com' }] },
  { groupName: 'Personal', bookmarks: [{ id: 'b2', title: 'Mail', url: 'https://mail.com' }] },
];
const mockBookmarkGroupsWithEmpty = [
  ...mockBookmarkGroups,
  { groupName: EMPTY_GROUP_IDENTIFIER, bookmarks: [] }
];

// --- Test Suite ---
describe('NewTabUI Component', () => {
  let mockSignOut;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup common mocks
    mockSignOut = jest.fn();
    BookmarkManagement.loadBookmarkGroups.mockResolvedValue(mockBookmarkGroups);
    fetchUserAttributes.mockResolvedValue(mockUserAttributes);
    
    // Spy on console.error to check for logged errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup(); // Clean up the DOM after each test
    consoleErrorSpy.mockRestore(); // Restore console.error
  });

  it('should load bookmarks and user attributes when a user is present', async () => {
    render(
      <AppContextProvider>
        <NewTabUI user={mockUser} signOut={mockSignOut} />
      </AppContextProvider>
    );
    
    expect(BookmarkManagement.loadBookmarkGroups).toHaveBeenCalledTimes(1);
    expect(fetchUserAttributes).toHaveBeenCalledTimes(1);

    // Wait for asynchronous operations and state updates to complete
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    // Check if TopBanner receives the correct props after data loading
    expect(screen.getByText('Signed In: true')).toBeInTheDocument();
    expect(screen.getByText(mockUserAttributes.email)).toBeInTheDocument();

    // Check if DraggableGrid receives the loaded groups
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('should not load data if no user is present', () => {
    render(
      <AppContextProvider>
        <NewTabUI user={null} /> 
      </AppContextProvider>
    );

    expect(BookmarkManagement.loadBookmarkGroups).not.toHaveBeenCalled();
    expect(fetchUserAttributes).not.toHaveBeenCalled();
    expect(screen.getByText('Signed In: false')).toBeInTheDocument();
  });

  it('should add an empty bookmark group if one does not exist after loading', async () => {
    // Create a mock setter function for the test to track
    const mockSetBookmarkGroups = jest.fn();
    BookmarkManagement.loadBookmarkGroups.mockResolvedValue(mockBookmarkGroups);
  
    // Use the real Context.Provider to supply a mocked value
    render(
      <AppContext.Provider value={{ bookmarkGroups: mockBookmarkGroups, setBookmarkGroups: mockSetBookmarkGroups }}>
        <NewTabUI user={mockUser} />
      </AppContext.Provider>
    );
  
    await waitFor(() => {
      // Assert that the management function was called with the state and the mock setter
      expect(BookmarkManagement.addEmptyBookmarkGroup).toHaveBeenCalledWith(
        mockSetBookmarkGroups
      );
    });
  });

  it('should NOT add an empty bookmark group if one already exists', async () => {
    // Create a mock setter function for the test to track
    const mockSetBookmarkGroups = jest.fn();

    BookmarkManagement.loadBookmarkGroups.mockResolvedValue(mockBookmarkGroupsWithEmpty);
    
    render(
      <AppContext.Provider 
        value={{ 
          bookmarkGroups: [], // Start with an empty array before data loads
          setBookmarkGroups: mockSetBookmarkGroups 
        }}
      >
        <NewTabUI user={mockUser} />
      </AppContext.Provider>
    );
  
    // Wait for all async effects to settle
    await waitFor(() => {
      expect(mockSetBookmarkGroups).toHaveBeenCalledWith(mockBookmarkGroupsWithEmpty);
    });
    
    // Assert that the function was never called because an empty group was found
    expect(BookmarkManagement.addEmptyBookmarkGroup).not.toHaveBeenCalled();
  });
  
  it('should listen for storage changes and reload data accordingly', async () => {
    render(
      <AppContextProvider>
        <NewTabUI user={mockUser} />
      </AppContextProvider>
    );

    expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);

    // Get the handler function that was passed to the listener
    const storageChangeHandler = chrome.storage.onChanged.addListener.mock.calls[0][0];
    
    // Simulate a storage change event for the relevant key
    const changes = { [STORAGE_KEY_BOOKMARK_GROUPS]: { oldValue: [], newValue: [] } };
    const area = 'local';
    
    BookmarkManagement.loadBookmarkGroups.mockClear(); // Reset mock for this check

    await act(async () => {
      storageChangeHandler(changes, area);
    });

    await waitFor(() => {
      expect(BookmarkManagement.loadBookmarkGroups).toHaveBeenCalledTimes(1);
    });
  });
  
  it('should clean up the storage listener on unmount', () => {
    const { unmount } = render(
      <AppContextProvider>
        <NewTabUI user={mockUser} />
      </AppContextProvider>
    );    
    unmount();

    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
  });

  it('should handle interactions from the TopBanner component', async () => {
    const mockSetBookmarkGroups = jest.fn();

    render(
      <AppContext.Provider value={{ bookmarkGroups: mockBookmarkGroups, setBookmarkGroups: mockSetBookmarkGroups }}>
        <NewTabUI user={mockUser} signOut={mockSignOut} />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Signed In: true')).toBeInTheDocument();
    });

    // Simulate user clicks on the mocked buttons
    fireEvent.click(screen.getByText('Load Bookmarks'));
    expect(BookmarkManagement.loadBookmarksFromLocalFile).toHaveBeenCalledWith(mockSetBookmarkGroups);

    fireEvent.click(screen.getByText('Export Bookmarks'));
    expect(BookmarkManagement.exportBookmarksToJSON).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should log an error if fetching user attributes fails', async () => {
    const fetchError = new Error('Failed to fetch attributes');
    fetchUserAttributes.mockRejectedValue(fetchError);
    
    render(
      <AppContextProvider>
        <NewTabUI user={mockUser} />
      </AppContextProvider>
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user attributes:", fetchError);
    });

    // Verify the component still renders correctly without crashing
    expect(screen.getByTestId('top-banner')).toBeInTheDocument();
    expect(screen.getByTestId('draggable-grid')).toBeInTheDocument();
  });
});