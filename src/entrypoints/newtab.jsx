import React from "react";
import { createRoot } from "react-dom/client";

/* Configure Amplify */
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure(config);

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

root.render(
  <React.StrictMode>
    <ThemeProvider theme={amplifyTheme} colorMode="system">
      <div className="newtab-root mindful-auth">
        <Authenticator 
          hideSignUp={false}
          components={{ 
            Header: LogoComponent,
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
  </React.StrictMode>
);