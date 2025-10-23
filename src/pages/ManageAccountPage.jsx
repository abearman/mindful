import React, { useContext, useEffect } from "react";

/* Components */ 
import TopBanner from "@/components/TopBanner";
import ManageAccountComponent from "@/components/ManageAccountComponent";

/* Scripts */ 
import { useBookmarkManager } from "@/hooks/useBookmarkManager";
import { AppContext } from "@/scripts/AppContextProvider";

/* Analytics */
import AnalyticsProvider from "@/analytics/AnalyticsProvider";


export default function ManageAccountPage({ user, signIn, signOut }) {
  // Initialize PostHog analytics
  useEffect(() => { initPostHog(); }, []);

  const { userAttributes } = useContext(AppContext);
  const {
    exportBookmarksToJSON,
    changeStorageType,
  } = useBookmarkManager();

  return (
    <AnalyticsProvider>
      <TopBanner
        onExportBookmarks={exportBookmarksToJSON}
        userAttributes={userAttributes}
        onSignIn={signIn}
        onSignOut={signOut}
        isSignedIn={!!user}
        onStorageTypeChange={changeStorageType}
      />
      <ManageAccountComponent user={user} signIn={signIn} signOut={signOut} />
    </AnalyticsProvider>
  );
}
