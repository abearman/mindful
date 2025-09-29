import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

// Import Hub from the correct package for Amplify v6+
import { Hub } from 'aws-amplify/utils';
import { Authenticator, ThemeProvider, createTheme } from '@aws-amplify/ui-react';

/* Scripts */
import formFields from '@/config/formFields';
import { AppContextProvider } from '@/scripts/AppContextProvider';

/* Components */
import PopUpComponent from '@/components/PopUpComponent';
import LogoComponent from '@/components/LogoComponent';

/* CSS styling */
import '@aws-amplify/ui-react/styles.css';
import '@/styles/amplify-auth-tailwind.css'; 

// Tailwind-aligned Amplify theme
const amplifyTheme = createTheme({
  name: 'mindful',
  tokens: {
    colors: {
      brand: {
        primary: {  // buttons, links, active tabs
          10: { value: '#eff6ff' },   // blue-50
          20: { value: '#bfdbfe' },   // blue-200
          40: { value: '#60a5fa' },   // blue-400
          60: { value: '#2563eb' },   // blue-600
          80: { value: '#1d4ed8' },   // blue-700
          90: { value: '#1e3a8a' },   // blue-900
        },
      },
      background: { primary: { value: 'transparent' } }, // let your page bg show through
      font: { primary: { value: 'inherit' } },           // use your Tailwind font
    },
    borderWidths: {
      small: { value: '0' },
      medium: { value: '0' },
      large: { value: '0' },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: '{colors.brand.primary.60}' }, 
          _hover: { backgroundColor: { value: '{colors.brand.primary.40}' } },
        },
        paddingInlineStart: { value: '1rem' },
        paddingInlineEnd: { value: '1rem' },
      },
    },
    fieldset: { borderWidth: { value: '0' } },
    card: { borderWidth: { value: '0' }, boxShadow: { value: 'none' } },
    radii: { small: '0.5rem', medium: '0.75rem', large: '1rem', xl: '1rem', xxl: '1.5rem' },
    shadows: { small: { value: 'none' }, medium: { value: 'none' } },
    //shadows: { small: { value: '0 1px 2px rgba(0,0,0,0.06)' }, medium: { value: '0 4px 16px rgba(0,0,0,0.12)' } },
  },
 
 });


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
    <ThemeProvider theme={amplifyTheme} colorMode="system">
      <div className="p-4 mindful-auth">
        <div className="rounded-2xl shadow-md 
                      bg-white dark:bg-neutral-900">
          <div className="p-4">
            <LogoComponent />
            <Authenticator
              className="!p-0"
              hideSignUp={false}
              formFields={formFields}
            >
              {({ user }) => (
                <AppContextProvider user={user}>
                  <PopUpComponent />
                </AppContextProvider>
              )}
            </Authenticator>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
