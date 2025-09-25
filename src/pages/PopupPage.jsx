import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

// Authenticator UI
import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';
import formFields from '@/config/formFields';

// Amplify Hub (v6 import path)
import { Hub } from 'aws-amplify/utils';

import { AppContextProvider } from '@/scripts/AppContextProvider';
import PopUpComponent from '@/components/PopUpComponent';

export default function PopupPage() {
  useEffect(() => {
    const listener = (capsule) => {
      const event = capsule?.payload?.event;
      const now = Date.now();

      if (event === 'signedIn') {
        // Broadcast to all extension contexts
        try { chrome.runtime.sendMessage({ type: 'USER_SIGNED_IN', at: now }); } catch {}
        // Storage change fallback (so pages can listen to storage events)
        try { chrome.storage?.local?.set({ authSignal: 'signedIn', authSignalAt: now }); } catch {}
      }

      if (event === 'signedOut') {
        try { chrome.runtime.sendMessage({ type: 'USER_SIGNED_OUT', at: now }); } catch {}
        try { chrome.storage?.local?.set({ authSignal: 'signedOut', authSignalAt: now }); } catch {}
      }
    };

    Hub.listen('auth', listener);
    return () => Hub.remove('auth', listener);
  }, []);

  return (
    <Authenticator formFields={formFields}>
      {({ user }) => (
        <AppContextProvider user={user}>
          <PopUpComponent />
        </AppContextProvider>
      )}
    </Authenticator>
  );
}
