import React from "react";

export default function Tooltip({ label, children, side = "top" }) {
  return (
    <span className={`tooltip-wrapper tooltip-${side}`}>
      {children}
      <span role="tooltip" className="tooltip-bubble">
        {label}
        <span className="tooltip-arrow" />
      </span>
    </span>
  );
}
