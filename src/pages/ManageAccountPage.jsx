import React, { useContext } from "react";

/* Components */ 
import TopBanner from "@/components/TopBanner";
import ManageAccountComponent from "@/components/ManageAccountComponent";

/* Scripts */ 
import { useBookmarkManager } from "@/hooks/useBookmarkManager";
import { AppContext } from "@/scripts/AppContextProvider";


export default function ManageAccountPage({ user, signIn, signOut }) {
  const { userAttributes } = useContext(AppContext);
  const {
    exportBookmarksToJSON,
    changeStorageType,
  } = useBookmarkManager();

  return (
    <>
      <TopBanner
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
