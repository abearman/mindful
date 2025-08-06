// --- NEW: Import specific functions from @aws-amplify/storage ---
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
    await chrome.storage.local.set({ [userStorageKey]: data });
  }
};

const remoteStorageStrategy = {
  /**
   * Loads and decrypts bookmarks from Amplify Storage using the v6 API.
   */
  async load(userId) {
    console.log("In remote storage load() function");
    try {
      const downloadResult = await downloadData({
        path: ({ identityId }) => `private/${identityId}/${BOOKMARKS_FILE_NAME}`,
        options: {
          accessLevel: 'private', // 'private' is the new accessLevel for user-specific files
        },
      }).result;

      // The result body is a Blob, which needs to be converted to text
      const encryptedText = await downloadResult.body.text();

      if (!encryptedText) {
        return [];
      }

      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY_SECRET);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return decryptedData;

    } catch (error) {
      // A "key not found" error is expected on first load for a user.
      if (error.name === 'StorageError' && error.message.includes('not found')) {
        console.log("No remote bookmarks file found. Starting fresh.");
        return [];
      }
      console.error("Error loading bookmarks from remote storage:", error);
      return []; // Fallback to an empty array to prevent app crash
    }
  },
  /**
   * Encrypts and saves bookmarks to Amplify Storage using the v6 API.
   */
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
      throw error; // Re-throw to be caught by the calling function
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
}
