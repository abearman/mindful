import { uploadData, downloadData, remove } from '@aws-amplify/storage';
import { getUserStorageKey } from './Utilities.js';
import { StorageType } from './Constants.js';
import { fetchAuthSession } from 'aws-amplify/auth'; 
import CryptoJS from 'crypto-js';  // TODO: Delete this

// Invoke URL from Amazon API Gateway 
const API_INVOKE_URL = 'https://j69tonnhy6.execute-api.us-west-1.amazonaws.com/v1'

const ENCRYPTION_KEY_SECRET = 'a-very-secret-key-that-you-should-replace';
const BOOKMARKS_FILE_NAME = 'bookmarks.json.encrypted';

// --- Storage Strategies ---

const chromeStorageStrategy = {
  async load(userId) {
    const userStorageKey = getUserStorageKey(userId);
    const result = await chrome.storage.local.get(userStorageKey);
    return result[userStorageKey] || [];
  },
  async save(data, userId) {
    const userStorageKey = getUserStorageKey(userId);
    console.log("[Storage.js] Key being saved: ", userStorageKey);
    console.log("[Storage.js] Bookmarks being saved: ", data);
    await chrome.storage.local.set({ [userStorageKey]: data });
  },
  async delete(userId) {
    const userStorageKey = getUserStorageKey(userId);
    await chrome.storage.local.remove(userStorageKey);
    console.log("Deleted local bookmarks for user: ${userId}");
    console.log("Deleted bookmarks for key: ", userStorageKey);
  }
};

const remoteStorageStrategy = {
  async load(userId) {
    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens) throw new Error("User is not authenticated.");
      
      const response = await fetch(`${API_INVOKE_URL}/bookmarks`, {
        method: 'GET',
        headers: {
          'Authorization': tokens.idToken.toString(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load bookmarks: ${response.statusText}`);
      }
      
      return await response.json();

    } catch (error) {
      console.error("Error loading bookmarks from remote storage:", error);
      return []; // Fallback to an empty array to prevent app crash
    }
  },


  async save(data, userId) {
    try {
      // 1. Get the current user's session token
      const { tokens } = await fetchAuthSession();
      if (!tokens || !tokens.idToken) {
        throw new Error("User is not authenticated.");
      }
      const idToken = tokens.idToken.toString(); // The JWT token

      // 2. Make a POST request to our new API endpoint
      const response = await fetch(`${API_INVOKE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          // The Cognito Authorizer uses this header to verify the user
          'Authorization': idToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save bookmarks: ${errorData.message || response.statusText}`);
      }
      
      console.log("Bookmarks saved successfully via API.");
      return await response.json();

    } catch (error) {
      console.error("Error saving bookmarks to remote storage:", error);
      throw error;
    }
  },
  
  async delete(userId) {
    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens) throw new Error("User is not authenticated.");

      const response = await fetch(`${API_INVOKE_URL}/bookmarks`, {
        method: 'DELETE',
        headers: {
          'Authorization': tokens.idToken.toString(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete bookmarks: ${response.statusText}`);
      }
      
      console.log("Bookmarks deleted successfully via API.");

    } catch (error) {
      console.error("Error deleting bookmarks from remote storage:", error);
      throw error;
    }
  } 
};

// --- Main Storage Class ---

export class Storage {
  constructor(type = StorageType.LOCAL) {
      if (type === StorageType.REMOTE) {
        this.strategy = remoteStorageStrategy;
      } else {
        this.strategy = chromeStorageStrategy;
      }
  }

  load(userId) {
    return this.strategy.load(userId);
  }

  save(data, userId) {
    return this.strategy.save(data, userId);
  }

  delete(userId) {
    return this.strategy.delete(userId);
  }
}