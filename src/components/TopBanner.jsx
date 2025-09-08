import React, { useContext, useState, useEffect, useRef } from 'react';

/* Scripts */
import { AppContext } from "@/scripts/AppContextProvider";

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
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    onSignOut();
    setDropdownOpen(false);
  };

  const handleToggleChange = (e) => {
    const newStorageType = e.target.checked ? 'remote' : 'local';
    onStorageTypeChange(newStorageType);
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/50">
      <div className="flex w-full items-center justify-between px-[20px] py-4">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => {
            const url = chrome?.runtime?.getURL
            ? chrome.runtime.getURL("newtab.html")
            : "newtab.html";
            window.location.href = url;
          }}>
          <img src="/assets/icon-no-bg-128.png" className="w-[30px] h-[30px] object-cover" />
          <span className="text-lg font-semibold tracking-tight">Mindful</span>
          <Badge className="ml-2 bg-neutral-800 text-neutral-300 hover:bg-neutral-800">Bookmarks</Badge>
        </div>
        <nav className="hidden items-right gap-6 md:flex">
          <Tooltip label="Load bookmarks">
            <button onClick={onLoadBookmarks} className="icon-button" aria-label="Load bookmarks">
              <i className="fas fa-upload"></i>
            </button>
          </Tooltip>
          <Tooltip label="Export bookmarks">
            <button onClick={onExportBookmarks} className="icon-button" aria-label="Export bookmarks">
              <i className="fas fa-download"></i>
            </button>
          </Tooltip>

          {/* User avatar or Sign in */}
          {isSignedIn && userAttributes ? (
            <div className="avatar-container" ref={dropdownRef}>
              {!isDropdownOpen && (
                <Tooltip label="Manage account" align="right">
                  <button
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    className="avatar-button"
                    aria-haspopup="menu"
                    aria-expanded={isDropdownOpen}
                    aria-label="Manage account"
                  >
                    <div className="h-9 w-9 rounded-full bg-gray-200 grid place-items-center text-gray-700 font-bold text-l">
                      {(userAttributes.given_name?.[0] || "") +
                        (userAttributes.family_name?.[0] || "")}
                    </div>
                  </button>
                </Tooltip>
              )}

              {isDropdownOpen && (
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="avatar-button"
                  aria-haspopup="menu"
                  aria-expanded={isDropdownOpen}
                  aria-label="Manage account"
                >
                  <div className="h-9 w-9 rounded-full bg-gray-200 grid place-items-center text-gray-700 font-bold text-l">
                    {(userAttributes.given_name?.[0] || "") +
                      (userAttributes.family_name?.[0] || "")}
                  </div>
                </button>
              )}

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-control-group">
                    <div className="dropdown-label">Storage type</div>
                    <div className="storage-toggle">
                      <span className={storageType === "local" ? "active" : ""}>Local</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={storageType === "remote"}
                          onChange={handleToggleChange}
                        />
                        <span className="slider round"></span>
                      </label>
                      <span className={storageType === "remote" ? "active" : ""}>Remote</span>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />

                  <button
                    onClick={() => {
                      const url = chrome?.runtime?.getURL
                        ? chrome.runtime.getURL("ManageAccount.html")
                        : "ManageAccount.html";
                      window.location.href = url;
                    }}
                    className="dropdown-item"
                  >
                    Manage account
                  </button>

                  <button onClick={handleLogout} className="dropdown-item">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Tooltip label="Sign in" align="right">
              <button
                onClick={onSignIn}
                className="icon-button"
                aria-describedby="tt-login"
                aria-label="Sign in"
              >
                <i className="fas fa-user"></i>
              </button>
            </Tooltip>
          )}
        </nav>
      </div>
    </header>
    
    
    

        
  );
};

export default TopBanner;
