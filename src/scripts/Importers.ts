type ChromeBmNode = chrome.bookmarks.BookmarkTreeNode;

type AppBookmark = {
  id: string;
  name: string;
  url: string;
  faviconUrl?: string;
  dateAdded?: number;
};

type AppGroup = {
  id: string;
  groupName: string;
  bookmarks: AppBookmark[];
};

// --- Helpers ---
function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = ''; // ignore fragments for de-dupe
    return url.toString();
  } catch {
    return u;
  }
}

function toAppBookmark(n: ChromeBmNode): AppBookmark {
  return {
    id: String(Date.now() + Math.random()),
    name: n.title || n.url || 'Untitled',
    url: n.url!,
    dateAdded: n.dateAdded,
  };
}

function walk(
  nodes: ChromeBmNode[],
  onBookmark: (bm: ChromeBmNode) => void
) {
  for (const n of nodes) {
    if (n.url) onBookmark(n);
    else if (n.children) walk(n.children, onBookmark);
  }
}

export async function importChromeBookmarksAsSingleGroup(
  insertGroups: (groups: AppGroup[]) => Promise<void>
) {
  // Modal already asked for permissions; assume we have them.
  const tree = await chrome.bookmarks.getTree();

  // collect + de-dupe http(s)
  const seen = new Set<string>();
  const bookmarks: AppBookmark[] = [];

  walk(tree, (bm) => {
    if (!/^https?:\/\//i.test(bm.url!)) return;
    const key = normalizeUrl(bm.url!);
    if (seen.has(key)) return;
    seen.add(key);
    bookmarks.push(toAppBookmark(bm));
  });

  if (bookmarks.length === 0) {
    await insertGroups([]); // no-op but keeps contract simple
    return;
  }

  const group: AppGroup = {
    id: String(Date.now() + Math.random()),
    groupName: 'Imported from Chrome',
    bookmarks,
  };

  await insertGroups([group]);
}

export async function importOpenTabsAsSingleGroup(
  insertGroups: (groups: AppGroup[]) => Promise<void>,
  opts?: { scope?: 'current' | 'all'; includePinned?: boolean; includeDiscarded?: boolean }
) {
  const { scope = 'current', includePinned = true, includeDiscarded = true } = opts ?? {};

  // ensure permission (ok to call even if already granted)
  const has = await chrome.permissions.contains({ permissions: ['tabs'], origins: ['<all_urls>'] });
  if (!has) {
    const granted = await chrome.permissions.request({ permissions: ['tabs'], origins: ['<all_urls>'] });
    if (!granted) throw new Error('Permission to read open tabs was not granted.');
  }

  const q: chrome.tabs.QueryInfo = scope === 'current' ? { currentWindow: true } : {};
  const tabs = await chrome.tabs.query(q);

  const seen = new Set<string>();
  const bookmarks: AppBookmark[] = [];
  for (const t of tabs) {
    const u = t.url || '';
    if (!/^https?:\/\//i.test(u)) continue;                    // skip chrome://, file://, etc.
    if (!includePinned && t.pinned) continue;
    // @ts-ignore (MV3 tabs has 'discarded' in modern Chrome)
    if (!includeDiscarded && t.discarded) continue;

    const key = normalizeUrl(u);
    if (seen.has(key)) continue;
    seen.add(key);

    bookmarks.push({
      id: String(Date.now() + Math.random()),
      name: t.title || u,
      url: u,
      faviconUrl: t.favIconUrl || undefined,
      // dateAdded: undefined (not available for tabs)
    });
  }

  if (bookmarks.length === 0) return;

  const label = new Date().toLocaleString();
  const group: AppGroup = {
    id: String(Date.now() + Math.random()),
    groupName: `Imported from Open Tabs (${label})`,
    bookmarks,
  };

  await insertGroups([group]);
}
