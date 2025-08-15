import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// The component to test, which includes PopUp and its wrapper
import PopupApp from '../../components/PopUpComponent';

// Mock dependencies
import { getCurrentUser } from 'aws-amplify/auth';
import { useBookmarkManager } from '../../scripts/useBookmarkManager';
import { loadInitialBookmarks } from '../../scripts/useBookmarkManager';
import { constructValidURL } from '../../scripts/Utilities';

// --- Mocking Setup ---

// FIX: Define shared mock data in one place
const MOCK_BOOKMARK_GROUPS = [
    { id: '1', groupName: 'Tech' },
    { id: '2', groupName: 'Recipes' },
];

// Mock the AWS Amplify auth module
jest.mock('aws-amplify/auth');

// FIX: Simplify the mock for AppContextProvider to directly provide the necessary context value.
// This removes the complex dependency between mocks.
jest.mock('../../scripts/AppContext.jsx', () => ({
  ...jest.requireActual('../../scripts/AppContext.jsx'), // Import and retain default exports
  AppContextProvider: ({ children, user }) => {
    const AppContext = jest.requireActual('../../scripts/AppContext.jsx').AppContext;
    return (
        <AppContext.Provider value={{ bookmarkGroups: MOCK_BOOKMARK_GROUPS, user }}>
            {children}
        </AppContext.Provider>
    );
  },
}));

// FIX: Simplify this mock now that the data is provided directly by the AppContext mock.
jest.mock('../../scripts/useBookmarkManager', () => ({
    useBookmarkManager: jest.fn(),
    loadInitialBookmarks: jest.fn().mockResolvedValue(MOCK_BOOKMARK_GROUPS),
}));


jest.mock('../../scripts/Utilities', () => ({
  constructValidURL: jest.fn((url) => `https://` + url.replace(/^https?:\/\//, '')), // Simple mock implementation
}));

// Mock browser APIs that don't exist in the JSDOM (test) environment
global.chrome = {
  tabs: {
    query: jest.fn((options, callback) => {
      callback([{ url: 'https://example.com', title: 'Mock Tab Title' }]);
    }),
  },
};
// FIX: Mock window.close to prevent tests from hanging on form submission.
global.window.close = jest.fn();


// --- Test Suites ---

describe('PopupApp Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    render(<PopupApp />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test('shows "Please sign in" message when user is not authenticated', async () => {
    getCurrentUser.mockRejectedValue(new Error('No user signed in'));
    render(<PopupApp />);
    
    const signInMessage = await screen.findByText(/Please sign in on the new tab page to add bookmarks./i);
    expect(signInMessage).toBeInTheDocument();
  });
});

describe('PopUp Form Functionality', () => {
  const mockAddBookmark = jest.fn();
  const mockUser = { userId: 'test-user-123', username: 'testuser' };

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue(mockUser);
    useBookmarkManager.mockReturnValue({
      addNamedBookmark: mockAddBookmark,
    });
  });

  test('renders the form with initial values from the current tab', async () => {
    render(<PopupApp />);

    const heading = await screen.findByRole('heading', { name: /Mindful/i });
    expect(heading).toBeInTheDocument();
    
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Mock Tab Title');
    expect(screen.getByLabelText(/^url$/i)).toHaveValue('https://example.com');
  });

  test('populates the group dropdown and selects the first group by default', async () => {
    render(<PopupApp />);

    await screen.findByRole('heading', { name: /Mindful/i });
    await screen.findByRole('option', { name: 'Tech' });

    const groupDropdown = screen.getByLabelText(/^group$/i);
    expect(groupDropdown).toHaveValue('Tech');

    expect(screen.getByRole('option', { name: 'Tech' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipes' })).toBeInTheDocument();
  });

  test('updates form state when user types in inputs', async () => {
    render(<PopupApp />);

    const nameInput = await screen.findByLabelText(/^name$/i);
    
    fireEvent.change(nameInput, { target: { value: 'My New Bookmark' } });
    expect(nameInput).toHaveValue('My New Bookmark');
  });

  test('shows and allows typing in the "New Group" input when selected', async () => {
    render(<PopupApp />);

    await screen.findByRole('heading', { name: /Mindful/i });

    expect(screen.queryByLabelText(/New Group Name/i)).not.toBeInTheDocument();

    const groupDropdown = screen.getByLabelText(/^group$/i);
    fireEvent.change(groupDropdown, { target: { value: 'New Group' } });

    const newGroupInput = screen.getByLabelText(/New Group Name/i);
    expect(newGroupInput).toBeInTheDocument();

    fireEvent.change(newGroupInput, { target: { value: 'My Cool Project' } });
    expect(newGroupInput).toHaveValue('My Cool Project');
  });

  test('calls addNamedBookmark with correct data when submitting with an existing group', async () => {
    render(<PopupApp />);

    const groupDropdown = await screen.findByLabelText(/^group$/i);
    fireEvent.change(groupDropdown, { target: { value: 'Recipes' } });

    const submitButton = screen.getByRole('button', { name: /add bookmark/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddBookmark).toHaveBeenCalledWith(
        'Mock Tab Title',
        'https://example.com',
        'Recipes'
      );
    });
    // Also assert that window.close was called
    expect(global.window.close).toHaveBeenCalledTimes(1);
  });

  test('calls addNamedBookmark with correct data when submitting with a new group', async () => {
    render(<PopupApp />);

    const groupDropdown = await screen.findByLabelText(/^group$/i);
    fireEvent.change(groupDropdown, { target: { value: 'New Group' } });

    const newGroupInput = screen.getByLabelText(/New Group Name/i);
    fireEvent.change(newGroupInput, { target: { value: 'Social Media' } });

    const submitButton = screen.getByRole('button', { name: /add bookmark/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddBookmark).toHaveBeenCalledWith(
        'Mock Tab Title',
        'https://example.com',
        'Social Media'
      );
    });
    // Also assert that window.close was called
    expect(global.window.close).toHaveBeenCalledTimes(1);
  });
});
