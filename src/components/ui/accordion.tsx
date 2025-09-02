import React, { useState } from "react";

export function Accordion({ children, className = "" }) {
  return <div className={`divide-y divide-neutral-800 ${className}`}>{children}</div>;
}

export function AccordionItem({ value, children }) {
  return <div>{children}</div>;
}

export function AccordionTrigger({ children, className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className={`flex w-full justify-between py-3 text-left text-sm font-medium text-neutral-200 ${className}`}
    >
      {children}
      <span>{open ? "−" : "+"}</span>
    </button>
  );
}

export function AccordionContent({ children, className = "" }) {
  return <div className={`pb-3 text-sm text-neutral-400 ${className}`}>{children}</div>;
}
