import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';
import formFields from '@/config/formFields';

import { AppContextProvider } from '@/scripts/AppContextProvider';
import PopUpComponent from '@/components/PopUpComponent';

// --- NEW: reload helpers ---
function reloadActiveTab() {
  // Requires "tabs" permission to work reliably.
  // Reload the tab that’s currently active behind the popup.
  try {
    if (chrome.tabs?.query && chrome.tabs?.reload) {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs = []) => {
        const tab = tabs?.[0];
        if (tab?.id) chrome.tabs.reload(tab.id);
      });
    }
  } catch {}
}

function refreshNewTabPagesBestEffort() {
  // 1) Try reloading the active tab (works even if it’s chrome://newtab)
  reloadActiveTab();

  // 2) Best-effort reload any open extension views that look like your new tab page
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

// --- NEW: bridge that fires whenever `user` flips truthy/falsey ---
function AuthSignalBridge({ user }) {
  useEffect(() => {
    const at = Date.now();
    console.log("Got to AuthSignalBridge");

    // 1) storage ping (reliable even if listeners aren’t ready yet)
    try { chrome.storage?.local?.set({ authSignalAt: at, authSignal: user ? 'signedIn' : 'signedOut' }); } catch {}

    // 2) broadcast (ignore “no receiver” errors)
    try {
      chrome.runtime.sendMessage({ type: user ? 'USER_SIGNED_IN' : 'USER_SIGNED_OUT', at }, () => {
        // Swallow "receiving end does not exist"
        // eslint-disable-next-line no-unused-expressions
        chrome.runtime.lastError;
      });
    } catch {}

    // 3) proactively reload the page behind the popup
    refreshNewTabPagesBestEffort();
  }, [user]);

  return null;
}

export default function PopupPage() {
  return (
    <Authenticator formFields={formFields}>
      {({ user }) => (
        <>
          <AuthSignalBridge user={user} />
          <AppContextProvider user={user}>
            <PopUpComponent />
          </AppContextProvider>
        </>
      )}
    </Authenticator>
  );
}