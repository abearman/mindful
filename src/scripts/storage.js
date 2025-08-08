import { uploadData, downloadData, remove } from '@aws-amplify/storage';
import CryptoJS from 'crypto-js';
import { getUserStorageKey } from './Utilities.js';
import { StorageType } from './Constants.js';

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
      const downloadResult = await downloadData({
        path: ({ identityId }) => `private/${identityId}/${BOOKMARKS_FILE_NAME}`,
        options: {
          accessLevel: 'private',
        },
      }).result;

      const encryptedText = await downloadResult.body.text();

      if (!encryptedText) {
        return [];
      }

      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY_SECRET);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return decryptedData;

    } catch (error) {
      // --- MODIFIED: More robust error check for "not found" scenarios ---
      const isNoSuchKeyError = error.name === 'NoSuchKey';
      const isNotFoundError = error.name === 'StorageError' && error.message.includes('not found');

      if (isNoSuchKeyError || isNotFoundError) {
        console.log("No remote bookmarks file found. Starting fresh.");
        return []; // Gracefully handle and return an empty array
      }
      
      // Log any other unexpected errors
      console.error("Error loading bookmarks from remote storage:", error);
      return []; // Fallback to an empty array to prevent app crash
    }
  },
  async save(data, userId) {
    const jsonString = JSON.stringify(data);
    const encryptedData = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY_SECRET).toString();
    try {
      await uploadData({
        path: ({ identityId }) => `private/${identityId}/${BOOKMARKS_FILE_NAME}`,
        data: encryptedData,
        options: {
          accessLevel: 'private',
          contentType: 'text/plain',
        }
      }).result;
    } catch (error) {
      console.error("Error saving bookmarks to remote storage:", error);
      throw error;
    }
  },
  async delete() {
    console.log("Attempting to delete from remote storage...");
    try {
      await remove({
        path: ({ identityId }) => `private/${identityId}/${BOOKMARKS_FILE_NAME}`,
        options: {
          accessLevel: 'private',
        },
      });
      console.log("Successfully deleted remote bookmarks file.");
    } catch (error) {
      if (error.name === 'NoSuchKey' || (error.name === 'StorageError' && error.message.includes('not found'))) {
        console.log("No remote bookmarks file to delete (which is okay).");
        return; 
      }
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