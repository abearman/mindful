import React from "react";
import { createRoot } from "react-dom/client";

// Import Amplify and configure it 
import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs.json';
Amplify.configure(config);
import { Authenticator } from '@aws-amplify/ui-react';

import { NewTabUI } from "./components/NewTabComponent"; 
import { AppContextProvider } from "./scripts/AppContext";
import formFields from "./config/formFields";

// All the code you deleted from newtab.jsx goes here
const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Authenticator formFields={formFields}>
      {({ signIn, signOut, user }) => (
        <AppContextProvider user={user}>
          <NewTabUI user={user} signIn={signIn} signOut={signOut} />
        </AppContextProvider>
      )}
    </Authenticator>
  </React.StrictMode>
);