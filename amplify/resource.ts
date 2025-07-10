import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  // Define the attributes we want to collect and require at sign-up
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