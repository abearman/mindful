import React, { useMemo, useState, useContext } from "react";
import PhoneInput from 'react-phone-number-input';

/* Amplify auth */
import {
  updateUserAttributes,
  fetchUserAttributes,
  sendUserAttributeVerificationCode,
  confirmUserAttribute,
} from "aws-amplify/auth";

/* CSS */
import 'react-phone-number-input/style.css';

/* Scripts */
import { AppContext } from "@/scripts/AppContext.jsx";

/* Components */
import { Avatar } from "@/components/ui/Avatar.jsx"; 


export default function ManageAccountComponent({ user, signIn, signOut }) {
  const {  
    userAttributes,
    setUserAttributes,
    storageType,
  } = useContext(AppContext);

  const [pendingVerify, setPendingVerify] = useState(null); // "email" | "phone_number" | null
  const [verifyCode, setVerifyCode] = useState("");

  const given_name = useMemo(() => {
    return userAttributes.given_name || "";
  }, [userAttributes]);

  const family_name = useMemo(() => {
    return userAttributes.family_name || "";
  }, [userAttributes]);

  const initials = useMemo(() => {
    const a = (userAttributes.given_name || "Y")[0];
    const b = (userAttributes.family_name || "N")[0];
    return `${a}${b}`.toUpperCase();
  }, [userAttributes]);

  const email = userAttributes.email || "yourname@gmail.com";
  const phone = userAttributes.phone_number || "Your phone number";

  const [form, setForm] = useState({
    given_name,
    family_name,
    email,
    phone,
  });
  const [saving, setSaving] = useState(false);

  const handle = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const current = await fetchUserAttributes();
  
      // Map your UI fields -> Cognito standard attributes
      const next = {
        given_name: form.given_name,
        family_name: form.family_name,                 
        email: form.email,
        phone_number: toE164(form.phone),
        // For custom attrs: "custom:preferred_theme": "dark"
      };
  
      // Only send what changed
      const changed = Object.fromEntries(
        Object.entries(next).filter(([k, v]) => (current[k] || "") !== (v || ""))
      );
      if (Object.keys(changed).length === 0) return;
  
      await updateUserAttributes({ userAttributes: changed });
  
      // If email or phone changed, kick off verification to the NEW value
      if (changed.email) {
        // Cognito will automatically send a verification code when email is changed
        setPendingVerify("email");
      } else if (changed.phone_number) {
        // Cognito will automatically send a verification code when phone is changed
        setPendingVerify("phone_number");
      } else {
        // Refresh local copy (and push into your AppContext)
        const updated = await fetchUserAttributes();
        setUserAttributes(updated); 
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-10 px-4">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RIGHT PANEL */}
        <main className="lg:col-span-2">
          <div className="rounded-2xl bg-white shadow-xl p-6">
            {/* Header row */}
            <div className="flex items-center gap-4">
              <Avatar initials={initials} />
              <div className="flex-1">
                <div className="text-base font-semibold text-gray-900">{given_name + " " + family_name}</div>
                <div className="text-sm text-gray-500">{email}</div>
              </div>
              {/* Close icon placeholder
              <button className="text-gray-400 hover:text-gray-600">✕</button>
              */}
            </div>

            {/* Fields */}
            <div className="text-sm mt-6 divide-y divide-gray-200">
              <FieldRow label="Given Name">
                <input
                  className="w-full bg-transparent text-right text-gray-700 placeholder-gray-400 focus:outline-none"
                  value={form.given_name}
                  onChange={handle("given_name")}
                  placeholder="Your given name"
                />
              </FieldRow>
              <FieldRow label="Family Name">
                <input
                  className="w-full bg-transparent text-right text-gray-700 placeholder-gray-400 focus:outline-none"
                  value={form.family_name}
                  onChange={handle("family_name")}
                  placeholder="Your family name"
                />
              </FieldRow>
              <FieldRow label="Email account">
                <input
                  type="email"
                  className="w-full bg-transparent text-right text-gray-700 placeholder-gray-400 focus:outline-none"
                  value={form.email}
                  onChange={handle("email")}
                  placeholder="yourname@gmail.com"
                />
              </FieldRow>
              <FieldRow label="Phone number">
                <div className="phone-field">
                  <PhoneInput
                    international
                    defaultCountry="US"
                    value={form.phone}
                    onChange={(value) => handle('phone')({ target: { value } })}
                    countryCallingCodeEditable={false}
                    numberInputProps={{
                      className: 'bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none',
                      placeholder: 'Add number',
                    }}
                  />
                </div>
              </FieldRow>
            </div>

            <div className="text-sm pt-6">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-white font-semibold shadow hover:bg-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {pendingVerify && (
            <div className="mt-6 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Enter the code sent to your {pendingVerify === "email" ? "email" : "phone"}:
              </div>
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-500"
                  onClick={async () => {
                    await confirmUserAttribute({
                      userAttributeKey: pendingVerify,
                      confirmationCode: verifyCode.trim(),
                    });
                    setPendingVerify(null);
                    setVerifyCode("");
                    const updated = await fetchUserAttributes();
                    setUserAttributes(updated);
                  }}
                >
                  Confirm
                </button>
                <button
                  className="rounded-lg border px-3 py-2 font-medium"
                  onClick={() => sendUserAttributeVerificationCode({ userAttributeKey: pendingVerify })}
                >
                  Resend
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Little helpers ---------- */

function FieldRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-gray-700 font-medium">{label}</div>
      <div className="ml-6 w-1/2 sm:w-2/5 flex justify-end">
        {children}
      </div>
    </div>
  );
}

function toE164(p) {
  if (!p) return "";
  if (p.startsWith("+")) return p;
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}