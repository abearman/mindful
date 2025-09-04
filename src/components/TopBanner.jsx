import React, { useContext, useState, useEffect, useRef } from 'react';

/* Scripts */
import { AppContext } from "@/scripts/AppContext.jsx";


const TopBanner = ({ 
  onLoadBookmarks, 
  onExportBookmarks, 
  userAttributes, 
  onSignIn, 
  onSignOut, 
  isSignedIn,
  onStorageTypeChange // Added: Function to handle toggle change
}) => {
  // Consume state from the context 
  const { storageType } = useContext(AppContext);

  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    <div className="top-banner">
      <div className="logo-container">
        <div
          className="logo-text cursor-pointer"
          onClick={() => {
            const url = chrome?.runtime?.getURL
              ? chrome.runtime.getURL("newtab.html")
              : "newtab.html"; // fallback for dev
            window.location.href = url;
          }}
        >
          Mindful
        </div>
      </div> 
      <div className="icon-container">
        <button onClick={onLoadBookmarks} className="icon-button" title="Load Bookmarks">
          <i className="fas fa-upload"></i>
        </button>
        <button onClick={onExportBookmarks} className="icon-button" title="Export Bookmarks">
          <i className="fas fa-download"></i>
        </button>

        {/* Conditional rendering for User Avatar / SignIn Button */}
        {isSignedIn && userAttributes ? (
          <div className="avatar-container" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="avatar-button" title="User Menu">
              <div className="avatar-icon">
                {userAttributes.given_name[0] + userAttributes.family_name[0]}
              </div>
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-control-group">
                  <div className="dropdown-label">Storage type</div> 
                  <div className="storage-toggle">
                    <span className={storageType === 'local' ? 'active' : ''}>Local</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={storageType === 'remote'}
                        onChange={handleToggleChange}
                      />
                      <span className="slider round"></span>
                    </label>
                    <span className={storageType === 'remote' ? 'active' : ''}>Remote</span>
                  </div>
                </div> 
                <hr className="dropdown-divider" />

                <button
                  onClick={() => {
                    const url = chrome?.runtime?.getURL
                      ? chrome.runtime.getURL("ManageAccount.html")
                      : "ManageAccount.html"; // fallback for web/debug
                    window.location.href = url;
                  }}
                  className="dropdown-item"
                >
                  Manage Account
                </button>

                <button onClick={handleLogout} className="dropdown-item">
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onSignIn} className="icon-button" title="Login">
            <i className="fas fa-user"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBanner;