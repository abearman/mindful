import React from 'react';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// The component to test
import { NewTabPage } from '../../components/NewTabComponent';

// Mock dependencies
import { AppContextProvider, AppContext } from '../../scripts/AppContext';
import * as useBookmarkManager from '../../scripts/useBookmarkManager';
import * as Utilities from '../../scripts/Utilities';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { EMPTY_GROUP_IDENTIFIER, StorageType } from '../../scripts/Constants'; // ✅ Import StorageType

// Mock child components for isolation
jest.mock('../../components/TopBanner.jsx', () => (props) => (
  <div data-testid="top-banner">
    <button onClick={props.onLoadBookmarks}>Load Bookmarks</button>
    <button onClick={props.onExportBookmarks}>Export Bookmarks</button>
    <button onClick={props.onSignOut}>Sign Out</button>
    <span>{`Signed In: ${props.isSignedIn}`}</span>
    <span>{props.userAttributes?.email}</span>
  </div>
));

jest.mock('../../components/DraggableGrid.jsx', () => ({ bookmarkGroups }) => (
  <div data-testid="draggable-grid">
    {bookmarkGroups?.map(group => <div key={group.groupName}>{group.groupName}</div>)}
  </div>
));

// Mock external modules
jest.mock('aws-amplify/auth');
jest.mock('../../scripts/useBookmarkManager.js', () => ({
  loadInitialBookmarks: jest.fn(),
  useBookmarkManager: jest.fn(),
}));
jest.mock('../../scripts/Utilities.js', () => ({
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

// ✅ Wrap the entire suite in describe.each
describe.each([
  { storageType: StorageType.LOCAL, description: 'local' },
  { storageType: StorageType.REMOTE, description: 'remote' },
])('NewTabPage Component with $description storage', ({ storageType }) => {
  let mockSignOut;
  let consoleErrorSpy;
  let mockAddEmptyBookmarkGroup;
  let mockExportBookmarksToJSON;
  let mockImportBookmarksFromJSON;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAddEmptyBookmarkGroup = jest.fn();
    mockExportBookmarksToJSON = jest.fn();
    mockImportBookmarksFromJSON = jest.fn();

    useBookmarkManager.useBookmarkManager.mockReturnValue({
      addEmptyBookmarkGroup: mockAddEmptyBookmarkGroup,
      exportBookmarksToJSON: mockExportBookmarksToJSON,
      importBookmarksFromJSON: mockImportBookmarksFromJSON,
    });

    mockSignOut = jest.fn();
    useBookmarkManager.loadInitialBookmarks.mockResolvedValue(mockBookmarkGroups);
    Utilities.getUserStorageKey.mockReturnValue(`bookmarks_${mockUserId}`);
    fetchAuthSession.mockResolvedValue({ identityId: mockUserId });

    // ✅ Configure mocks based on the current storageType for the test run
    fetchUserAttributes.mockResolvedValue({
      ...mockUserAttributes,
      'custom:storage_type': storageType,
    });

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it('should load bookmarks and user attributes when a user is present', async () => {
    render(
      <AppContextProvider>
        <NewTabPage user={mockUser} signOut={mockSignOut} />
      </AppContextProvider>
    );

    await screen.findByTestId('top-banner');
    
    // This assertion now checks the call from the AppContext, not NewTabPage
    expect(fetchUserAttributes).toHaveBeenCalledTimes(1);
    
    await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument();
        expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    expect(screen.getByText('Signed In: true')).toBeInTheDocument();
    expect(screen.getByText(mockUserAttributes.email)).toBeInTheDocument();
  });

  it('should not load data if no user is present', async () => {
    fetchAuthSession.mockRejectedValue(new Error('No user is signed in.'));
    fetchUserAttributes.mockRejectedValue(new Error('No user is signed in.'));

    render(
      <AppContextProvider>
        <NewTabPage user={null} />
      </AppContextProvider>
    );

    await screen.findByTestId('top-banner');

    expect(useBookmarkManager.loadInitialBookmarks).not.toHaveBeenCalled();
    // If no user is logged in, we do not fetch any attributes.
    expect(fetchUserAttributes).not.toHaveBeenCalled(); 
    expect(screen.getByText('Signed In: false')).toBeInTheDocument();
  });

  it('should add an empty bookmark group if one does not exist after loading', async () => {
    useBookmarkManager.loadInitialBookmarks.mockResolvedValue(mockBookmarkGroups);
    render(
        <AppContextProvider>
            <NewTabPage user={mockUser} />
        </AppContextProvider>
    );

    await waitFor(() => {
        expect(mockAddEmptyBookmarkGroup).toHaveBeenCalledTimes(1);
    });
  });

  // ✅ Conditionally run tests that are only relevant for LOCAL storage
  if (storageType === StorageType.LOCAL) {
    it('should listen for storage changes and reload data accordingly', async () => {
      render(
        <AppContextProvider>
          <NewTabPage user={mockUser} />
        </AppContextProvider>
      );

      await screen.findByTestId('top-banner');
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);

      const storageChangeHandler = chrome.storage.onChanged.addListener.mock.calls[0][0];
      const storageKey = Utilities.getUserStorageKey(mockUserId);
      const changes = { [storageKey]: { oldValue: [], newValue: [] } };
      
      useBookmarkManager.loadInitialBookmarks.mockClear();

      await act(async () => {
        await storageChangeHandler(changes, 'local');
      });

      await waitFor(() => {
        expect(useBookmarkManager.loadInitialBookmarks).toHaveBeenCalledTimes(1);
      });
    });

    it('should clean up the storage listener on unmount', async () => {
      const { unmount } = render(
        <AppContextProvider>
          <NewTabPage user={mockUser} />
        </AppContextProvider>
      );
      
      await screen.findByTestId('top-banner');
      unmount();
      
      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
    });
  }

  it('should handle interactions from the TopBanner component', async () => {
    render(
      <AppContextProvider>
        <NewTabPage user={mockUser} signOut={mockSignOut} />
      </AppContextProvider>
    );

    await screen.findByTestId('top-banner');

    fireEvent.click(screen.getByText('Load Bookmarks'));
    expect(mockImportBookmarksFromJSON).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Export Bookmarks'));
    expect(mockExportBookmarksToJSON).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});