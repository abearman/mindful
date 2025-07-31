import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookmarkItem } from '../../components/BookmarkItem';
import '@testing-library/jest-dom';

// Mock the useSortable hook from @dnd-kit/sortable
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: jest.fn(),
}));

// Mock the EditableBookmark component
jest.mock('../../components/EditableBookmark.jsx', () => ({
  EditableBookmark: jest.fn(({ bookmark }) => <div data-testid="editable-bookmark">{bookmark.title}</div>),
}));

// Import the mocked hook and component after mocking them
import { useSortable } from '@dnd-kit/sortable';
import { EditableBookmark } from '../../components/EditableBookmark';

describe('BookmarkItem', () => {
  const mockBookmark = { id: 'bookmark-1', title: 'Test Bookmark', url: 'https://example.com' };

  // This function sets up the mock return value for the useSortable hook
  const setupUseSortableMock = (isDragging) => {
    useSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: null,
      isDragging,
    });
  };

  // Test case 1: Component renders correctly
  test('renders the EditableBookmark component with correct props', () => {
    // The component is not being dragged in this test
    setupUseSortableMock(false);

    render(
      <BookmarkItem
        bookmark={mockBookmark}
        bookmarkIndex={0}
        groupIndex={0}
      />
    );

    // Check if EditableBookmark was called with the correct props
    expect(EditableBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmark: mockBookmark,
        bookmarkIndex: 0,
        groupIndex: 0,
      }),
      {}
    );

    // Check if the content of the bookmark is rendered
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
  });

  // Test case 2: Component style changes when dragging
  test('applies dragging styles when isDragging is true', () => {
    // The component is being dragged in this test
    setupUseSortableMock(true);

    const { container } = render(
      <BookmarkItem
        bookmark={mockBookmark}
        bookmarkIndex={0}
        groupIndex={0}
      />
    );

    // The outer div should have an opacity of 0 when dragging
    const outerDiv = container.firstChild;
    expect(outerDiv).toHaveStyle('opacity: 0');
  });

  // Test case 3: Component style is normal when not dragging
  test('applies default styles when isDragging is false', () => {
    // The component is not being dragged
    setupUseSortableMock(false);

    const { container } = render(
      <BookmarkItem
        bookmark={mockBookmark}
        bookmarkIndex={0}
        groupIndex={0}
      />
    );

    // The outer div should have an opacity of 1 when not dragging
    const outerDiv = container.firstChild;
    expect(outerDiv).toHaveStyle('opacity: 1');
  });
});
