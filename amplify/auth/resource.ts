import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  // This is the complete definition with all your required attributes
  userAttributes: {
    familyName: {
      required: true,
    },
    givenName: {
      required: true,
    },
    phoneNumber: {
      required: true,
    },
    // Defines the custom attribute for storage preference
    'custom:storage_type': {
      dataType: 'String', // The type of data to be stored
      mutable: true,      // Allows the user to change this value after sign-up
      // Not required, so thus won't appear on sign-up screen
    },
  }
});