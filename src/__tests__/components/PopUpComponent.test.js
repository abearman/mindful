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

// Mock the AWS Amplify auth module
jest.mock('aws-amplify/auth');

// Mock the custom hooks and utility functions
jest.mock('../../scripts/useBookmarkManager', () => ({
  useBookmarkManager: jest.fn(),
  loadInitialBookmarks: jest.fn(),
}));

jest.mock('../../scripts/Utilities', () => ({
  constructValidURL: jest.fn((url) => `https://` + url.replace(/^https?:\/\//, '')), // Simple mock implementation
}));

// Mock the chrome extension API, which is not available in the Jest (Node.js) environment
global.chrome = {
  tabs: {
    query: jest.fn((options, callback) => {
      callback([{ url: 'https://example.com', title: 'Mock Tab Title' }]);
    }),
  },
};

// --- Test Suites ---

describe('PopupApp Authentication Flow', () => {
  // Clear all mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    // Make getCurrentUser return a promise that never resolves for this test
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    render(<PopupApp />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test('shows "Please sign in" message when user is not authenticated', async () => {
    // Mock a rejected promise, simulating a logged-out user
    getCurrentUser.mockRejectedValue(new Error('No user signed in'));
    render(<PopupApp />);
    
    // Wait for the async checkUser to complete and the UI to update
    const signInMessage = await screen.findByText(/Please sign in on the new tab page first./i);
    expect(signInMessage).toBeInTheDocument();
  });
});

describe('PopUp Form Functionality', () => {
  // Tell Jest to use fake timers for this entire suite of tests
  jest.useFakeTimers();

  const mockAddBookmark = jest.fn();
  const mockUser = { userId: 'test-user-123', username: 'testuser' };
  const mockBookmarkGroups = [
    { id: '1', groupName: 'Tech' },
    { id: '2', groupName: 'Recipes' },
  ];

  // Before each test in this suite, set up a logged-in state
  beforeEach(async () => {
    // Mock a successful authentication
    getCurrentUser.mockResolvedValue(mockUser);

    // Mock the return value of the initial data fetch
    loadInitialBookmarks.mockResolvedValue(mockBookmarkGroups);
    
    // Mock the hook that provides actions like addNamedBookmark
    useBookmarkManager.mockReturnValue({
      addNamedBookmark: mockAddBookmark,
    });

    render(<PopupApp />);

    // Wait for the component to finish loading and render the form
    await waitFor(() => {
      expect(screen.getByRole('form')).toBeInTheDocument();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('renders the form with initial values from the current tab', () => {
    expect(screen.getByRole('heading', { name: /Mindful/i })).toBeInTheDocument();
    
    // Check if inputs are pre-filled by the mocked chrome.tabs.query
    expect(screen.getByLabelText(/name/i)).toHaveValue('Mock Tab Title');
    expect(screen.getByLabelText(/url/i)).toHaveValue('https://example.com');
  });

  test('populates the group dropdown and selects the first group by default', () => {
    const groupDropdown = screen.getByLabelText(/group/i);
    expect(groupDropdown).toHaveValue('Tech'); // First group from our mock data
    expect(screen.getByRole('option', { name: 'Tech' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipes' })).toBeInTheDocument();
  });

  test('updates form state when user types in inputs', () => {
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'My New Bookmark' } });
    expect(nameInput).toHaveValue('My New Bookmark');
  });

  test('shows and allows typing in the "New Group" input when selected', async () => {
    // The input for a new group name should not be visible initially
    expect(screen.queryByLabelText(/new group/i)).not.toBeInTheDocument();

    // Select "New Group" from the dropdown
    const groupDropdown = screen.getByLabelText(/group/i);
    fireEvent.change(groupDropdown, { target: { value: 'New Group' } });

    // The new group input should now be visible
    const newGroupInput = await screen.findByLabelText(/new group/i);
    expect(newGroupInput).toBeInTheDocument();

    // Simulate typing a new group name
    fireEvent.change(newGroupInput, { target: { value: 'My Cool Project' } });
    expect(newGroupInput).toHaveValue('My Cool Project');
  });

  test('calls addNamedBookmark with correct data when submitting with an existing group', async () => {
    // Select the "Recipes" group
    const groupDropdown = screen.getByLabelText(/group/i);
    fireEvent.change(groupDropdown, { target: { value: 'Recipes' } });

    // Click the submit button
    const submitButton = screen.getByRole('button', { name: /add bookmark/i });
    fireEvent.click(submitButton);

    // Wait for the handleSubmit async function to complete
    await waitFor(() => {
      // Check if our mocked addNamedBookmark function was called with the correct arguments
      expect(mockAddBookmark).toHaveBeenCalledWith(
        'Mock Tab Title',
        'https://example.com', // constructValidURL mock will format this
        'Recipes'
      );
    });
  });

  test('calls addNamedBookmark with correct data when submitting with a new group', async () => {
    // Select "New Group"
    const groupDropdown = screen.getByLabelText(/group/i);
    fireEvent.change(groupDropdown, { target: { value: 'New Group' } });

    // Find and fill the new group input
    const newGroupInput = await screen.findByLabelText(/new group/i);
    fireEvent.change(newGroupInput, { target: { value: 'Social Media' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add bookmark/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddBookmark).toHaveBeenCalledWith(
        'Mock Tab Title',
        'https://example.com',
        'Social Media' // The value from the new group input
      );
    });
  });
});