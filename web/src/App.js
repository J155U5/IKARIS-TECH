// web/src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";


import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import CompleteOnboarding from "./pages/CompleteOnboarding";

import Dashboard from "./pages/Dashboard/Dashboard";
import { supabase } from "./supabaseClient";
import { apiFetch } from "./api";

// ✅ Forms
import FormsList from "./pages/Forms/FormsList";
import FormBuilder from "./pages/Forms/FormBuilder";
import FormFill from "./pages/Forms/FormFill";
import FormResponses from "./pages/Forms/FormResponses";


// ✅ ErrorBoundary inline
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(err) {
    console.error("[ErrorBoundary]", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: "monospace", color: "#fff" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            💥 IKARIS Frontend Error
          </div>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(
              this.state.err?.stack || this.state.err?.message || this.state.err
            )}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ Route guard DURO:
// 1) debe existir sesión Supabase
// 2) debe existir perfil en tu DB (/auth/me)
// si borraste DB pero sigue sesión, aquí lo detecta y lo saca
function ProtectedRoute({ children }) {
  const [ok, setOk] = useState(null); // null=loading, false=no, true=ok
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        // 1) sesión supabase
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        const token = session?.access_token;

        if (!token) {
          if (!alive) return;
          setOk(false);
          return;
        }

        // 2) validar perfil en DB con /auth/me
        try {
          await apiFetch("/auth/me", { tokenOverride: token });
          if (!alive) return;
          setOk(true);
          return;
        } catch (e) {
          // Si no existe perfil (borraste DB) => cerrar sesión y mandar a login
          try {
            await supabase.auth.signOut();
          } catch (_) {}
          if (!alive) return;
          setOk(false);
          return;
        }
      } catch (_) {
        if (!alive) return;
        setOk(false);
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) {
    // loading simple para evitar “pantalla en blanco”
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.85 }}>Cargando…</div>
      </div>
    );
  }

  if (!ok) {
    const from = `${location.pathname}${location.search || ""}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return children;
}


// ✅ PublicOnly: si ya hay sesión, no mostrar login/register
function PublicOnly({ children }) {
  const [ok, setOk] = useState(null);
  const location = useLocation();
  const navigate = useNavigate(); // ✅ AQUI SE CREA

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const has = !!data?.session?.access_token;
        if (!alive) return;

        if (has) {
          const from = location?.state?.from || "/dashboard";
          navigate(from, { replace: true }); // ✅ YA FUNCIONA
          return;
        }

        setOk(true);
      } catch (_) {
        if (!alive) return;
        setOk(true); // si falla el check, dejamos entrar a login/register
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [location?.state?.from, navigate]);

  if (ok === null) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.85 }}>Cargando…</div>
      </div>
    );
  }

  return children;
}


export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />

          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />

          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <CompleteOnboarding />
              </ProtectedRoute>
            }
          />

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

{/* ✅ FORMS */}
<Route
  path="/forms"
  element={
    <ProtectedRoute>
      <FormsList />
    </ProtectedRoute>
  }
/>

<Route
  path="/forms/new"
  element={
    <ProtectedRoute>
      <FormBuilder />
    </ProtectedRoute>
  }
/>

<Route
  path="/forms/:id/edit"
  element={
    <ProtectedRoute>
      <FormBuilder />
    </ProtectedRoute>
  }
/>

<Route
  path="/forms/:id/fill"
  element={
    <ProtectedRoute>
      <FormFill />
    </ProtectedRoute>
  }
/>

<Route
  path="/forms/:id/responses"
  element={
    <ProtectedRoute>
      <FormResponses />
    </ProtectedRoute>
  }
/>

<Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
