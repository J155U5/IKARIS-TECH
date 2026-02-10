// web/src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import CompleteOnboarding from "./pages/CompleteOnboarding";

import Dashboard from "./pages/Dashboard/Dashboard";
import { supabase } from "./supabaseClient";

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

// ✅ Route guard: si no hay sesión => /login
function ProtectedRoute({ children }) {
  const [ok, setOk] = useState(null); // null=loading, false=no session, true=session
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const has = !!data?.session?.access_token;
        if (!alive) return;
        setOk(has);
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

  if (ok === null) return null;

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

  useEffect(() => {
    let alive = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      const has = !!data?.session?.access_token;
      if (!alive) return;

      if (has) {
        const from = location?.state?.from || "/dashboard";
        window.location.replace(from);
        return;
      }

      setOk(true);
    }

    check();
    return () => {
      alive = false;
    };
  }, [location?.state?.from]);

  if (ok === null) return null;
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
