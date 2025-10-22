import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

// Import Hub from the correct package for Amplify v6+
import { Hub } from 'aws-amplify/utils';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import { useAuthenticator } from '@aws-amplify/ui-react'; 

/* Scripts */
import { AppContextProvider } from '@/scripts/AppContextProvider';

/* Components */
import PopUpComponent from '@/components/PopUpComponent';
import LogoComponent from '@/components/LogoComponent';
import PopupAutosize from "@/components/PopupAutosize";

/* CSS styling */
import '@aws-amplify/ui-react/styles.css';
import '@/styles/amplify-auth-tailwind.css'; 

/* Shared theme + props */
import { amplifyTheme } from '@/theme/amplifyTheme';
import formFields from "@/config/formFields";
import SignUpFormFields from "@/components/auth/SignUpFormFields";


// Function to open a new tab for Create Account or Verify Account (to avoid infinite email loop + popup closing)
async function openAuthTab(route /* 'signUp' | 'confirmSignUp' */ = 'signUp', extras = {}) {
  const url = chrome.runtime.getURL(`newtab.html#auth=${route}`);
  chrome.tabs.create({ url }, () => {
    const err = chrome.runtime.lastError;
    if (err) console.warn('[openAuthTab] tabs.create error:', err);
    window.close();
  });
}

// Watch Amplify route in popup to auto-handoff on confirm
function PopupRouteWatcher() {
  const { route } = useAuthenticator((ctx) => [ctx.route]);

  React.useEffect(() => {
    const isVerify =
      route === 'confirmSignUp' ||
      route === 'verifyUser' ||
      route === 'confirmVerifyUser';

    if (isVerify) {
      openAuthTab('confirmSignUp');
    }
  }, [route]);

  return null;
}
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

// Footer component that shows on the Sign In screen
function SignInFooter() {
  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        className="amplify-button--link"
        onClick={() => openAuthTab('signUp')}
      >
        Create account
      </button>
    </div>
  );
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
    <ThemeProvider theme={amplifyTheme} colorMode="system">
      <div className="popup-root mindful-auth p-4">
        <PopupAutosize selector=".popup-root" maxH={600} />
        <LogoComponent />
        <Authenticator
          className="!p-0"
          hideSignUp={true}  // Hide Create Account in the popup in order to open a new tab, for easier email verification                   
          formFields={formFields}
          components={{
            SignIn: { Footer: SignInFooter },
          }}
        >
          {({ user }) => (
            <AppContextProvider user={user}>
              {/* Offer a create-account link */}
              {!user && (
                <div className="mt-3">
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => openAuthTab('signUp')}
                    type="button"
                  >
                    Create account (opens full page)
                  </button>
                </div>
              )}

              <PopUpComponent />

              {/* Silently watch for confirm step and auto-handoff */}
              <PopupRouteWatcher />
            </AppContextProvider>
          )}
        </Authenticator>
      </div>
    </ThemeProvider>
  );

}
