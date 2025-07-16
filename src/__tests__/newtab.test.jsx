import React from 'react';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// The component to test (must be exported from its file)
import { NewTabUI } from '../NewTab'; 

// Mock dependencies
import { AppContext } from '../scripts/AppContext.jsx';
import * as BookmarkManagement from '../scripts/BookmarkManagement.js';
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

// Helper function to render the component with a mock context
const renderWithContext = (component, providerProps) => {
  return render(
    <AppContext.Provider value={providerProps}>
      {component}
    </AppContext.Provider>
  );
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
  let mockSetBookmarkGroups;
  let mockSignOut;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup common mocks
    mockSetBookmarkGroups = jest.fn();
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
    renderWithContext(
      <NewTabUI user={mockUser} signOut={mockSignOut} />,
      { bookmarkGroups: [], setBookmarkGroups: mockSetBookmarkGroups }
    );
    
    expect(BookmarkManagement.loadBookmarkGroups).toHaveBeenCalledTimes(1);
    expect(fetchUserAttributes).toHaveBeenCalledTimes(1);

    // Wait for asynchronous operations and state updates to complete
    await waitFor(() => {
      expect(mockSetBookmarkGroups).toHaveBeenCalledWith(mockBookmarkGroups);
    });

    // Check if TopBanner receives the correct props after data loading
    expect(screen.getByText('Signed In: true')).toBeInTheDocument();
    expect(screen.getByText(mockUserAttributes.email)).toBeInTheDocument();

    // Check if DraggableGrid receives the loaded groups
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('should not load data if no user is present', () => {
    renderWithContext(
      <NewTabUI user={null} />,
      { bookmarkGroups: [], setBookmarkGroups: mockSetBookmarkGroups }
    );

    expect(BookmarkManagement.loadBookmarkGroups).not.toHaveBeenCalled();
    expect(fetchUserAttributes).not.toHaveBeenCalled();
    expect(screen.getByText('Signed In: false')).toBeInTheDocument();
  });

  it('should add an empty bookmark group if one does not exist after loading', async () => {
    BookmarkManagement.loadBookmarkGroups.mockResolvedValue(mockBookmarkGroups);
    
    // The component starts with loading=true, so the effect to add a group won't run.
    // After load completes, loading becomes false and bookmarkGroups updates, triggering the effect.
    renderWithContext(<NewTabUI user={mockUser} />, {
      bookmarkGroups: mockBookmarkGroups, 
      setBookmarkGroups: mockSetBookmarkGroups
    });
    
    await waitFor(() => {
      // This effect runs after the initial load is complete.
      expect(BookmarkManagement.addEmptyBookmarkGroup).toHaveBeenCalledWith(mockSetBookmarkGroups);
    });
  });

  it('should NOT add an empty bookmark group if one already exists', async () => {
    BookmarkManagement.loadBookmarkGroups.mockResolvedValue(mockBookmarkGroupsWithEmpty);
    
    renderWithContext(<NewTabUI user={mockUser} />, { 
      bookmarkGroups: mockBookmarkGroupsWithEmpty, 
      setBookmarkGroups: mockSetBookmarkGroups
    });

    // Wait for all async effects to settle
    await waitFor(() => {
      expect(mockSetBookmarkGroups).toHaveBeenCalledWith(mockBookmarkGroupsWithEmpty);
    });
    
    // Assert that the function was never called because an empty group was found
    expect(BookmarkManagement.addEmptyBookmarkGroup).not.toHaveBeenCalled();
  });
  
  it('should listen for storage changes and reload data accordingly', async () => {
    renderWithContext(<NewTabUI user={mockUser} />, { bookmarkGroups: [], setBookmarkGroups: mockSetBookmarkGroups });

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
    const { unmount } = renderWithContext(<NewTabUI user={mockUser} />, { bookmarkGroups: [], setBookmarkGroups: mockSetBookmarkGroups });
    
    unmount();

    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
  });

  it('should handle interactions from the TopBanner component', async () => {
    renderWithContext(<NewTabUI user={mockUser} signOut={mockSignOut} />, { bookmarkGroups: mockBookmarkGroups, setBookmarkGroups: mockSetBookmarkGroups });

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
    
    renderWithContext(<NewTabUI user={mockUser} />, { bookmarkGroups: [], setBookmarkGroups: mockSetBookmarkGroups });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user attributes:", fetchError);
    });

    // Verify the component still renders correctly without crashing
    expect(screen.getByTestId('top-banner')).toBeInTheDocument();
    expect(screen.getByTestId('draggable-grid')).toBeInTheDocument();
  });
});