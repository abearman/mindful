import React, { useContext, useState, useEffect } from 'react';

/* Hooks and Utilities */
import { AppContext } from "@/scripts/AppContextProvider";
import { constructValidURL } from '@/scripts/Utilities';
import { useBookmarkManager } from '@/hooks/useBookmarkManager';

/* Constants */
import { URL_PATTERN, EMPTY_GROUP_IDENTIFIER } from '@/scripts/Constants.js';

/** Persist last-selected group locally so we don't flicker on first paint. */
const LAST_GROUP_KEY = 'mindful:lastSelectedGroup';
const getStoredGroup = () => {
  try { return localStorage.getItem(LAST_GROUP_KEY) || ''; } catch { return ''; }
};
const setStoredGroup = (v) => {
  try { localStorage.setItem(LAST_GROUP_KEY, v || ''); } catch {}
};

export default function PopUpComponent() {
  // Pull both the fast index and the hydrated groups (arrives later) from context
  const { groupsIndex, bookmarkGroups } = useContext(AppContext);

  // Actions
  const { addNamedBookmark } = useBookmarkManager();

  // Seed selection from sync storage to avoid the “New Group → first group” jump
  const [selectedGroup, setSelectedGroup] = useState(() => getStoredGroup() || 'New Group');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  // Only choose a default once; don't clobber a user/stored choice when data arrives
  const choseInitialRef = React.useRef(false);

  // Resolve available groups quickly (use the small index immediately; hydrate later)
  const availableGroups = React.useMemo(() => {
    const base = (groupsIndex?.length ? groupsIndex : bookmarkGroups) || [];
    return base.filter((g) => g.groupName !== EMPTY_GROUP_IDENTIFIER);
  }, [groupsIndex, bookmarkGroups]);

  // Pick a stable initial selection exactly once:
  // 1) If stored value exists and is still valid, keep it.
  // 2) Else choose the first available group.
  // 3) Else fall back to "New Group".
  useEffect(() => {
    if (choseInitialRef.current) return;

    const stored = getStoredGroup();
    const hasStored = stored && availableGroups.some((g) => g.groupName === stored);

    if (hasStored) {
      setSelectedGroup(stored);
      choseInitialRef.current = true;
      return;
    }

    const first = availableGroups[0]?.groupName || 'New Group';
    setSelectedGroup(first);
    setStoredGroup(first);
    choseInitialRef.current = true;
  }, [availableGroups]);

  // Keep the selection stable and persisted on user changes
  const onGroupChange = (e) => {
    const val = e.target.value;
    setSelectedGroup(val);
    setStoredGroup(val);
    choseInitialRef.current = true;
  };

  // Prefill current tab URL and Title
  useEffect(() => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const t = tabs?.[0];
        if (!t) return;
        if (t.url) setUrl(t.url);
        if (t.title) setName(t.title);
      });
    } catch {
      /* noop in non-extension environments */
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const groupName = selectedGroup === 'New Group' ? newGroupInput.trim() : selectedGroup;

    // Ensure new group name is present if creating one
    if (!groupName) {
      alert("Please enter a name for the new group.");
      return;
    }

    const urlWithProtocol = constructValidURL(url);

    // Persist the user's last choice so next popup opens with it selected
    setStoredGroup(groupName);

    await addNamedBookmark(name.trim(), urlWithProtocol, groupName);

    // Optional: close the popup after successful submission
    try { window.close(); } catch {}
  };

  // Build options from whichever list is currently available
  const groupOptions = React.useMemo(
    () =>
      availableGroups.map((g) => (
        <option key={g.id} value={g.groupName}>
          {g.groupName}
        </option>
      )),
    [availableGroups]
  );

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-3"
        aria-label="Add Bookmark"
      >
        <label
          htmlFor="group-dropdown"
          className="text-neutral-700 dark:text-neutral-300"
        >
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
          onChange={onGroupChange}
        >
          {groupOptions}
          <option value="New Group">New Group</option>
        </select>

        {selectedGroup === 'New Group' && (
          <div className="space-y-1">
            <label
              htmlFor="new-group-input"
              className="text-neutral-700 dark:text-neutral-300"
            >
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
          <label
            htmlFor="bookmark-name"
            className="text-neutral-700 dark:text-neutral-300"
          >
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
          <label
            htmlFor="bookmark-url"
            className="text-neutral-700 dark:text-neutral-300"
          >
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
                    bg-blue-600 hover:bg-blue-500 text-white"
        >
          Add Bookmark
        </button>
      </form>
    </div>
  );
}
