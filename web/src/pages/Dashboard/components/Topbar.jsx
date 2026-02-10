import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiSearch,
  FiChevronDown,
  FiLogOut,
  FiGrid,
  FiUsers,
  FiFileText,
  FiSettings,
  FiMenu,
  FiCamera,
  FiPhone,
  FiMail,
  FiBriefcase,
  FiMoon,
  FiSun,
} from "react-icons/fi";


import ikarisLogo from "../../../assets/ikaris-tech.png";
import { supabase } from "../../../supabaseClient";






  function initialsFromEmail(email) {
    const s = String(email || "").trim();
    if (!s) return "IK";
    const name = s.split("@")[0] || s;
    const parts = name.split(/[._-]/g).filter(Boolean);
    const a = (parts[0]?.[0] || "I").toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || "K").toUpperCase();
    return a + b;
  }

export default function Topbar({ ctx, theme, onToggleTheme }) {


    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);

    // perfil “editable” (por ahora localStorage; luego lo conectamos a company_users)
    const LS_PHONE = "ik_profile_phone";
    const LS_AVATAR = "ik_profile_avatar";

    const email = ctx?.me?.user?.email || "";
    const company = ctx?.company?.name || "IKARIS";
    const role = String(ctx?.role || "POLITES").toUpperCase();
    const plan = String(ctx?.company?.plan || "free").toUpperCase();

    // intenta agarrar “nombre” del payload; si no existe, usa el correo como fallback
    const userName =
      ctx?.me?.user?.name ||
      ctx?.me?.profile?.name ||
      ctx?.me?.company_user?.username ||
      (email ? email.split("@")[0] : "Usuario");
const representative =
  ctx?.company?.representative_name ||
  ctx?.me?.company_user?.username ||
  userName;

    // ✅ Ya no mostramos "Tipo de empresa" en el menú


    const initials = useMemo(() => initialsFromEmail(email), [email]);

    const [phone, setPhone] = useState("");
    const [phoneEditing, setPhoneEditing] = useState(false);
    const [phoneSaving, setPhoneSaving] = useState(false);

    const [avatar, setAvatar] = useState("");


    const menuRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => {
      let alive = true;

      async function boot() {
        // 1) carga rápida local
        try {
          const p = localStorage.getItem(LS_PHONE) || "";
          const a = localStorage.getItem(LS_AVATAR) || "";
          if (!alive) return;
          setPhone(onlyDigits10(p));
          setAvatar(a);
        } catch (_) {}

        // 2) sync desde Supabase (fuente real)
        try {
          const authUserId = ctx?.me?.user?.id || ctx?.me?.user?.auth_user_id || ctx?.me?.auth_user_id;
          const companyId = ctx?.company?.id;
          if (!authUserId || !companyId) return;

          const { data, error } = await supabase
            .from("company_users")
            .select("phone")
            .eq("auth_user_id", authUserId)
            .eq("company_id", companyId)
            .maybeSingle();

          if (error) return;

          const dbPhone = onlyDigits10(data?.phone || "");
          if (!alive) return;
          if (dbPhone) {
            setPhone(dbPhone);
            try {
              localStorage.setItem(LS_PHONE, dbPhone);
            } catch (_) {}
          }
        } catch (e) {
          console.warn("[Topbar] phone boot sync failed:", e);
        }
      }

      boot();
      return () => {
        alive = false;
      };
    }, [ctx?.me, ctx?.company?.id]);


    function quickNav(path) {
      if (path === "/dashboard") return window.location.assign("/dashboard");
      // placeholders controlados por ahora
      // eslint-disable-next-line no-alert
      alert(`Ir a: ${path} (próximo)`);
    }

    function onSearchSubmit(e) {
      e.preventDefault();
      if (!q.trim()) return;
      // eslint-disable-next-line no-alert
      alert(`Búsqueda global (placeholder): "${q}"`);
    }

    function onlyDigits10(v) {
      return String(v || "").replace(/\D/g, "").slice(0, 10);
    }

    function savePhoneLocal(v) {
      const clean = onlyDigits10(v);
      setPhone(clean);
      try {
        localStorage.setItem(LS_PHONE, clean);
      } catch (_) {}
      return clean;
    }

    async function savePhoneToSupabase(raw) {
      const clean = onlyDigits10(raw);

      // Si no tiene 10 dígitos, no guardamos
      if (clean.length !== 10) return { ok: false, reason: "len" };

      // OJO: si tu payload ctx.me cambia, ajusta estas rutas:
      const authUserId = ctx?.me?.user?.id || ctx?.me?.user?.auth_user_id || ctx?.me?.auth_user_id;
      const companyId = ctx?.company?.id;

      if (!authUserId || !companyId) return { ok: false, reason: "missing_ids" };

      const { error } = await supabase
        .from("company_users")
        .update({ phone: clean })
        .eq("auth_user_id", authUserId)
        .eq("company_id", companyId);

      if (error) {
        console.error("[Topbar] phone update error:", error);
        return { ok: false, reason: "db", error };
      }

      // ✅ Mantén tu UI sincronizada (menu + topbar)
      savePhoneLocal(clean);
      return { ok: true };
    }


    async function onPickAvatar(file) {
      if (!file) return;
      // para UI rápida: guardamos como dataURL en localStorage (luego lo subimos a Supabase Storage)
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        setAvatar(dataUrl);
        try {
          localStorage.setItem(LS_AVATAR, dataUrl);
        } catch (_) {}
      };
      reader.readAsDataURL(file);
    }

    // cerrar al click afuera
    useEffect(() => {
      function onDoc(e) {
        if (!open) return;
        if (!menuRef.current) return;
        if (menuRef.current.contains(e.target)) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    return (
      <header className="ik-topbar">
        <div className="ik-topbar__left">


  <div className="ik-brand">
    <img className="ik-brand__img" src={ikarisLogo} alt="IKARIS Tech" />

  </div>


          <div className="ik-quick">
            <button className="ik-quick__btn" onClick={() => quickNav("/dashboard")} title="Dashboard">
              <FiGrid />
            </button>
            <button className="ik-quick__btn" onClick={() => quickNav("/forms")} title="Forms">
              <FiFileText />
            </button>
            <button className="ik-quick__btn" onClick={() => quickNav("/users")} title="Users">
              <FiUsers />
            </button>
            <button className="ik-quick__btn" onClick={() => quickNav("/settings")} title="Settings">
              <FiSettings />
            </button>
          </div>
        </div>

        <div className="ik-topbar__mid">
          <form className="ik-search" onSubmit={onSearchSubmit}>
            <FiSearch className="ik-search__icon" />
            <input
              className="ik-search__input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en todo..."
            />
            {q ? (
              <button type="button" className="ik-search__clear" onClick={() => setQ("")}>
                ×
              </button>
            ) : null}
          </form>
        </div>

        <div className="ik-topbar__right">
          <button className="ik-iconbtn" title="Notificaciones">
            <FiBell />
            <span className="ik-dot" />
          </button>

          <div className="ik-profile" ref={menuRef}>
            <button className="ik-profile__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open ? "true" : "false"}>
              <div className="ik-avatar">
                {avatar ? <img className="ik-avatar__img" src={avatar} alt="avatar" /> : initials}
              </div>

  <div className="ik-profile__meta">
<div className="ik-profile__name">{representative}</div>
<div className="ik-profile__sub">{company}</div>

  </div>



              <FiChevronDown />
            </button>

            {/* ✅ Renderizamos siempre para permitir animación CSS */}
            <div className={`ik-menu ik-menu--profile ${open ? "open" : ""}`}>
              <div className="ik-menu__card">
                <div className="ik-menu__hero">
                  <div className="ik-menu__avatarBig">
                    {avatar ? <img className="ik-avatarBig__img" src={avatar} alt="avatar" /> : initials}
                    <button
                      className="ik-avatarBig__cam"
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      title="Cambiar foto"
                    >
                      <FiCamera />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => onPickAvatar(e.target.files?.[0])}
                    />
                  </div>

                  <div className="ik-menu__who">
<div className="ik-menu__name">{representative}</div>
<div className="ik-menu__sub">{company}</div>

                  </div>
                </div>

                <div className="ik-menu__rows">
                  {/* ✅ Theme toggle (Light / Dark) */}
<div className="ik-row ik-row--toggle" role="button" tabIndex={0} onClick={onToggleTheme}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleTheme();
    }
  }}
  title="Cambiar tema"
