import { defineStorage } from '@aws-amplify/backend';

// This file now ONLY defines that a storage resource should exist.
export const storage = defineStorage({
  name: 'mindful-user-bookmarks'
});
