import React from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuthenticator, TextField, PasswordField, PhoneNumberField } from "@aws-amplify/ui-react";


export default function SignUpFormFields() {
  const { validationErrors } = useAuthenticator();
  const [phoneE164, setPhoneE164] = React.useState('');

  React.useEffect(() => {
    const handler = () => {
      const input = document.querySelector('input[name="phone_number"]') as HTMLInputElement | null;
      console.log('Hidden phone_number value at submit:', input?.value);
    };
  
    const btn = document.querySelector('button[type="submit"]');
    btn?.addEventListener('click', handler);
    return () => btn?.removeEventListener('click', handler);
  }, []);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const form = btn.closest('form');
      if (!form) return;
      const fd = new FormData(form);
      console.log('Form phone_number being submitted:', fd.get('phone_number'));
    };
    const btn = document.querySelector('button[type="submit"]');
    btn?.addEventListener('click', handler);
    return () => btn?.removeEventListener('click', handler);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <TextField label="First Name" name="given_name" />
      <TextField label="Last Name"  name="family_name" />
      <TextField type="email" label="Email" name="email" />

      {/* Custom phone input that writes to a hidden field Amplify will submit */}
      <div className="flex flex-col gap-1 mindful-auth">
        <label className="amplify-label">Phone number</label>
        <PhoneInput
          international
          defaultCountry="US"
          value={phoneE164}
          onChange={(val) => setPhoneE164((val ?? '').replace(/\s+/g, ''))}
          countryCallingCodeEditable={false}
          numberInputProps={{
            className: 'amplify-input',
            placeholder: 'Add number',
          }}
        />
        {/* Neutralize concatenation logic */}
        <input type="hidden" name="country_code" value="" />
        <input type="hidden" name="phone_number" value={phoneE164} />
        {!!validationErrors?.phone_number && (
          <p className="text-red-500 text-xs">{String(validationErrors.phone_number)}</p>
        )}
      </div>

      <PasswordField label="Password" name="password" />
      <PasswordField label="Confirm Password" name="confirm_password" />
    </div>
  );
}
