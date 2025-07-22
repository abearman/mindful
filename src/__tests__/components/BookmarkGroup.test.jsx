import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BookmarkGroup } from '../../components/BookmarkGroup';
import { EMPTY_GROUP_IDENTIFIER } from '../../scripts/Constants';

// Mock child components to isolate the BookmarkGroup component for testing.
// This prevents errors from props that are not relevant to this component's test.
jest.mock('../../components/SortableItem.jsx', () => ({
  SortableItem: ({ children }) => <div data-testid="sortable-item">{children}</div>,
}));
jest.mock('../../components/EditableBookmarkGroupHeading.jsx', () => ({
  EditableBookmarkGroupHeading: () => <div data-testid="editable-heading"></div>,
}));
jest.mock('../../components/EditableBookmark.jsx', () => ({
  EditableBookmark: () => <div data-testid="editable-bookmark"></div>,
}));
jest.mock('../../components/AddBookmarkInline.jsx', () => ({
  AddBookmarkInline: () => <div data-testid="add-bookmark-inline"></div>,
}));
// We also need to mock dnd-kit components to avoid rendering errors
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children }) => <div>{children}</div>,
}));
jest.mock('@dnd-kit/sortable', () => ({
  ...jest.requireActual('@dnd-kit/sortable'),
  SortableContext: ({ children }) => <div>{children}</div>,
}));


describe('BookmarkGroup', () => {
  // Define default props to be used in tests.
  const mockSensors = [];
  const mockHandleDragEnd = jest.fn();
  const mockHandleDeleteBookmarkGroup = jest.fn();

  const defaultProps = {
    groupIndex: 0,
    sensors: mockSensors,
    handleDragEnd: mockHandleDragEnd,
    handleDeleteBookmarkGroup: mockHandleDeleteBookmarkGroup,
  };

  // Clear all mocks before each test to ensure a clean state.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the group has a name', () => {
    const namedGroupProps = {
      ...defaultProps,
      bookmarkGroup: {
        id: 'group-1',
        groupName: 'Social Media',
        bookmarks: [
          { id: 'bookmark-1', name: 'Twitter', url: 'https://twitter.com' },
          { id: 'bookmark-2', name: 'Facebook', url: 'https://facebook.com' },
        ],
      },
    };

    it('should render the delete button, bookmarks, and add form', () => {
      render(<BookmarkGroup {...namedGroupProps} />);

      // Check for the delete button
      expect(screen.getByRole('button', { name: /delete group/i })).toBeInTheDocument();
      
      // Check for the heading component
      expect(screen.getByTestId('editable-heading')).toBeInTheDocument();

      // Check that all bookmarks are rendered
      expect(screen.getAllByTestId('editable-bookmark')).toHaveLength(2);

      // Check for the inline "add bookmark" component
      expect(screen.getByTestId('add-bookmark-inline')).toBeInTheDocument();
    });

    it('should call handleDeleteBookmarkGroup with the correct index when delete is clicked', () => {
      render(<BookmarkGroup {...namedGroupProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete group/i });
      fireEvent.click(deleteButton);

      expect(mockHandleDeleteBookmarkGroup).toHaveBeenCalledTimes(1);
      // The first argument is the event object, the second is the groupIndex.
      expect(mockHandleDeleteBookmarkGroup).toHaveBeenCalledWith(expect.any(Object), namedGroupProps.groupIndex);
    });
  });

  describe('when the group name is the empty identifier', () => {
    const emptyGroupProps = {
      ...defaultProps,
      bookmarkGroup: {
        id: 'group-2',
        groupName: EMPTY_GROUP_IDENTIFIER,
        bookmarks: [
            { id: 'bookmark-3', name: 'Google', url: 'https://google.com' },
        ],
      },
    };

    it('should hide the delete button and the add bookmark form', () => {
      render(<BookmarkGroup {...emptyGroupProps} />);
      
      // Use queryByRole for elements that should NOT exist.
      // getByRole would throw an error, which is not what we want to assert.
      expect(screen.queryByRole('button', { name: /delete group/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-bookmark-inline')).not.toBeInTheDocument();
      
      // Ensure the other parts still render correctly
      expect(screen.getByTestId('editable-heading')).toBeInTheDocument();
      expect(screen.getAllByTestId('editable-bookmark')).toHaveLength(1);
    });
  });
});