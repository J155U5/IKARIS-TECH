import React from "react";
import "./auth.css";

export default function AuthLayout({
  brandLogo,
  title,
  subtitle,
  children,
  sideTitle,
  sideText,
  sideImage,
  sidePoints,
  hideRight = false,
}) {


  return (
    <div className="auth-wrap">
      <div className={`auth-card ${hideRight ? "auth-card--single" : ""}`}>
        <div className="auth-left">
<div className="auth-brand">
  {brandLogo ? (
    <img
      src={brandLogo}
      alt="IKARIS TECH"
      className="auth-brand-logo"
    />
  ) : null}
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
  <div className="auth-side">
    {sideImage ? (
      <img
        src={sideImage}
        alt="IKARIS SaaS"
        className="auth-side-img"
        loading="lazy"
      />
    ) : null}

    <div className="auth-side-title">
      {sideTitle || "IKARIS: ERP ligero, modular"}
    </div>

    <div className="auth-side-text">
      {sideText ||
        "Diseñado para empresas que necesitan control real: formularios, aprobaciones y trazabilidad."}
    </div>

    <div className="auth-side-points">
{(sidePoints?.length ? sidePoints : [
  { k: "cloud", text: "SaaS listo para usar (sin instalaciones)" },
  { k: "forms", text: "Formularios dinámicos + evidencias" },
  { k: "flow", text: "Aprobaciones y flujos por áreas" },
  { k: "shield", text: "Roles, permisos y auditoría" },
  { k: "offline", text: "Modo Offline (PWA) y sincronización" },
  { k: "reports", text: "Reportes y trazabilidad operativa" },
]).map((item, i) => {
  const k = typeof item === "string" ? "cloud" : (item?.k || "cloud");
  const text = typeof item === "string" ? item : item?.text;

  return (
    <div className="auth-side-point" key={i}>
      <span className="auth-side-ic" aria-hidden="true">
        {k === "cloud" ? (
          /* nube (SaaS) */
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7.5 18h10a4 4 0 0 0 .7-7.94A5.5 5.5 0 0 0 7.1 8.7 3.8 3.8 0 0 0 7.5 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        ) : k === "forms" ? (
          /* formulario */
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 3h10v18H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : k === "flow" ? (
          /* workflow */
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 7h6v6H7z" stroke="currentColor" strokeWidth="2"/>
            <path d="M11 10h6v6h-6z" stroke="currentColor" strokeWidth="2" opacity=".85"/>
            <path d="M13 10l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : k === "shield" ? (
          /* escudo (roles/auditoría) */
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 3l8 4v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M9.5 12l1.7 1.7L15 9.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : k === "offline" ? (
          /* offline (nube + rayo) */
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7.5 18h10a4 4 0 0 0 .7-7.94A5.5 5.5 0 0 0 7.1 8.7 3.8 3.8 0 0 0 7.5 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 11l-2 4h2l-1 4 4-6h-2l1-2z" fill="currentColor" opacity=".9"/>
          </svg>
        ) : (
          /* reportes (chart) */
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 16v-5M12 16V8M16 16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </span>
      <span>{text}</span>
    </div>
  );
})}


    </div>
  </div>
</div>

        ) : null}
      </div>
    </div>
  );
}
