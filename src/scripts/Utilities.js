import { CHROME_NEW_TAB } from './Constants.js';


export function getUserStorageKey(userId) {
  return `bookmarks_${userId}`;
}

export function createUniqueID() {
  return Date.now() + Math.random();
}

export function constructValidURL(url) {
  // Check if the URL is missing the protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Prepend the protocol to the URL
    const urlWithProtocol = `http://${url}`;
    return urlWithProtocol;
  } else {
    return url;
  }
  // if (!/^https?:\/\//i.test(url)) {
  //   url = 'http://' + url;
  // }
  // url = new URL(url);
  // if (!/^www\./i.test(url.hostname)) {
  //   url.hostname = 'www.' + url.hostname;
  // }
  // return url.href;
}

export const isCurrentTabTheNewTab = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var currentTab = tabs[0];
      if (currentTab.url === CHROME_NEW_TAB) {
        // This is the new tab page
        resolve(true);
      } else {
        resolve(false);
      } 
    });
  });
}

export function refreshOtherMindfulTabs() {
  // Reload any tabs (except the current one) that are open and pointed to newtab (aka Mindful page)
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      if ((tab.url == CHROME_NEW_TAB) && (!tab.active))  {
        chrome.tabs.reload(tab.id);
      }    
    });
  });
}

export function refreshActiveMindfulTab() {
  // Reload the current active tab if it is pointed to newtab (aka Mindful page)
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      if ((tab.url == CHROME_NEW_TAB) && tab.active)  {
        chrome.tabs.reload(tab.id);
      }    
    });
  });
}