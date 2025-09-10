import React, { useContext, useState, useEffect, useRef } from 'react';

/* Scripts */
import { AppContext } from "@/scripts/AppContextProvider";

/* Hooks */
import useImportBookmarks from '@/hooks/useImportBookmarks';

/* Components */
import Tooltip from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/badge";


const TopBanner = ({
  onLoadBookmarks,
  onExportBookmarks,
  userAttributes,
  onSignIn,
  onSignOut,
  isSignedIn,
  onStorageTypeChange
}) => {
  const { storageType } = useContext(AppContext);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const { openImport, renderModal } = useImportBookmarks({
    // importAsSingleGroup,
    // importMirrorFolders,
    // importByDomain,
    // importByTopic,
  });

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setDropdownOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setDropdownOpen(false); };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const handleLogout = () => { onSignOut(); setDropdownOpen(false); };
  const handleToggleChange = (e) => {
    onStorageTypeChange(e.target.checked ? 'remote' : 'local');
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-gray-100 dark:bg-neutral-950">
      <div className="flex w-full items-center justify-between px-[20px] py-4">
        {/* Left: logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            const url = chrome?.runtime?.getURL
              ? chrome.runtime.getURL("newtab.html")
              : "newtab.html";
            window.location.href = url;
          }}
        >
          <img src="/assets/icon-no-bg-128.png" className="w-[30px] h-[30px] object-cover" />
          <span className="text-neutral-900 dark:text-white text-lg font-semibold tracking-tight">Mindful</span>
          <Badge variant="secondary" className="ml-2">Bookmarks</Badge>
        </div>

        {/* Right: icons + avatar */}
        <nav className="hidden items-right gap-6 md:flex">
        <Tooltip label="Load bookmarks">
          <button
            onClick={openImport}
            className="cursor-pointer text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            aria-label="Load bookmarks"
          >
            <i className="fas fa-upload fa-lg" />
          </button>
        </Tooltip>

          <Tooltip label="Export bookmarks">
            <button
              onClick={onExportBookmarks}
              className="cursor-pointer text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400
                         p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              aria-label="Export bookmarks"
            >
              <i className="fas fa-download fa-lg" />
            </button>
          </Tooltip>

          {isSignedIn && userAttributes ? (
            <div ref={containerRef} className="relative">
              {/* Avatar button */}
              <Tooltip label="Manage account" align="right">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="cursor-pointer"
                  aria-haspopup="menu"
                  aria-expanded={isDropdownOpen}
                  aria-label="Manage account"
                >
                  <div className="h-9 w-9 rounded-full bg-gray-200 grid place-items-center text-gray-700 font-bold text-l">
                    {(userAttributes.given_name?.[0] || "") + (userAttributes.family_name?.[0] || "")}
                  </div>
                </button>
              </Tooltip>

              {/* Dropdown menu (absolutely positioned, doesn’t affect navbar height) */}
              {isDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-black/10 dark:border-white/10
                             bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 p-2"
                >
                  <div className="px-3 pt-2 pb-3">
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                      Storage type
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm text-neutral-500 dark:text-neutral-400 ${storageType === "local" ? "font-semibold" : "font-normal"}`}>Local</span>
                        <div className="relative inline-flex h-5 w-9 items-center">
                          {/* the peer comes first */}
                          <input
                            id="storageToggle"
                            type="checkbox"
                            checked={storageType === "remote"}
                            onChange={(e) => onStorageTypeChange(e.target.checked ? "remote" : "local")}
                            className="peer sr-only"
                          />

                          {/* track */}
                          <label
                            htmlFor="storageToggle"
                            className="absolute inset-0 rounded-full border transition cursor-pointer
                                      bg-gray-300 border-gray-300
                                      peer-checked:bg-blue-600 peer-checked:border-blue-600"
                          />

                          {/* thumb */}
                          <span
                            className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow
                                      transition transform peer-checked:translate-x-4"
                          />
                        </div>

                      <span className={`text-sm text-neutral-500 dark:text-neutral-400 ${storageType === "remote" ? "font-semibold" : "font-normal"}`}>Remote</span>
                    </div>
                  </div>

                  <div className="my-2 border-t border-black/10 dark:border-white/10" />

                  <button
                    onClick={() => {
                      const url = chrome?.runtime?.getURL
                        ? chrome.runtime.getURL("ManageAccount.html")
                        : "ManageAccount.html";
                      window.location.href = url;
                    }}
                    className="cursor-pointer w-full text-left px-3 py-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    role="menuitem"
                  >
                    Manage account
                  </button>

                  <button
                    onClick={handleLogout}
                    className="cursor-pointer w-full text-left px-3 py-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Tooltip label="Sign in" align="right">
              <button onClick={onSignIn} className="icon-button cursor-pointer" aria-label="Sign in">
                <i className="fas fa-user" />
              </button>
            </Tooltip>
          )}
        </nav>

        {/* The import bookmarks modal, when visible */}
        {renderModal()}
      </div>
    </header>
  );
};

export default TopBanner;
