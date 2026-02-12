// web/src/pages/RequireAuth.jsx
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { apiFetch } from "../api";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, ok: false, redirect: null });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        // 1) Validar sesión Supabase
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session) {
          setState({ loading: false, ok: false, redirect: "/login" });
          return;
        }

        // 2) Validar “perfil” en tu backend (DB)
        // Si /auth/me falla, lo tratamos como sesión inválida para tu app.
        try {
          await apiFetch("/auth/me"); // debe responder 200 si existe perfil y está ok
          setState({ loading: false, ok: true, redirect: null });
          return;
        } catch (e) {
          // Si borraste DB pero sigues con sesión, aquí cae.
          // Limpia sesión y manda a login (o onboarding si quieres)
          await supabase.auth.signOut();
          setState({ loading: false, ok: false, redirect: "/login" });
          return;
        }
      } catch (_) {
        // cualquier cosa rara -> login
        setState({ loading: false, ok: false, redirect: "/login" });
      }
    })();
  }, []);

  // Loading minimal (evita parpadeo)
  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.8 }}>Cargando…</div>
      </div>
    );
  }

  if (!state.ok) {
    return <Navigate to={state.redirect || "/login"} replace state={{ from: location }} />;
  }

  return children;
}
