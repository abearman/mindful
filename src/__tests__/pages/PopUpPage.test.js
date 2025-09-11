// src/__tests__/components/PopUpComponent.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// 🔁 Test the WRAPPER that handles Loading/Signed-out/Signed-in
import PopupPage from '@/pages/PopupPage';

// Mocks
import { getCurrentUser } from 'aws-amplify/auth';
import { useBookmarkManager } from '@/hooks/useBookmarkManager';

// --------------------
// Shared mock data
// --------------------
const MOCK_BOOKMARK_GROUPS = [
  { id: '1', groupName: 'Tech' },
  { id: '2', groupName: 'Recipes' },
];

// --------------------
// Module mocks
// --------------------

// Mock Amplify.configure and the json it loads
jest.mock('aws-amplify', () => ({ Amplify: { configure: jest.fn() } }));
jest.mock('/amplify_outputs.json', () => ({}), { virtual: true });

// Mock Amplify Auth
jest.mock('aws-amplify/auth');

// Provide a tiny AppContext + Provider so the inner component can consume groups
jest.mock('@/scripts/AppContextProvider', () => {
  const React = require('react');
  const AppContext = React.createContext({});
  const AppContextProvider = ({ children }) => (
    <AppContext.Provider value={{ bookmarkGroups: MOCK_BOOKMARK_GROUPS }}>
      {children}
    </AppContext.Provider>
  );
  return { AppContext, AppContextProvider };
});

// Mock bookmark manager hook
jest.mock('@/hooks/useBookmarkManager', () => ({
  useBookmarkManager: jest.fn(() => ({ addNamedBookmark: jest.fn() })),
  loadInitialBookmarks: jest.fn(),
}));

// Utilities
jest.mock('@/scripts/Utilities', () => ({
  constructValidURL: jest.fn((url) => 'https://' + url.replace(/^https?:\/\//, '')),
}));

// --------------------
// Browser API shims for JSDOM
// --------------------
global.chrome = {
  tabs: {
    query: jest.fn((opts, cb) => {
      cb([{ url: 'https://example.com', title: 'Mock Tab Title' }]);
    }),
  },
};
global.window.close = jest.fn();

// --------------------
// Tests
// --------------------
describe('PopupPage Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    // pending promise -> wrapper should render "Loading..."
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    render(<PopupPage />);
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
  });

  test('shows "Please sign in" when user is not authenticated', async () => {
    getCurrentUser.mockRejectedValue(new Error('No user signed in'));
    render(<PopupPage />);
    expect(
      await screen.findByText(/Please sign in on the new tab page to add bookmarks\./i)
    ).toBeInTheDocument();
  });
});

describe('PopUp form via PopupPage (signed-in)', () => {
  let mockAddNamedBookmark;

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ userId: 'test-user-123', username: 'testuser' });

    // Override the default hook return to capture submissions
    mockAddNamedBookmark = jest.fn();
    useBookmarkManager.mockReturnValue({ addNamedBookmark: mockAddNamedBookmark });
  });

  test('renders the form with initial values from the current tab', async () => {
    render(<PopupPage />);

    expect(await screen.findByRole('heading', { name: /mindful/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Mock Tab Title');
    expect(screen.getByLabelText(/^url$/i)).toHaveValue('https://example.com');
  });

  test('populates the group dropdown and selects the first group by default', async () => {
    render(<PopupPage />);

    await screen.findByRole('option', { name: 'Tech' });

    const groupDropdown = screen.getByLabelText(/^group$/i);
    expect(groupDropdown).toHaveValue('Tech');
    expect(screen.getByRole('option', { name: 'Recipes' })).toBeInTheDocument();
  });

  test('shows and allows typing in the "New Group" input when selected', async () => {
    render(<PopupPage />);

    await screen.findByRole('heading', { name: /mindful/i });
    expect(screen.queryByLabelText(/New Group Name/i)).not.toBeInTheDocument();

    const groupDropdown = screen.getByLabelText(/^group$/i);
    fireEvent.change(groupDropdown, { target: { value: 'New Group' } });

    const newGroupInput = screen.getByLabelText(/New Group Name/i);
    expect(newGroupInput).toBeInTheDocument();

    fireEvent.change(newGroupInput, { target: { value: 'My Cool Project' } });
    expect(newGroupInput).toHaveValue('My Cool Project');
  });

  test('submits with an existing group', async () => {
    render(<PopupPage />);
    const groupDropdown = await screen.findByLabelText(/^group$/i);
    fireEvent.change(groupDropdown, { target: { value: 'Recipes' } });

    fireEvent.click(screen.getByRole('button', { name: /add bookmark/i }));

    await waitFor(() => {
      expect(mockAddNamedBookmark).toHaveBeenCalledWith(
        'Mock Tab Title',
        'https://example.com',
        'Recipes'
      );
    });
    expect(global.window.close).toHaveBeenCalledTimes(1);
  });

  test('submits with a new group', async () => {
    render(<PopupPage />);

    const groupDropdown = await screen.findByLabelText(/^group$/i);
    fireEvent.change(groupDropdown, { target: { value: 'New Group' } });

    const newGroupInput = screen.getByLabelText(/New Group Name/i);
    fireEvent.change(newGroupInput, { target: { value: 'Social Media' } });

    fireEvent.click(screen.getByRole('button', { name: /add bookmark/i }));

    await waitFor(() => {
      expect(mockAddNamedBookmark).toHaveBeenCalledWith(
        'Mock Tab Title',
        'https://example.com',
        'Social Media'
      );
    });
    expect(global.window.close).toHaveBeenCalledTimes(1);
  });
});
