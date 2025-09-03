import React, { useMemo, useState } from "react";
import { Avatar } from "./ui/Avatar.jsx"; 
import { MenuItem } from "./ui/MenuItem.jsx";


export default function ManageAccountUI({ userAttributes = {}, onUpdateProfile }) {
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

  const [form, setForm] = useState({
    name,
    email,
    mobile: "",
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
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* RIGHT PANEL */}
        <main className="lg:col-span-2">
          <div className="rounded-2xl bg-white shadow-xl p-6">
            {/* Header row */}
            <div className="flex items-center gap-4">
              <Avatar initials={initials} />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{name}</div>
                <div className="text-sm text-gray-500">{email}</div>
              </div>
              {/* Close icon placeholder
              <button className="text-gray-400 hover:text-gray-600">✕</button>
              */}
            </div>

            {/* Fields */}
            <div className="mt-6 divide-y divide-gray-200">
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
              <FieldRow label="Mobile number">
                <input
                  className="w-full bg-transparent text-right text-gray-700 placeholder-gray-400 focus:outline-none"
                  value={form.mobile}
                  onChange={handle("mobile")}
                  placeholder="Add number"
                />
              </FieldRow>
            </div>

            <div className="pt-6">
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
      <div className="ml-6 w-1/2 sm:w-2/5">{children}</div>
    </div>
  );
}


// Minimal inline icons (no extra deps)
function Icon({ name, className }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 1-2.54 0 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 1 0-2.54 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.64 4.7l.06.06A1.65 1.65 0 0 0 9 5.4a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 1 2.54 0 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.47.47-.61 1.16-.33 1.82.24.57.37 1.2.37 1.84 0 .64-.13 1.27-.37 1.84Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    default:
      return null;
  }
}