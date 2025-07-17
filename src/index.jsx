import React from "react";
import { createRoot } from "react-dom/client";
import { Authenticator } from '@aws-amplify/ui-react';
import { NewTabUI } from "./newtab.jsx"; // Import the component
import { AppContextProvider } from "./scripts/AppContext.jsx";
import formFields from "./config/formFields.js";

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