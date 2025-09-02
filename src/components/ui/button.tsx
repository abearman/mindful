// src/components/ui/button.tsx
import React from "react";

const base =
  "inline-flex items-center gap-2 justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({ asChild = false, className = "", children, ...props }) {
  // If asChild, render the child element (e.g., <a>) and merge classes/props onto it
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement;
    return React.cloneElement(child, {
      className: `${base} ${className} ${child.props.className ?? ""}`,
      ...props,
    });
  }

  // Default: render a <button>
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
