import { CHROME_NEW_TAB } from './Constants.js';


export function getUserStorageKey(userId) {
  return `bookmarks_${userId}`;
}

export function createUniqueID() {
  return Date.now() + Math.random();
}

export function constructValidURL(url) {
  // Check if the URL is missing the protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Prepend the protocol to the URL
    const urlWithProtocol = `http://${url}`;
    return urlWithProtocol;
  } else {
    return url;
  }
  // if (!/^https?:\/\//i.test(url)) {
  //   url = 'http://' + url;
  // }
  // url = new URL(url);
  // if (!/^www\./i.test(url.hostname)) {
  //   url.hostname = 'www.' + url.hostname;
  // }
  // return url.href;
}

export const isCurrentTabTheNewTab = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var currentTab = tabs[0];
      if (currentTab.url === CHROME_NEW_TAB) {
        // This is the new tab page
        resolve(true);
      } else {
        resolve(false);
      } 
    });
  });
}

/**
 * Notify every Mindful surface that bookmarks changed,
 * then (optionally) hard-refresh any known tabs.
 */
export async function refreshOtherMindfulTabs() {
  // 1) Broadcast to all extension views (popup, new tab, options, background)
  try {
    chrome?.runtime?.sendMessage?.({ type: 'MINDFUL_BOOKMARKS_UPDATED' });
  } catch (e) {
    console.warn('runtime.sendMessage failed:', e);
  }

  // 2) Broadcast to any non-extension pages that might be listening
  try {
    const bc = new BroadcastChannel('mindful');
    bc.postMessage({ type: 'MINDFUL_BOOKMARKS_UPDATED' });
    bc.close();
  } catch (e) {
    // BroadcastChannel not available or blocked (ok to ignore)
  }

  // 3) (Optional) If you already reload tabs, keep doing it here.
  // Wrap in try/catch so it’s a no-op without "tabs" permission.
  try {
    // Adjust these URL patterns to your actual extension pages if you want
    const tabs = await chrome?.tabs?.query?.({
      url: [
        'chrome-extension://*/newtab.html',
        'chrome-extension://*/options.html',
      ],
    });
    if (tabs?.length) {
      for (const t of tabs) {
        // Trigger a hard reload; listeners will still handle soft reloads.
        try { chrome.tabs.reload(t.id); } catch {}
      }
    }
  } catch (e) {
    // No "tabs" permission or not available in this context — ignore
  }
}

export function refreshActiveMindfulTab() {
  // Reload the current active tab if it is pointed to newtab (aka Mindful page)
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      if ((tab.url == CHROME_NEW_TAB) && tab.active)  {
        chrome.tabs.reload(tab.id);
      }    
    });
  });
}