import React, { useState, useEffect, useRef } from 'react';
import '../styles/TopBanner.css';

const TopBanner = ({ onLoadBookmarks, onExportBookmarks, userAttributes, onSignIn, onSignOut, isSignedIn }) => {
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

  return (
    <div className="top-banner">
      <div className="logo-container">
        <div className="logo-text">Mindful</div>
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