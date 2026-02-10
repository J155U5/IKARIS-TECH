import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { apiFetch } from "../api";
import AuthLayout from "./AuthLayout";

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout en ${label} (${ms}ms)`)), ms)
    ),
  ]);
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [status, setStatus] = useState("Procesando callback...");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    async function run() {
      // ✅ fallback duro: si algo se cuelga, manda a login
      const killer = setTimeout(() => {
        if (!cancelled) navigate("/login", { replace: true });
      }, 25000);

      try {
        setStatus("Leyendo callback...");

        const url = new URL(window.location.href);

        // 0) Error OAuth en query
        const oauthErr =
          url.searchParams.get("error_description") || url.searchParams.get("error");
        if (oauthErr) {
          navigate("/login", { replace: true });
          return;
        }

        // 1) PKCE: code -> session
        const code = url.searchParams.get("code");
        if (code) {
          setStatus("Intercambiando code por sesión...");
          const { error } = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            12000,
            "exchangeCodeForSession"
          );
          if (error) throw error;

          // limpia URL para evitar re- exchange
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          window.history.replaceState({}, document.title, url.toString());
        }

        // 2) getSession
        setStatus("Obteniendo sesión...");
        const { data: sessData, error: sessErr } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "getSession"
        );
        if (sessErr) throw sessErr;

        const session = sessData?.session;
        if (!session?.access_token) {
          navigate("/login", { replace: true });
          return;
        }

// 3) /auth/me con token actual
setStatus("Validando permisos...");
const me = await withTimeout(
  apiFetch("/auth/me", { tokenOverride: session.access_token }),
  12000,
  "/auth/me"
);

if (cancelled) return;

// ✅ flujo guardado por Login/Register: "login" | "signup"
const flow = localStorage.getItem("IKARIS_OAUTH_FLOW");

// ✅ 3.1) Detecta empresa desde /auth/me (cualquier formato posible)
const getCompanyId = (obj) =>
  obj?.company?.id ||
  obj?.company_id ||
  obj?.companyId ||
  obj?.company?.company_id ||
  obj?.company?.companyId;

let companyId = getCompanyId(me);

// ✅ Google SIGNUP: si no hay empresa todavía → onboarding (CompleteOnboarding)
if (flow === "signup" && (me?.needs_onboarding === true || !me?.company?.id || !companyId)) {
  const raw = localStorage.getItem("IKARIS_PENDING_COMPANY");
  const prefill = raw ? JSON.parse(raw) : null;

  // ✅ importante: no dejes el flow pegado
  localStorage.removeItem("IKARIS_OAUTH_FLOW");

  navigate("/onboarding", { replace: true, state: { prefill } });
  return;
}

// ✅ Google LOGIN: SIEMPRE dashboard (no onboarding)
if (flow === "login") {
  // ✅ importante: limpia flow
  localStorage.removeItem("IKARIS_OAUTH_FLOW");

  navigate("/dashboard", { replace: true });
  return;
}

// ✅ (no Google / no flow): sigue tu lógica normal (email/password, etc.)

// ✅ 3.2) Si /auth/me no trae empresa, hacemos fallback REAL:
// buscar en Supabase public.company_users por auth_user_id (session.user.id)
if (!companyId) {
  try {
    setStatus("Buscando empresa en Supabase...");

    const authUserId = session?.user?.id;

    const { data: cu, error: cuErr } = await withTimeout(
      supabase
        .from("company_users")
        .select("company_id")
        .eq("auth_user_id", authUserId)
        .limit(1)
        .maybeSingle(),
      12000,
      "company_users lookup"
    );

    if (!cuErr && cu?.company_id) {
      companyId = cu.company_id;
    }
  } catch (_) {}
}

// ✅ 3.3) Último intento (solo por timing): retry /auth/me
if (!companyId) {
  try {
    await new Promise((r) => setTimeout(r, 600));
    const me2 = await withTimeout(
      apiFetch("/auth/me", { tokenOverride: session.access_token }),
      12000,
      "/auth/me retry"
    );
    companyId = getCompanyId(me2);
  } catch (_) {}
}

// ✅ 3.4) Decisión FINAL normal
const needsOnboarding = !companyId;
const dest = needsOnboarding ? "/onboarding" : "/dashboard";




        // ✅ limpia locks para que no se atore
        sessionStorage.removeItem("IKARIS_CALLBACK_DONE");
        localStorage.removeItem("IKARIS_OAUTH_FLOW");

        setStatus(`Redirigiendo a ${dest}...`);

        // ✅ navegación SPA (no recarga dura)
        navigate(dest, { replace: true });

        // ✅ respaldo extra (por si el router no navega por alguna razón)
        setTimeout(() => {
          if (!cancelled && window.location.pathname === "/auth/callback") {
            window.location.href = dest;
          }
        }, 800);

        return;
      } catch (err) {
        console.error("AuthCallback error:", err);
        sessionStorage.removeItem("IKARIS_CALLBACK_DONE");
        localStorage.removeItem("IKARIS_OAUTH_FLOW");
        if (!cancelled) navigate("/login", { replace: true });
        return;
      } finally {
        clearTimeout(killer);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AuthLayout
      title="Procesando inicio de sesión..."
      subtitle={status}
      sideTitle="IKARIS"
      sideText="Un momento por favor."
    >
      <div style={{ textAlign: "center", padding: 32 }}>
        <div className="spinner" />
      </div>
    </AuthLayout>
  );
}
