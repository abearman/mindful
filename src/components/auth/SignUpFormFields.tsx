import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuthenticator, TextField, PasswordField } from "@aws-amplify/ui-react";

export default function SignUpFormFields() {
  // Don’t pass a selector — let Amplify re-render on form changes
  const { signUp, updateForm, validationErrors } = useAuthenticator();

  // Helper that works whether formFields exists or not
  const bind = (name: string) => {
    const ff = signUp?.formFields?.[name];

    return {
      name,
      // Uncontrolled input -> defaultValue; lets typing show immediately
      defaultValue: ff?.value ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        ff?.setValue ? ff.setValue(e.target.value) : updateForm?.({ name, value: e.target.value }),
      error: ff?.error ?? validationErrors?.[name],
    };
  };

  const given_name = bind("given_name");
  const family_name = bind("family_name");
  const email = bind("email");
  const phone = signUp?.formFields?.phone_number; // keep controlled for PhoneInput
  const password = bind("password");
  const confirm_password = bind("confirm_password");

  return (
    <div className="flex flex-col gap-2">
      <TextField
        label="First Name"
        name={given_name.name}
        defaultValue={given_name.defaultValue}
        onChange={given_name.onChange}
        hasError={!!given_name.error}
        errorMessage={given_name.error}
      />

      <TextField
        label="Last Name"
        name={family_name.name}
        defaultValue={family_name.defaultValue}
        onChange={family_name.onChange}
        hasError={!!family_name.error}
        errorMessage={family_name.error}
      />

      <TextField
        type="email"
        label="Email"
        name={email.name}
        defaultValue={email.defaultValue}
        onChange={email.onChange}
        hasError={!!email.error}
        errorMessage={email.error}
      />

      {/* Custom phone stays controlled so formatting/flags work */}
      <div className="flex flex-col gap-1 mindful-auth">
        <label className="amplify-label">Phone number</label>
        <PhoneInput
          international
          defaultCountry="US"
          value={phone?.value ?? ""}
          onChange={(val) =>
            phone?.setValue ? phone.setValue(val ?? "") : updateForm?.({ name: "phone_number", value: val ?? "" })
          }
          countryCallingCodeEditable={false}
          numberInputProps={{
            className: "amplify-input",
            placeholder: "Add number",
          }}
        />
        {phone?.error && <p className="text-red-500 text-xs">{phone.error}</p>}
      </div>

      <PasswordField
        label="Password"
        name={password.name}
        defaultValue={password.defaultValue}
        onChange={password.onChange}
        hasError={!!password.error}
        errorMessage={password.error}
      />

      <PasswordField
        label="Confirm Password"
        name={confirm_password.name}
        defaultValue={confirm_password.defaultValue}
        onChange={confirm_password.onChange}
        hasError={!!confirm_password.error}
        errorMessage={confirm_password.error}
      />
    </div>
  );
}
