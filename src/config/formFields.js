// Define the custom form fields object
const formFields = {
  signUp: {
    given_name: {
      label: "First Name",
      placeholder: "Enter your first name",
      required: true,
      order: 1,
    },
    family_name: {
      label: "Last Name",
      placeholder: "Enter your last name",
      required: true,
      order: 2,
    },
    email: {
      order: 3,
    },
    phone_number: {
      label: "Phone Number",
      placeholder: "Enter your phone number",
      required: true,
      order: 4,
    },
    password: {
      order: 5
    },
    confirm_password: {
      order: 6
    },
  },
};

export default formFields;
