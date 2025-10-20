import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  useAuthenticator,
  TextField,
  PasswordField,
} from "@aws-amplify/ui-react";

export default function SignUpFormFields() {
  const { fields, updateForm, validationErrors } = useAuthenticator((ctx) => [
    ctx.signUp,
  ]);

  return (
    <div className="flex flex-col gap-1">
      <TextField
        label="First Name"
        value={fields.given_name ?? ""}
        onChange={(e) => updateForm({ name: "given_name", value: e.target.value })}
        errorMessage={validationErrors.given_name}
      />

      <TextField
        label="Last Name"
        value={fields.family_name ?? ""}
        onChange={(e) => updateForm({ name: "family_name", value: e.target.value })}
        errorMessage={validationErrors.family_name}
      />

      <TextField
        label="Email"
        type="email"
        value={fields.email ?? ""}
        onChange={(e) => updateForm({ name: "email", value: e.target.value })}
        errorMessage={validationErrors.email}
      />

      {/* Custom phone input */}
      <div className="flex flex-col gap-1">
        <label className="amplify-label">Phone number</label>
        <PhoneInput
          international
          defaultCountry="US"
          value={fields.phone_number ?? ""}
          onChange={(val) => updateForm({ name: "phone_number", value: val || "" })}
          countryCallingCodeEditable={false}
          numberInputProps={{
            className: "amplify-input",
              //"amplify-input w-full bg-transparent text-left text-neutral-500 dark:text-neutral-400 placeholder-neutral-400 dark:placeholder-neutral/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-md",
            placeholder: "Add number",
          }}
        />
        {validationErrors.phone_number && (
          <p className="text-red-500 text-xs">{validationErrors.phone_number}</p>
        )}
      </div>

      <PasswordField
        label="Password"
        value={fields.password ?? ""}
        onChange={(e) => updateForm({ name: "password", value: e.target.value })}
        errorMessage={validationErrors.password}
      />

      <PasswordField
        label="Confirm Password"
        value={fields.confirm_password ?? ""}
        onChange={(e) =>
          updateForm({ name: "confirm_password", value: e.target.value })
        }
        errorMessage={validationErrors.confirm_password}
      />
    </div>
  );
}