>
  <span className="ik-row__ic">{theme === "iris" ? <FiMoon /> : <FiSun />}</span>
  <span className="ik-row__k">Modo</span>

  <span className="ik-row__v" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
    <span style={{ opacity: 0.9, fontWeight: 900 }}>
      {theme === "iris" ? "Dark" : "Light"}
    </span>

    <span className={`ik-switch ${theme === "iris" ? "on" : ""}`} aria-hidden="true">
      <span className="ik-switch__knob" />
    </span>
  </span>
</div>

                  <div className="ik-row">
                    <span className="ik-row__ic"><FiMail /></span>
                    <span className="ik-row__k">Correo</span>
                    <span className="ik-row__v">{email || "—"}</span>
                  </div>

                  <div className="ik-row">
                    <span className="ik-row__ic"><FiBriefcase /></span>
                    <span className="ik-row__k">Empresa</span>
                    <span className="ik-row__v">{company}</span>
                  </div>



                  <div className="ik-row">
                    <span className="ik-row__ic"><FiPhone /></span>
                    <span className="ik-row__k">Teléfono</span>

                    {!phoneEditing ? (
                      <button
                        type="button"
                        className="ik-row__valueBtn"
                        onClick={() => setPhoneEditing(true)}
                        title="Editar teléfono"
                      >
                        <span className="ik-row__v">
                          {phone && phone.length === 10 ? phone : "Agregar…"}
                        </span>
                      </button>
                    ) : (
                      <input
                        autoFocus
                        className="ik-row__input"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => savePhoneLocal(e.target.value)}
                        onKeyDown={async (e) => {
                          // bloquear teclas raras (pero permitir control/shortcuts)
                          if (!e.ctrlKey && !e.metaKey) {
                            const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End", "Enter", "Escape"];
                            const isDigit = /^[0-9]$/.test(e.key);
                            if (!isDigit && !allowed.includes(e.key)) {
                              e.preventDefault();
                            }
                          }

                          if (e.key === "Escape") {
                            e.preventDefault();
                            setPhoneEditing(false);
                            return;
                          }

                          if (e.key === "Enter") {
                            e.preventDefault();
                            setPhoneSaving(true);
                            const res = await savePhoneToSupabase(phone);
                            setPhoneSaving(false);

                            if (res.ok) {
                              setPhoneEditing(false); // ✅ vuelve a texto normal
                            } else {
                              console.warn("Phone not saved:", res.reason);
                              // se queda en edición para corregir
                            }
                          }
                        }}
                        placeholder="10 dígitos…"
                      />
                    )}

                    {phoneSaving ? <span className="ik-row__hint">Guardando…</span> : null}
                  </div>



                  <div className="ik-row">
                    <span className="ik-row__ic">★</span>
                    <span className="ik-row__k">Plan</span>
                    <span className="ik-row__v">{plan}</span>
                  </div>
                </div>

                <div className="ik-menu__actions">
                  <button className="ik-menu__item" onClick={() => ctx.logout()}>
                    <FiLogOut />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }
