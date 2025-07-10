import React from 'react';
import '../styles/TopBanner.css';
import logoIcon from '../../public/assets/icon-32.png'
// <img src={logoIcon} alt="Mindful Logo" className='logo-image'></img>

const TopBanner = ({ onLoadBookmarks, onExportBookmarks, onSignIn, onSignOut, isSignedIn}) => {
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

        {/* Conditional rendering for SignIn/SignOut Button */}
        {console.log("isSignedIn: ", isSignedIn)}
        {isSignedIn ? (
          <button onClick={onSignOut} className="icon-button" title="Logout">
            <i className="fas fa-sign-out-alt"></i> {/* Icon for Logout */}
          </button>
        ) : (
          <button onClick={onSignIn} className="icon-button" title="Login">
            <i className="fas fa-user"></i> {/* Icon for Login */}
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBanner;