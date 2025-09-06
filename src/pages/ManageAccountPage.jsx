import React, { useContext } from "react";

/* Components */ 
import TopBanner from "@/components/TopBanner.jsx";
import ManageAccountComponent from "@/components/ManageAccountComponent.jsx";

/* Scripts */ 
import { useBookmarkManager } from "@/scripts/useBookmarkManager.js";
import { AppContext } from "@/scripts/AppContext.jsx";


export default function ManageAccountPage({ user, signIn, signOut }) {
  const { userAttributes } = useContext(AppContext);
  const {
    importBookmarksFromJSON,
    exportBookmarksToJSON,
    changeStorageType,
  } = useBookmarkManager();

  return (
    <>
      <TopBanner
        onLoadBookmarks={importBookmarksFromJSON}
        onExportBookmarks={exportBookmarksToJSON}
        userAttributes={userAttributes}
        onSignIn={signIn}
        onSignOut={signOut}
        isSignedIn={!!user}
        onStorageTypeChange={changeStorageType}
      />
      <ManageAccountComponent user={user} signIn={signIn} signOut={signOut} />
    </>
  );
}
