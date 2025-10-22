import React from "react";
import { createRoot } from "react-dom/client";

/* Configure Amplify */
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

/* Amplify auth */
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';

/* Components */
import { NewTabPage } from "@/pages/NewTabPage"; 

/* Scripts */ 
import { AppContextProvider } from "@/scripts/AppContextProvider";

/* CSS styles */
import "@/styles/Index.css"; 
import "@/styles/NewTab.css";
import '@/styles/amplify-auth-tailwind.css'; 

/* Components */
import LogoComponent from "@/components/LogoComponent";

/* CSS Styles */
import '@/styles/amplify-auth-tailwind.css'; 

/* Shared theme + props */
import { amplifyTheme } from '@/theme/amplifyTheme';
import formFields from "@/config/formFields";
import SignUpFormFields from "@/components/auth/SignUpFormFields";


const container = document.getElementById("root");
const root = createRoot(container);


/* =========================
   Hash route parser
   ========================= */
function parseAuthFromHash() {
  const hash = window.location.hash || ""; // e.g. "#auth=signUp"
  const m = /(?:^|[?#&])auth=([^&]+)/.exec(hash);
  const val = m ? decodeURIComponent(m[1]) : undefined;
  return val === "signUp" || val === "confirmSignUp" ? val : undefined;
}

function NewTabRoot() {
  // Compute initialState before first render (Amplify reads it once)
  const initialFromHash = React.useMemo(() => parseAuthFromHash(), []);

  React.useEffect(() => {
    console.log('[NewTabRoot] reading pendingVerifyEmail…');
    chrome.storage?.local?.get(["pendingVerifyEmail"], (res) => {
      const err = chrome.runtime?.lastError;
      if (err) console.warn('[NewTabRoot] storage.get error:', err);
      console.log('[NewTabRoot] storage.get result:', res);

      const v = typeof res?.pendingVerifyEmail === "string" ? res.pendingVerifyEmail : '';
      if (v) {
        console.log('[NewTabRoot] setConfirmEmail:', v);
        setConfirmEmail(v);
        // optional: clear after using to avoid stale reuse
        chrome.storage.local.remove('pendingVerifyEmail', () => {
          const rmErr = chrome.runtime?.lastError;
          if (rmErr) console.warn('[NewTabRoot] storage.remove error:', rmErr);
          else console.log('[NewTabRoot] pendingVerifyEmail removed');
        });
      } else {
        console.log('[NewTabRoot] no pendingVerifyEmail found');
      }
    });
  }, []);

  return (
    <ThemeProvider theme={amplifyTheme} colorMode="system">
      <div className="newtab-root mindful-auth">
        <Authenticator 
          hideSignUp={false}
          initialState={initialFromHash}
          components={{ 
            Header: LogoComponent,  // Logo shows only on auth screens
            SignUp: { FormFields: SignUpFormFields } 
          }}
          formFields={formFields}
        >
          {({ signIn, signOut, user }) => (
            <AppContextProvider user={user}>
              <NewTabPage user={user} signIn={signIn} signOut={signOut} />
            </AppContextProvider>
          )}
        </Authenticator>
      </div>
    </ThemeProvider> 
  );
}


root.render(
  <React.StrictMode>
    <NewTabRoot />
  </React.StrictMode>
);