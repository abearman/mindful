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
  }
});