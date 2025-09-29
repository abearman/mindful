import React, { useContext, useState, useEffect } from 'react';

/* Hooks and Utilities */
import { AppContext } from "@/scripts/AppContextProvider";
import { constructValidURL } from '@/scripts/Utilities';
import { useBookmarkManager } from '@/hooks/useBookmarkManager'; 

/* Constants */
import { URL_PATTERN, EMPTY_GROUP_IDENTIFIER } from '@/scripts/Constants.js';


export default function PopupComponent() {
  // Consume state from the context. All data now flows from here.
  const { bookmarkGroups } = useContext(AppContext);

  // Get actions from the custom bookmarks hook.
  const { addNamedBookmark } = useBookmarkManager();

  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  // Effect to set the initial URL and Title from the current tab.
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        setUrl(tabs[0].url);
        setName(tabs[0].title);
      }
    });
  }, []); // Runs only once on component mount.

  // Effect to set the default dropdown value when bookmark groups are loaded or changed.
  useEffect(() => {
    if (bookmarkGroups && bookmarkGroups.length > 0) {
      // Find the first available group that isn't the special "empty" one
      const firstSelectableGroup = bookmarkGroups.find(
        (group) => group.groupName !== EMPTY_GROUP_IDENTIFIER
      );
      if (firstSelectableGroup) {
        setSelectedGroup(firstSelectableGroup.groupName);
      } else {
        // If only the "empty" group exists, default to creating a new one.
        setSelectedGroup('New Group');
      }
    } else {
      setSelectedGroup('New Group');
    }
  }, [bookmarkGroups]); // Reruns whenever the bookmark groups from context change.

  const handleSubmit = async (event) => {
    event.preventDefault();
    const groupName = selectedGroup === 'New Group' ? newGroupInput : selectedGroup;
    
    // Ensure new group name is not empty if selected
    if (groupName === '' || !groupName) {
        alert("Please enter a name for the new group.");
        return;
    }

    const urlWithProtocol = constructValidURL(url);
    
    // addNamedBookmark will handle all state updates and storage.
    // The component doesn't need to manage this itself.
    await addNamedBookmark(name, urlWithProtocol, groupName);

    // Optional: Close the popup window after successful submission
    window.close();
  };

  // Memoize group options to prevent re-calculation on every render
  const groupOptions = React.useMemo(() => 
    bookmarkGroups
      .filter(group => group.groupName !== EMPTY_GROUP_IDENTIFIER)
      .map(group => (
        <option key={group.id} value={group.groupName}>
          {group.groupName}
        </option>
      )), [bookmarkGroups]);

  return (
    <div className="min-w-[360px] max-w-[420px] p-4
                   bg-gray-100 dark:bg-neutral-950
                   text-neutral-800 dark:text-neutral-200">
      <div className="rounded-2xl border shadow-xl backdrop-blur px-5 py-4
                      bg-white dark:bg-neutral-900
                      border-neutral-200/70 dark:border-neutral-800/70">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">Mindful</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="group-dropdown" 
                   className="text-neutral-700 dark:text-neutral-300">
              Group
            </label>
            <select
              id="group-dropdown"
              className="w-full rounded-2xl border px-3 py-2 outline-none 
                       bg-neutral-100 dark:bg-neutral-900
                       border-neutral-200 dark:border-neutral-800 
                       text-neutral-700 dark:text-neutral-300
                       focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {groupOptions}
              <option value="New Group">New Group</option>
            </select>

            {selectedGroup === 'New Group' && (
              <div className="space-y-1">
                <label htmlFor="new-group-input" 
                       className="text-neutral:700 dark:text-neutral-300">
                  New Group Name
                </label>
                <input
                  id="new-group-input"
                  className="w-full rounded-2xl border px-3 py-2 outline-none
                           bg-neutral-100 dark:bg-neutral-900
                           border-neutral-200 dark:border-neutral-800 
                           text-neutral-900 dark:text-neutral-100 
                           focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  value={newGroupInput}
                  onChange={(e) => setNewGroupInput(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="bookmark-name" 
                     className=" text-neutral-700 dark:text-neutral-300">
                Name
              </label>
              <input
                id="bookmark-name"
                className="w-full rounded-2xl border px-3 py-2 outline-none
                          bg-neutral-100 dark:bg-neutral-900
                          border-neutral-200 dark:border-neutral-800 
                          text-neutral-900 dark:text-neutral-100 
                          focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="bookmark-url" 
                     className="text-neutral-700 dark:text-neutral-300">
                URL
              </label>
              <input
                id="bookmark-url"
                pattern={URL_PATTERN}
                className="w-full rounded-2xl border px-3 py-2 outline-none
                          bg-neutral-100 dark:bg-neutral-900
                          border-neutral-200 dark:border-neutral-800 
                          text-neutral-900 dark:text-neutral-100
                          focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full rounded-2xl px-4 py-2 font-semibold transition
                       bg-blue-600 hover:bg-blue-500
                       text-white">
              Add Bookmark
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}