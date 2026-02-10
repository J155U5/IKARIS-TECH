import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { apiFetch } from "../../api";
import { supabase } from "../../supabaseClient";

import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";

import "./dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    setLoading(true);
    try {
      const data = await apiFetch("/auth/me");

      // Si no hay empresa, mandamos onboarding (por seguridad)
      if (!data?.company?.id) {
        await Swal.fire({
          icon: "info",
          title: "Falta completar datos",
          text: "Tu cuenta existe, pero aún no tiene empresa configurada.",
          confirmButtonText: "Completar ahora",
        });
        window.location.replace("/onboarding");
        return;
      }

      setMe(data);
    } catch (e) {
      console.error("[Dashboard] /auth/me error:", e);
      window.location.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = useMemo(() => {
    // ✅ ROL REAL: viene en membership.role
    const role =
      me?.membership?.role ||
      me?.companyUser?.role ||
      me?.user?.role ||
      me?.role ||
      "POLITES";

    return {
      me,
      user: me?.user || null,
      membership: me?.membership || null,
      role,
      company: me?.company || null,
      loading,
      refreshMe: loadMe,
      async logout() {
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        window.location.replace("/login");
      },
      go(path) {
        navigate(path);
      },
    };
  }, [me, loading, navigate]);

  return (
    <DashboardLayout ctx={ctx}>
      <DashboardHome ctx={ctx} />
    </DashboardLayout>
  );
}
