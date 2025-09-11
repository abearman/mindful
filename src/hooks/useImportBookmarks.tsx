import React, { useCallback, useMemo, useState } from 'react';

/* Hooks */
import ImportBookmarksModal from '@/components/ImportBookmarksModal';
import { useBookmarkManager } from '@/hooks/useBookmarkManager';

/* Scripts */
import { createUniqueID } from '@/scripts/Utilities';
import { EMPTY_GROUP_IDENTIFIER } from "@/scripts/Constants";

export type SmartStrategy = 'folders' | 'domain' | 'topic';
export type ImportChromeOpts = { mode: 'flat' | 'smart'; smartStrategy?: SmartStrategy };

export type ImportPipelines = {
  // Provide one or many of these; the hook will call the ones you pass
  importAsSingleGroup?: (insertGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
  importMirrorFolders?: (insertGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
  importByDomain?: (insertGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
  importByTopic?: (insertGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
};

/**
 * useImportBookmarks
 * A reusable hook that:
 *  - exposes `openImport()` to trigger the modal
 *  - renders the `ImportBookmarksModal` for you via `renderModal()`
 *  - wires JSON + Chrome import handlers to your app state
 */
export function useImportBookmarks(pipelines?: ImportPipelines) {
  const [isOpen, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { updateAndPersistGroups } = useBookmarkManager?.() ?? { updateAndPersistGroups: null };

  function insertBeforeEmpty(prev: any[], incoming: any[]) {
    const idx = prev.findIndex(
      (g) => g.id === EMPTY_GROUP_IDENTIFIER || g.groupName === EMPTY_GROUP_IDENTIFIER
    );
    return idx === -1
      ? [...prev, ...incoming]
      : [...prev.slice(0, idx), ...incoming, ...prev.slice(idx)];
  } 

  const insertGroups = useCallback(async (groups: any[]) => {
    if (typeof updateAndPersistGroups === "function") {
      await updateAndPersistGroups((prev: any[]) => {
        // Normalize new groups
        const normalized = groups.map((g) => ({
          id: g.id ?? createUniqueID(),
          groupName: g.groupName,
          bookmarks: (g.bookmarks || []).map((b) => ({
            id: b.id ?? createUniqueID(),
            name: b.name || b.url || "Untitled",
            url: b.url,
            faviconUrl: b.faviconUrl,
            dateAdded: b.dateAdded,
          })),
        }));
  
        // Use helper to insert before EMPTY_GROUP_IDENTIFIER if present
        return insertBeforeEmpty(prev, normalized);
      });
    } else {
      console.warn(
        "updateAndPersistGroups not available; wire this to your state updater."
      );
    }
  }, [updateAndPersistGroups]); 

  const handleUploadJson = useCallback(async (file: File) => {
    // Use  JSON import contract:
    const text = await file.text();
    const data = JSON.parse(text);
    // If the intent is REPLACE ALL groups:
    // await updateAndPersistGroups?.(() => data);
    // If you want to APPEND instead, do:
    await updateAndPersistGroups?.((prev:any[]) => insertBeforeEmpty(prev, data));
  }, [updateAndPersistGroups]);

  const handleImportChrome = useCallback(async ({ mode, smartStrategy }: ImportChromeOpts) => {
    if (mode === 'flat' && pipelines?.importAsSingleGroup) {
      return pipelines.importAsSingleGroup(insertGroups);
    }
    if (mode === 'smart') {
      if (smartStrategy === 'folders' && pipelines?.importMirrorFolders) return pipelines.importMirrorFolders(insertGroups);
      if (smartStrategy === 'domain' && pipelines?.importByDomain) return pipelines.importByDomain(insertGroups);
      if (smartStrategy === 'topic' && pipelines?.importByTopic) return pipelines.importByTopic(insertGroups);
    }
    console.warn('No chrome import pipeline provided for', { mode, smartStrategy });
  }, [insertGroups, pipelines]);

  const openImport = useCallback(() => setOpen(true), []);
  const closeImport = useCallback(() => setOpen(false), []);

  const renderModal = useCallback(() => (
    <ImportBookmarksModal
      isOpen={isOpen}
      onClose={closeImport}
      onUploadJson={async (f) => { setBusy(true); try { await handleUploadJson(f); closeImport(); } finally { setBusy(false); } }}
      onImportChrome={async (opts) => { setBusy(true); try { await handleImportChrome(opts); closeImport(); } finally { setBusy(false); } }}
    />
  ), [isOpen, closeImport, handleUploadJson, handleImportChrome]);

  return {
    openImport,
    closeImport,
    renderModal,
    busy,
  } as const;
}

export default useImportBookmarks;