import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

// Import Hub from the correct package for Amplify v6+
import { Hub } from 'aws-amplify/utils';

/* Scripts */
import formFields from '@/config/formFields';
import { AppContextProvider } from '@/scripts/AppContextProvider';

/* Components */
import PopUpComponent from '@/components/PopUpComponent';

/* CSS styling */
import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';

// --- Reload helpers ---
function reloadActiveTabIfNewTab() {
  try {
    const extNtp = chrome.runtime.getURL('newtab.html');
    if (chrome.tabs?.query && chrome.tabs?.reload) {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs = []) => {
        const tab = tabs?.[0];
        if (!tab?.id) return;

        const url = tab.url || '';
        const pending = tab.pendingUrl || '';

        // Chrome overrides show up as chrome://newtab/ (omnibox blank)
        // Also allow direct loads of the extension page
        const isOurNtp =
          url === 'chrome://newtab/' ||
          pending === 'chrome://newtab/' ||
          url.startsWith(extNtp);

        if (isOurNtp) chrome.tabs.reload(tab.id);
      });
    }
  } catch {}
}

function refreshNewTabPagesBestEffort() {
  // 1) Active tab (guarded to only reload if it's the New Tab)
  reloadActiveTabIfNewTab();

  // 2) Any open extension "tab" views that are the new tab page 
  try {
    const newTabUrl = chrome.runtime.getURL('newtab.html');
    const views = (chrome.extension?.getViews?.({ type: 'tab' }) || []);
    for (const v of views) {
      try {
        if (v?.location?.href?.startsWith?.(newTabUrl)) v.location.reload();
      } catch {}
    }
  } catch {}
}

// --- Broadcast utility (used only on real sign-in/out edges) ---
function broadcastAuthEdge(type /* 'USER_SIGNED_IN' | 'USER_SIGNED_OUT' */) {
  const at = Date.now();

  // 1) storage ping
  try {
    chrome.storage?.local?.set({ authSignalAt: at, authSignal: type === 'USER_SIGNED_IN' ? 'signedIn' : 'signedOut' });
  } catch {}

  // 2) runtime message (ignore no receiver errors)
  try {
    chrome.runtime.sendMessage({ type, at }, () => { chrome.runtime.lastError; });
  } catch {}
}

export default function PopupPage() {
  // Listen only for real Hub auth edges so we don’t fire on popup open
  useEffect(() => {
    const unsub = Hub.listen('auth', ({ payload }) => {
      // Common events: 'signedIn', 'signedOut', 'tokenRefresh', etc.
      if (payload?.event === 'signedIn') {
        broadcastAuthEdge('USER_SIGNED_IN');
        refreshNewTabPagesBestEffort();
      } else if (payload?.event === 'signedOut') {
        broadcastAuthEdge('USER_SIGNED_OUT');
        refreshNewTabPagesBestEffort();
      }
    });
    return () => unsub();
  }, []);

  return (
    <Authenticator hideSignUp={false} formFields={formFields}>
      {({ user }) => (
        <AppContextProvider user={user}>
          <PopUpComponent />
        </AppContextProvider>
      )}
    </Authenticator>
  );
}
