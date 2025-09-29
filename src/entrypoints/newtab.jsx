import React from "react";
import { createRoot } from "react-dom/client";

/* Configure Amplify */
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure(config);

/* Amplify auth */
import { Authenticator } from '@aws-amplify/ui-react';

/* Components */
import { NewTabPage } from "@/pages/NewTabPage"; 

/* Scripts */ 
import { AppContextProvider } from "@/scripts/AppContextProvider";
import formFields from "@/config/formFields";

/* CSS styles */
import "@/styles/Index.css"; 
import "@/styles/NewTab.css";

/* Components */
import LogoComponent from "@/components/LogoComponent";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <LogoComponent />
    <Authenticator formFields={formFields}>
      {({ signIn, signOut, user }) => (
        <AppContextProvider user={user}>
          <NewTabPage user={user} signIn={signIn} signOut={signOut} />
        </AppContextProvider>
      )}
    </Authenticator>
  </React.StrictMode>
);