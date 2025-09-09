// components/EmptyBookmarksState.jsx
import React, { useState, useEffect } from "react";

export default function EmptyBookmarksState({
  onCreateGroup,
  onImport, // optional
  storageTypeLabel = "Local or Encrypted Sync",
}) {
  const [checklist, setChecklist] = useState({
    createdGroup: false,
    addedBookmark: false,
    triedStorage: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("mindful.emptyStateChecklist");
    if (saved) setChecklist(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "mindful.emptyStateChecklist",
      JSON.stringify(checklist)
    );
  }, [checklist]);

  // inside EmptyBookmarksState.jsx
  const Step = ({ id, label }) => (
    <label className="block">            {/* keep label click-to-toggle */}
      <div className="flex items-center gap-3">   {/* reliable gap here */}
        <input
          type="checkbox"
          className="shrink-0 h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-600 accent-blue-600
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
          checked={checklist[id]}
          onChange={(e) =>
            setChecklist((c) => ({ ...c, [id]: e.target.checked }))
          }
        />
        <span
          className={
            (checklist[id]
              ? "line-through text-neutral-400 dark:text-neutral-500"
              : "text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100") +
            " text-sm leading-snug"   
          }
        >
          {label}
        </span>
      </div>
    </label>
  );

  return (
    <section
      role="region"
      aria-label="Getting started with bookmarks"
      className="mx-auto mt-10 max-w-3xl rounded-2xl border bg-white/90 p-8 shadow-sm
                 border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900/70
                 backdrop-blur supports-[backdrop-filter]:bg-white/70
                 dark:supports-[backdrop-filter]:bg-neutral-900/60"
    >
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full
                      border border-neutral-200 bg-white shadow-sm
                      dark:border-neutral-700 dark:bg-neutral-800">
        <img
          src="/assets/icon-no-bg-128.png"
          alt=""
          className="h-[30px] w-[30px] object-contain"
        />
      </div>

      {/* Copy */}
      <h2 className="text-center text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Welcome to Mindful
      </h2>
      <p className="mx-auto mt-3 max-w-prose text-center text-sm sm:text-left text-neutral-600 dark:text-neutral-400">
        Organize your links into groups. Create your first group to get
        started: add unlimited bookmarks and switch between{" "}
        <span className="font-medium text-neutral-800 dark:text-neutral-200">
          {storageTypeLabel}
        </span>
        .
      </p>

      {/* Primary actions */}
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          onClick={onCreateGroup}
          className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-white shadow-sm
                     transition will-change-transform hover:-translate-y-0.5 hover:bg-blue-700
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 text-sm"
        >
          Create your first group
        </button>

        <button
          onClick={onImport}
          className="cursor-pointer inline-flex items-center justify-center rounded-xl border px-5 py-2.5 transition
                    border-neutral-300 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70
                    dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100
                    dark:shadow-[0_1px_3px_0_rgba(255,255,255,0.1)]
                    dark:hover:bg-neutral-700 dark:hover:border-neutral-400 text-sm"
        >
          Import bookmarks
        </button>
 
 

      </div>

      {/* Mini checklist (auto-hides when all checked) */}
      {/* {!Object.values(checklist).every(Boolean) && ( */}
      <div className="mt-8 rounded-xl border p-4
                    border-neutral-200 bg-neutral-50
                    dark:border-neutral-800 dark:bg-neutral-800/60 not-prose">
        <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Quick start
        </p>
        <div className="flex flex-col gap-2">
          <Step id="createdGroup" label="Create a group" />
          <Step id="addedBookmark" label="Add a bookmark" />
          <Step id="triedStorage" label="Try Local ↔︎ Sync" />
        </div>
      </div>
      {/* )} */}

      {/* Tiny help link */}
      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        New here?{" "}
        <a
          href="#how-it-works"
          className="underline underline-offset-4 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          See how Mindful works
        </a>
      </p>
    </section>
  );
}
