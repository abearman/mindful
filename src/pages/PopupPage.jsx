import React, { useState, useEffect } from 'react';

// Import Amplify and configure it
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure(config);

// Import Amplify Authenticator
import { getCurrentUser } from 'aws-amplify/auth';

/* Hooks and Utilities */
import { AppContextProvider } from '@/scripts/AppContext.jsx';

/* Components */
import PopUpComponent from '@/components/PopUpComponent.jsx';

export default function PopupPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const authenticatedUser = await getCurrentUser();
        setUser(authenticatedUser);
      } catch (err) {
        setUser(null);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // The AppContextProvider handles loading bookmarks from the correct storage source.
  // PopUpComponent doesn't need to know how or when this happens.
  return user ? (
    <AppContextProvider user={user}>
      <PopUpComponent />
    </AppContextProvider>
  ) : (
    <div className="signed-out-message">Please sign in on the new tab page to add bookmarks.</div>
  );
}
