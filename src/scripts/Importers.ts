// scripts/importers.ts
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

// --- helpers ---
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

export async function importAsSingleGroup(
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
