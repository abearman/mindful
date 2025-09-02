import React from "react";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`}
      {...props}
    />
  );
}
