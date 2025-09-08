// components/EmptyBookmarksState.jsx
import React, { useState, useEffect } from "react";

export default function EmptyBookmarksState({
  onCreateGroup,
  onImport,            // optional: hook up to your import flow
  storageTypeLabel = "Local or Encrypted Sync",
}) {
  const [checklist, setChecklist] = useState({
    createdGroup: false,
    addedBookmark: false,
    triedStorage: false,
  });

  // Persist lightweight progress so it disappears as users complete steps.
  useEffect(() => {
    const saved = localStorage.getItem("mindful.emptyStateChecklist");
    if (saved) setChecklist(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("mindful.emptyStateChecklist", JSON.stringify(checklist));
  }, [checklist]);

  const Step = ({ id, label }) => (
    <label className="flex items-center gap-2 text-sm text-neutral-600">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300"
        checked={checklist[id]}
        onChange={(e) =>
          setChecklist((c) => ({ ...c, [id]: e.target.checked }))
        }
      />
      <span className={checklist[id] ? "line-through text-neutral-400" : ""}>
        {label}
      </span>
    </label>
  );

  return (
    <section
      role="region"
      aria-label="Getting started with bookmarks"
      className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
    >
      {/* Illustration */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-neutral-200">
        {/* simple folder/bookmark glyph */}
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h7.5A2.25 2.25 0 0 1 16.5 6.75v10.5l-4.5-2.25L7.5 17.25V6.75z" />
          <path d="M16.5 8.25h.75A2.25 2.25 0 0 1 19.5 10.5v8.25l-4.5-2.25" />
        </svg>
      </div>

      {/* Copy */}
      <h2 className="text-center text-xl font-semibold text-neutral-900">
        Welcome to Mindful
      </h2>
      <p className="mt-2 text-center text-neutral-600">
        Organize your links into groups. Create your first group to get started—
        add unlimited bookmarks and switch between <span className="font-medium">{storageTypeLabel}</span>.
      </p>

      {/* Primary actions */}
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          onClick={onCreateGroup}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:translate-y-px hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Create your first group
        </button>

        <button
          onClick={onImport}
          className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-800 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Import bookmarks
        </button>
      </div>

      {/* Mini checklist (auto-hides when all checked) */}
      {!Object.values(checklist).every(Boolean) && (
        <div className="mt-8 rounded-xl bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-700">Quick start</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Step id="createdGroup" label="Create a group" />
            <Step id="addedBookmark" label="Add a bookmark" />
            <Step id="triedStorage" label="Try Local ↔︎ Sync" />
          </div>
        </div>
      )}

      {/* Tiny help link */}
      <p className="mt-6 text-center text-sm text-neutral-500">
        New here? <a href="#how-it-works" className="underline underline-offset-4">See how Mindful works</a>
      </p>
    </section>
  );
}
