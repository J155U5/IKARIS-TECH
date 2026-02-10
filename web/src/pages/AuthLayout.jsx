import React from "react";
import "./auth.css";

export default function AuthLayout({ title, subtitle, children, sideTitle, sideText, hideRight = false }) {
  return (
    <div className="auth-wrap">
      <div className={`auth-card ${hideRight ? "auth-card--single" : ""}`}>
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-logo">IK</div>
            <div>
              <div className="auth-name">IKARIS</div>
              <div className="auth-tag">TECH</div>
            </div>
          </div>

          <h1 className="auth-title">{title}</h1>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}

          {children}

          <div className="auth-foot">
            <span>© {new Date().getFullYear()} IKARIS TECH</span>
          </div>
        </div>

        {!hideRight ? (
          <div className="auth-right">
            <div className="auth-right-inner">
              <div className="auth-right-title">{sideTitle || "Control interno sin fricción"}</div>
              <div className="auth-right-text">
                {sideText ||
                  "Formularios, aprobaciones y trazabilidad. Un ERP ligero con experiencia moderna."}
              </div>

              <div className="auth-right-badges">
                <span className="badge">Multi-empresa</span>
                <span className="badge">Roles</span>
                <span className="badge">Offline (PWA)</span>
                <span className="badge">Auditoría</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
