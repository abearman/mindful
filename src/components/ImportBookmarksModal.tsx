import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";  

/**
 * ImportBookmarksModal
 *
 * Props
 * - isOpen: boolean
 * - onClose: () => void
 * - onUploadJson: (file: File) => Promise<void> | void
 * - onImportChrome: (options: { mode: 'flat' | 'smart', smartStrategy?: 'folders' | 'domain' | 'topic' }) => Promise<void> | void
 *
 * Optional UX niceties
 * - disable while busy, progress text
 * - basic error surfacing
 */
export default function ImportBookmarksModal({
  isOpen,
  onClose,
  onUploadJson,
  onImportChrome,
}) {
  const dialogRef = useRef(null);
  const [tab, setTab] = useState<'json' | 'chrome'>('chrome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JSON state
  const [jsonFile, setJsonFile] = useState<File | null>(null);

  // Chrome import state
  const [mode, setMode] = useState<'flat' | 'smart'>('flat');
  const [smartStrategy, setSmartStrategy] = useState<'folders' | 'domain' | 'topic'>('folders');
  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setBusy(false);
      setJsonFile(null);
      setMode('flat');
      setSmartStrategy('folders');
      setPermGranted(null);
      setTab('chrome');
    }
  }, [isOpen]);

  useEffect(() => {
    // Close on Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !busy) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  async function ensureBookmarksPermission(): Promise<boolean> {
    try {
      // Check first (avoids showing a prompt if already granted)
      const has = await chrome.permissions.contains({ permissions: ['bookmarks'] });
      if (has) return true;
      return await chrome.permissions.request({ permissions: ['bookmarks'] });
    } catch (e) {
      console.warn('Permission check/request failed', e);
      return false;
    }
  }

  async function handleJsonImport() {
    if (!jsonFile) return;
    try {
      setBusy(true);
      setError(null);
      await onUploadJson?.(jsonFile); 
      onClose?.();
    } catch (e: any) {
      setError(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleChromeImport() {
    try {
      setBusy(true);
      setError(null);
      const ok = await ensureBookmarksPermission();
      setPermGranted(ok);
      if (!ok) throw new Error('Permission to read Chrome bookmarks was not granted.');

      if (mode === 'flat') {
        await onImportChrome?.({ mode: 'flat' });
      } else {
        await onImportChrome?.({ mode: 'smart', smartStrategy });
      }
      onClose?.();
    } catch (e: any) {
      setError(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">   {/* lift z just in case */}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !busy && onClose?.()} />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="relative z-10 w-[min(96vw,720px)] rounded-2xl border border-neutral-200 bg-white shadow-2xl 
                   dark:border-neutral-800 dark:bg-neutral-950
                   max-h-[85vh] overflow-hidden"  /* constrain height */
      >
        {/* Make the inside scroll instead of the whole page */}
        <div className="grid grid-rows-[auto,auto,1fr,auto] max-h-[85vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 id="import-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Import bookmarks</h2>
            <button
              onClick={() => !busy && onClose?.()}
              className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-5 pt-4">
            <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1 text-sm dark:border-neutral-800 dark:bg-neutral-900">
              <button
                className={
                  'cursor-pointer ml-1 px-3 py-1.5 rounded-lg transition ' +
                  (tab === 'chrome'
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200')
                }
                onClick={() => setTab('chrome')}
              >
                From Chrome Bookmarks
              </button>
              <button
                className={
                  'cursor-pointer px-3 py-1.5 rounded-lg transition ' +
                  (tab === 'json'
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200')
                }
                onClick={() => setTab('json')}
              >
                Upload JSON 
              </button>
            </div>
          </div>

          {/* Body (scrolls if tall) */}
          <div className="px-5 py-4 overflow-y-auto">
            {tab === 'json' ? (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Import bookmarks from a JSON file exported from your previous manager or browser.
                </p>
                <div className="rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">Choose JSON file</label>
                  <input
                    type="file"
                    accept="application/json,.json" 
                    onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)}
                    className="cursor-pointer block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-neutral-800 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-100 dark:hover:file:bg-neutral-750/60"
                  />
                  {jsonFile && (
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Selected: {jsonFile.name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Import directly from your existing Chrome bookmarks. You can add them into one group or categorize them automatically.
                </p>

                {/* Mode selector */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode('flat')}
                    className={
                      'cursor-pointer flex items-start gap-3 rounded-2xl border p-4 text-left transition ' +
                      (mode === 'flat'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-500/70 dark:bg-blue-950/30'
                        : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700')
                    }
                  >
                    <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:bg-blue-400 dark:ring-blue-900" />
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">Flat import</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-300">Put everything into a single group: <span className="italic">Imported from Chrome</span>.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('smart')}
                    className={
                      'cursor-pointer flex items-start gap-3 rounded-2xl border p-4 text-left transition ' +
                      (mode === 'smart'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-500/70 dark:bg-blue-950/30'
                        : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700')
                    }
                  >
                    <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:bg-blue-400 dark:ring-blue-900" />
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">Smart import</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-300">Categorize by <span className="font-medium">folders</span>, <span className="font-medium">domain</span>, or <span className="font-medium">topic</span>.</div>

                      {mode === 'smart' && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <label className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Strategy</label>
                          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                            <button
                              onClick={() => setSmartStrategy('folders')}
                              className={
                                'cursor-pointer px-3 py-1 rounded-md transition ' +
                                (smartStrategy === 'folders' ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60')
                              }
                            >Folders</button>
                            <button
                              onClick={() => setSmartStrategy('domain')}
                              className={
                                'cursor-pointer ml-1 px-3 py-1 rounded-md transition ' +
                                (smartStrategy === 'domain' ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60')
                              }
                            >Domain</button>
                            <button
                              onClick={() => setSmartStrategy('topic')}
                              className={
                                'cursor-pointer ml-1 px-3 py-1 rounded-md transition ' +
                                (smartStrategy === 'topic' ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60')
                              }
                            >Topic</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {permGranted === false && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/30 dark:text-rose-200">
                    Permission to access Chrome bookmarks was not granted.
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/30 dark:text-rose-200">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {busy ? 'Importing… This may take a moment for large bookmark sets.' : 'You can undo from the snackbar after import.'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => !busy && onClose?.()}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-850"
              >
                Cancel
              </button>

              {tab === 'json' ? (
                <button
                  onClick={handleJsonImport}
                  disabled={!jsonFile || busy}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
                >
                  {busy ? 'Importing…' : 'Import JSON'}
                </button>
              ) : (
                <button
                  onClick={handleChromeImport}
                  disabled={busy}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
                >
                  {busy ? 'Importing…' : mode === 'flat' ? 'Import (Flat)' : `Import (Smart: ${smartStrategy})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);   // Render outside the navbar 
}
