import React from 'react';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// The component to test (must be exported from its file)
import { NewTabUI } from '../NewTab'; 

// Mock dependencies
import { AppContextProvider, AppContext } from '../scripts/AppContext.jsx'; 
import * as useBookmarkManager from '../scripts/useBookmarkManager.js';
import * as Utilities from '../scripts/Utilities.js';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { EMPTY_GROUP_IDENTIFIER } from '../scripts/Constants.js';

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
jest.mock('../scripts/useBookmarkManager.js', () => ({
  loadInitialBookmarks: jest.fn(),
  useBookmarkManager: jest.fn(),
}));
jest.mock('../scripts/Utilities.js', () => ({
  getUserStorageKey: jest.fn(),
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
const mockUserId = '123';
const mockUser = { userId: mockUserId, username: 'testuser' };
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

  // Define variables for the useBookmarkManager mock functions 
  let mockAddEmptyBookmarkGroup;
  let mockExportBookmarksToJSON;
  let mockImportBookmarksFromJSON;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create new mock useBookmarkManager functions for each test run
    mockAddEmptyBookmarkGroup = jest.fn();
    mockExportBookmarksToJSON = jest.fn();
    mockImportBookmarksFromJSON = jest.fn();

    // Tell the mocked hook what to return when it's called
    useBookmarkManager.useBookmarkManager.mockReturnValue({
      addEmptyBookmarkGroup: mockAddEmptyBookmarkGroup,
      exportBookmarksToJSON: mockExportBookmarksToJSON,
      importBookmarksFromJSON: mockImportBookmarksFromJSON,
    });

    // Setup common mocks
    mockSignOut = jest.fn();
    useBookmarkManager.loadInitialBookmarks.mockResolvedValue(mockBookmarkGroups);
    fetchUserAttributes.mockResolvedValue(mockUserAttributes);
    
    // Mock the user storage key 
    const mockStorageKey = `bookmarks_${mockUserId}`;
    Utilities.getUserStorageKey.mockReturnValue(mockStorageKey);

    // Spy on console.error to check for logged errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup(); // Clean up the DOM after each test
    consoleErrorSpy.mockRestore(); // Restore console.error
  });

  it('should load bookmarks and user attributes when a user is present', async () => {
    render(
      <AppContextProvider user={mockUser}>
        <NewTabUI user={mockUser} signOut={mockSignOut} />
      </AppContextProvider>
    );
    
    expect(useBookmarkManager.loadInitialBookmarks).toHaveBeenCalledTimes(1);
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
      <AppContextProvider user={null}>
        <NewTabUI user={null} /> 
      </AppContextProvider>
    );

    expect(useBookmarkManager.loadInitialBookmarks).not.toHaveBeenCalled();
    expect(fetchUserAttributes).not.toHaveBeenCalled();
    expect(screen.getByText('Signed In: false')).toBeInTheDocument();
  });

  it('should add an empty bookmark group if one does not exist after loading', async () => {
    // Create a mock setter function for the test to track
    const mockSetBookmarkGroups = jest.fn();
    useBookmarkManager.loadInitialBookmarks.mockResolvedValue(mockBookmarkGroups);
  
    // Use the real Context.Provider to supply a mocked value
    render(
      <AppContext.Provider value={{ userId: mockUserId, bookmarkGroups: mockBookmarkGroups, setBookmarkGroups: mockSetBookmarkGroups }}>
        <NewTabUI user={mockUser} />
      </AppContext.Provider>
    );
  
    await waitFor(() => {
      // Assert that the management function was called with the state and the mock setter
      expect(mockAddEmptyBookmarkGroup).toHaveBeenCalledWith();
    });
  });

  it('should NOT add an empty bookmark group if one already exists', async () => {
    // Create a mock setter function for the test to track
    const mockSetBookmarkGroups = jest.fn();

    useBookmarkManager.loadInitialBookmarks.mockResolvedValue(mockBookmarkGroupsWithEmpty);
    
    render(
      <AppContextProvider user={mockUser}>
        <NewTabUI user={mockUser} />
      </AppContextProvider>
    );

    // Wait for the UI to update based on the fetched data.
    // This confirms the provider's useEffect and setState have completed.
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });
  
    // Assert that the function to add a new empty group was NOT called.
    expect(mockAddEmptyBookmarkGroup).not.toHaveBeenCalled();
  });
  
  it('should listen for storage changes and reload data accordingly', async () => {
    render(
      <AppContextProvider user={mockUser}>
        <NewTabUI user={mockUser} />
      </AppContextProvider>
    );

    expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);

    // Get the handler function that was passed to the listener
    const storageChangeHandler = chrome.storage.onChanged.addListener.mock.calls[0][0];
    
    // Simulate a storage change event for the relevant key
    const storageKey = Utilities.getUserStorageKey(mockUserId);
    const changes = { [storageKey]: { oldValue: [], newValue: [] } };
    const area = 'local';
    
    useBookmarkManager.loadInitialBookmarks.mockClear(); // Reset mock for this check

    await act(async () => {
      await storageChangeHandler(changes, area);
    });

    await waitFor(() => {
      expect(useBookmarkManager.loadInitialBookmarks).toHaveBeenCalledTimes(1);
    });
  });
  
  it('should clean up the storage listener on unmount', () => {
    const { unmount } = render(
      <AppContextProvider user={mockUser}>
        <NewTabUI user={mockUser} />
      </AppContextProvider>
    );    
    unmount();

    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
  });

  it('should handle interactions from the TopBanner component', async () => {
    const mockSetBookmarkGroups = jest.fn();

    render(
      <AppContext.Provider value={{ userId: mockUserId, bookmarkGroups: mockBookmarkGroups, setBookmarkGroups: mockSetBookmarkGroups }}>
        <NewTabUI user={mockUser} signOut={mockSignOut} />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Signed In: true')).toBeInTheDocument();
    });

    // Simulate user clicks on the mocked buttons
    fireEvent.click(screen.getByText('Load Bookmarks'));
    expect(mockImportBookmarksFromJSON).toHaveBeenCalledWith();

    fireEvent.click(screen.getByText('Export Bookmarks'));
    expect(mockExportBookmarksToJSON).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should log an error if fetching user attributes fails', async () => {
    const fetchError = new Error('Failed to fetch attributes');
    fetchUserAttributes.mockRejectedValue(fetchError);
    
    render(
      <AppContextProvider user={mockUser}>
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