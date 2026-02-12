// web/src/ui/GlobalLoadingOverlay.jsx
import React from "react";
import "./globalLoadingOverlay.css";
import ikIcon from "../assets/IK-192.png";

export default function GlobalLoadingOverlay({ open }) {
  if (!open) return null;

  return (
    <div
      className="ik-loadingOverlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img className="ik-loadingLogo" src={ikIcon} alt="IKARIS" />
    </div>
  );
}
    