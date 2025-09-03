import React from "react";
import { createRoot } from "react-dom/client";

import { Amplify } from "aws-amplify";
import config from "../../amplify_outputs.json";
Amplify.configure(config);

import { Authenticator } from "@aws-amplify/ui-react";
import { AppContextProvider } from "../scripts/AppContext.jsx";
import formFields from "../config/formFields.js";

import ManageAccountUI from "../components/ManageAccountComponent.jsx";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Authenticator formFields={formFields}>
      {({ signIn, signOut, user }) => (
        <AppContextProvider user={user}>
          <ManageAccountUI
            userAttributes={user?.attributes}
            onUpdateProfile={async (payload) => {
              // TODO: persist to your backend/Cognito
              console.log("Save profile", payload);
            }}
          />
        </AppContextProvider>
      )}
    </Authenticator>
  </React.StrictMode>
);
