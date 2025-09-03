import React, { useMemo, useState, useContext } from "react";
import { AppContext } from "../scripts/AppContext.jsx";
import { Avatar } from "./ui/Avatar.jsx"; 

import 'react-phone-number-input/style.css';
import '../styles/ManageAccount.css';
import PhoneInput from 'react-phone-number-input';


export default function ManageAccountUI({ onUpdateProfile }) {
  const {  
    userAttributes,
    storageType,
  } = useContext(AppContext);

  const name = useMemo(() => {
    const gn = userAttributes.given_name || "";
    const fn = userAttributes.family_name || "";
    return [gn, fn].filter(Boolean).join(" ").trim() || "Your name";
  }, [userAttributes]);

  const initials = useMemo(() => {
    const a = (userAttributes.given_name || "Y")[0];
    const b = (userAttributes.family_name || "N")[0];
    return `${a}${b}`.toUpperCase();
  }, [userAttributes]);

  const email = userAttributes.email || "yourname@gmail.com";
  const phone = userAttributes.phone_number || "Your phone number";

  const [form, setForm] = useState({
    name,
    email,
    phone,
  });
  const [saving, setSaving] = useState(false);

  const handle = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    try {
      setSaving(true);
      await onUpdateProfile?.(form);
    } finally {
      setSaving(false);
    }
  };

  // simple local toggle like the mockup
  const [notifMode, setNotifMode] = useState("Allow");

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
                <div className="text-base font-semibold text-gray-900">{name}</div>
                <div className="text-sm text-gray-500">{email}</div>
              </div>
              {/* Close icon placeholder
              <button className="text-gray-400 hover:text-gray-600">✕</button>
              */}
            </div>

            {/* Fields */}
            <div className="text-sm mt-6 divide-y divide-gray-200">
              <FieldRow label="Name">
                <input
                  className="w-full bg-transparent text-right text-gray-700 placeholder-gray-400 focus:outline-none"
                  value={form.name}
                  onChange={handle("name")}
                  placeholder="your name"
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
                {/* <input
                  className="w-full bg-transparent text-right text-gray-700 placeholder-gray-400 focus:outline-none"
                  value={form.phone}
                  onChange={handle("phone")}
                  placeholder="Add number"
                /> */}
            </div>

            <div className="text-sm pt-6">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-white font-semibold shadow hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
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
