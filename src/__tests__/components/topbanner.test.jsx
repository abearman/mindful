import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBanner from '@/components/TopBanner'; 
import { AppContext } from '@/scripts/AppContext'; 

// Mock CSS imports for Jest
jest.mock('@/styles/components/top-banner.css', () => ({}));

describe('TopBanner Component', () => {
  // Mock handler functions that are passed as props
  const mockOnLoadBookmarks = jest.fn();
  const mockOnExportBookmarks = jest.fn();
  const mockOnSignIn = jest.fn();
  const mockOnSignOut = jest.fn();
  const mockChangeStorageType = jest.fn();

  // Mock user data for the signed-in state
  const mockUserAttributes = {
    given_name: 'Jane',
    family_name: 'Doe',
  };

  // Reset all mocks before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test Suite for Signed-Out State ---
  describe('when user is signed out', () => {
    beforeEach(() => {
      const mockContext = {
        storageType: 'local', 
      };

      // Render the component in a signed-out state
      render(
        <AppContext.Provider value={mockContext}>
          <TopBanner
            onLoadBookmarks={mockOnLoadBookmarks}
            onExportBookmarks={mockOnExportBookmarks}
            userAttributes={mockUserAttributes}
            onSignIn={mockOnSignIn}
            onSignOut={mockOnSignOut}
            isSignedIn={false}
            onStorageTypeChange={mockChangeStorageType}
          />
        </AppContext.Provider>
      );
    });

    it('should render the logo and main action buttons', () => {
      expect(screen.getByText('Mindful')).toBeInTheDocument();
      expect(screen.getByTitle('Load Bookmarks')).toBeInTheDocument();
      expect(screen.getByTitle('Export Bookmarks')).toBeInTheDocument();
    });

    it('should display a login button and not the user avatar', () => {
      expect(screen.getByTitle('Login')).toBeInTheDocument();
      expect(screen.queryByTitle('User Menu')).not.toBeInTheDocument();
    });

    it('should call the correct handlers when buttons are clicked', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByTitle('Load Bookmarks'));
      expect(mockOnLoadBookmarks).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTitle('Export Bookmarks'));
      expect(mockOnExportBookmarks).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTitle('Login'));
      expect(mockOnSignIn).toHaveBeenCalledTimes(1);
    });
  });

  // --- Test Suite for Signed-In State ---
  describe('when user is signed in', () => {
    beforeEach(() => {
      const mockContext = {
        storageType: 'remote', 
      };

      // Render the component in a signed-in state
      render(
        <AppContext.Provider value={mockContext}>
          <TopBanner
            onLoadBookmarks={mockOnLoadBookmarks}
            onExportBookmarks={mockOnExportBookmarks}
            userAttributes={mockUserAttributes}
            onSignIn={mockOnSignIn}
            onSignOut={mockOnSignOut}
            isSignedIn={true}
            onStorageTypeChange={mockChangeStorageType}
          />
        </AppContext.Provider>
      );
    });

    it('should render the user avatar with correct initials and not the login button', () => {
      expect(screen.getByText('JD')).toBeInTheDocument(); // Initials for Jane Doe
      expect(screen.queryByTitle('Login')).not.toBeInTheDocument();
    });

    it('should toggle the user dropdown menu when the avatar is clicked', async () => {
      const user = userEvent.setup();
      
      // Dropdown is initially closed
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();

      // Click to open the dropdown
      await user.click(screen.getByTitle('User Menu'));
      expect(screen.getByText('Logout')).toBeInTheDocument();

      // Click again to close the dropdown
      await user.click(screen.getByTitle('User Menu'));
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('should call onSignOut and close the dropdown when logout is clicked', async () => {
      const user = userEvent.setup();
      
      // Open the dropdown first
      await user.click(screen.getByTitle('User Menu'));
      
      // Click the logout button
      await user.click(screen.getByText('Logout'));
      
      // Assert that onSignOut was called and the menu is closed
      expect(mockOnSignOut).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('should close the dropdown menu when clicking outside the component', async () => {
        const user = userEvent.setup();
        
        // Open the dropdown
        await user.click(screen.getByTitle('User Menu'));
        expect(screen.getByText('Logout')).toBeInTheDocument();

        // Simulate a click on the document body (outside the menu)
        await user.click(document.body);
        
        // Assert that the menu is now closed
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('should display the storage toggle in the correct state', async () => {
      // First, open the dropdown. Otherwise the storage toggle won't be visible in the DOM.
      const user = userEvent.setup();
      await user.click(screen.getByTitle('User Menu'));

      // Find the toggle switch. Querying by role is robust and good for accessibility.
      const storageToggle = screen.getByRole('checkbox');

      // Based on the initial render where storageType is 'remote', it should be checked
      expect(storageToggle).toBeChecked();
    });

    it('should call onStorageTypeChange when the toggle is clicked', async () => {
      // First, open the dropdown. Otherwise the storage toggle won't be visible in the DOM.
      const user = userEvent.setup();
      await user.click(screen.getByTitle('User Menu'));

      const storageToggle = screen.getByRole('checkbox');

      // Simulate the user clicking the toggle
      await user.click(storageToggle);
      
      // Assert that the mock handler passed in via props was called
      expect(mockChangeStorageType).toHaveBeenCalledTimes(1);
    });
  });
});