import React, { useCallback, useMemo, useState } from 'react';
import ImportBookmarksModal from '@/components/ImportBookmarksModal';
import { useBookmarkManager } from '@/hooks/useBookmarkManager';
import { createUniqueID } from '@/scripts/Utilities';

export type SmartStrategy = 'folders' | 'domain' | 'topic';
export type ImportChromeOpts = { mode: 'flat' | 'smart'; smartStrategy?: SmartStrategy };

export type ImportPipelines = {
  // Provide one or many of these; the hook will call the ones you pass
  importAsSingleGroup?: (appendGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
  importMirrorFolders?: (appendGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
  importByDomain?: (appendGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
  importByTopic?: (appendGroups: (groups: any[]) => Promise<void>) => Promise<void> | void,
};

/**
 * useImportBookmarks
 * A reusable hook that:
 *  - exposes `openImport()` to trigger the modal
 *  - renders the `ImportBookmarksModal` for you via `renderModal()`
 *  - wires CSV + Chrome import handlers to your app state
 */
export function useImportBookmarks(pipelines?: ImportPipelines) {
  const [isOpen, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { updateAndPersistGroups } = useBookmarkManager?.() ?? { updateAndPersistGroups: null };

  const appendGroups = useCallback(async (groups: any[]) => {
    if (typeof updateAndPersistGroups === 'function') {
      await updateAndPersistGroups((prev: any[]) => [
        ...prev,
        ...groups.map(g => ({
          id: g.id ?? createUniqueID(),
          groupName: g.groupName,
          bookmarks: (g.bookmarks || []).map((b: any) => ({
            id: b.id ?? createUniqueID(),
            name: b.name || b.url || 'Untitled',
            url: b.url,
            faviconUrl: b.faviconUrl,
            dateAdded: b.dateAdded,
          })),
        }))
      ]);
    } else {
      console.warn('updateAndPersistGroups not available; wire this to your state updater.');
    }
  }, [updateAndPersistGroups]);

  const handleUploadCsv = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;

    // naive CSV split; swap for a robust parser if needed
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const urlIdx = header.indexOf('url');
    if (nameIdx === -1 || urlIdx === -1) throw new Error('CSV must include name,url headers');

    const bookmarks = lines.slice(1).map(line => {
      const cols = line.split(',');
      const url = cols[urlIdx]?.trim();
      if (!/^https?:\/\//i.test(url)) return null;
      const name = cols[nameIdx]?.trim() || url;
      return { id: createUniqueID(), name, url };
    }).filter(Boolean) as any[];

    const group = { id: createUniqueID(), groupName: 'Imported CSV', bookmarks };
    await appendGroups([group]);
  }, [appendGroups]);

  const handleImportChrome = useCallback(async ({ mode, smartStrategy }: ImportChromeOpts) => {
    if (mode === 'flat' && pipelines?.importAsSingleGroup) {
      return pipelines.importAsSingleGroup(appendGroups);
    }
    if (mode === 'smart') {
      if (smartStrategy === 'folders' && pipelines?.importMirrorFolders) return pipelines.importMirrorFolders(appendGroups);
      if (smartStrategy === 'domain' && pipelines?.importByDomain) return pipelines.importByDomain(appendGroups);
      if (smartStrategy === 'topic' && pipelines?.importByTopic) return pipelines.importByTopic(appendGroups);
    }
    console.warn('No chrome import pipeline provided for', { mode, smartStrategy });
  }, [appendGroups, pipelines]);

  const openImport = useCallback(() => setOpen(true), []);
  const closeImport = useCallback(() => setOpen(false), []);

  const renderModal = useCallback(() => (
    <ImportBookmarksModal
      isOpen={isOpen}
      onClose={closeImport}
      onUploadCsv={async (f) => { setBusy(true); try { await handleUploadCsv(f); closeImport(); } finally { setBusy(false); } }}
      onImportChrome={async (opts) => { setBusy(true); try { await handleImportChrome(opts); closeImport(); } finally { setBusy(false); } }}
    />
  ), [isOpen, closeImport, handleUploadCsv, handleImportChrome]);

  return {
    openImport,
    closeImport,
    renderModal,
    busy,
  } as const;
}

export default useImportBookmarks;