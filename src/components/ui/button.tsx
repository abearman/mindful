import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors 
        bg-neutral-200 text-neutral-900 hover:bg-neutral-300 
        disabled:opacity-50 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
