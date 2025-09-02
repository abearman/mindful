import React from "react";

export function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium 
        bg-neutral-800 text-neutral-300 ${className}`}
    >
      {children}
    </span>
  );
}
