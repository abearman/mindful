import { CHROME_NEW_TAB } from './Constants.js';


export function createUniqueID() {
  return Date.now() + Math.random();
}

export function constructValidURL(url) {
  // Check if the URL is missing the protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Prepend the protocol to the URL
    const urlWithProtocol = `http://${userInput}`;
  } 
  return urlWithProtocol;
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