import React from 'react';
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure({ ...config, ssr: false });

// Authenticator UI
import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';
import formFields from "@/config/formFields";

/* Hooks and Utilities */
import { AppContextProvider } from '@/scripts/AppContextProvider';

/* Components */
import PopUpComponent from '@/components/PopUpComponent';

export default function PopupPage() {
  return (
    // Render the Authenticator right in the popup
    <Authenticator formFields={formFields}>      
      {({ user }) => (
        <AppContextProvider user={user}>
          <PopUpComponent />
        </AppContextProvider>
      )}
    </Authenticator>
  );
}
