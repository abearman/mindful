import React from "react";
import { createRoot } from "react-dom/client";

// Import Amplify and configure it 
import { Amplify } from 'aws-amplify';
import config from '../../amplify_outputs.json';
Amplify.configure(config);
import { Authenticator } from '@aws-amplify/ui-react';

import { NewTabUI } from "../components/NewTabComponent.jsx"; 
import { AppContextProvider } from "../scripts/AppContext.jsx";
import formFields from "../config/formFields.js";

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