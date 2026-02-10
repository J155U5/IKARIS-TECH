import React, { useEffect, useMemo, useState } from "react";
import { FiPlus, FiEdit, FiPlay, FiList } from "react-icons/fi";
import { apiFetch } from "../../api";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { useNavigate } from "react-router-dom";

export default function FormsList() {
  const nav = useNavigate();
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);

  const [forms, setForms] = useState([]);
  const [error, setError] = useState("");

  async function loadMeAndForms() {
    setLoading(true);
    setError("");
    try {
      const me = await apiFetch("/auth/me");
      setCtx({
        me,
        user: me?.user || null,
        membership: me?.membership || null,
        role: me?.membership?.role || me?.role || "POLITES",
        company: me?.company || null,
        loading: false,
        async logout() {
          window.location.replace("/login");
        },
        go(path) {
          nav(path);
        },
      });

      const res = await apiFetch("/forms");
      setForms(res?.forms || []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar formularios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeAndForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = String(ctx?.role || "POLITES").toUpperCase();
  const canCreate = role === "ARCHON" || role === "EPISTATES" || ctx?.me?.companyUser?.can_create_forms === true;

  return (
    <DashboardLayout ctx={ctx || { loading: true }}>
      <div style={{ padding: 6 }}>
        <div className="ik-pagehead">
          <div>
            <div className="ik-h1">Forms</div>
            <div className="ik-sub">Crea, responde y administra formularios dinámicos.</div>
          </div>

          {canCreate ? (
            <button className="ik-actionBtn" onClick={() => nav("/forms/new")}>
              <FiPlus /> &nbsp; Nuevo formulario
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="ik-card" style={{ padding: 16 }}>
            {error}
          </div>
        ) : null}

        <div className="ik-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {(loading ? Array.from({ length: 6 }) : forms).map((f, idx) => (
            <div key={f?.id || idx} className="ik-card" style={{ minHeight: 170 }}>
              <div className="ik-widget">
                <div className="ik-widget__head">
                  <div className="ik-widget__title">
                    <span className="ik-widget__icon">🧾</span>
                    <span>{f?.title || "Cargando..."}</span>
                  </div>
                </div>

                <div className="ik-widget__body">
                  <div className="ik-empty" style={{ minHeight: 42 }}>
                    {f?.description || "Formulario dinámico"}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    {f?.id ? (
                      <>
                        {canCreate ? (
                          <button className="ik-miniBtn" onClick={() => nav(`/forms/${f.id}/edit`)}>
                            <FiEdit /> Editar
                          </button>
                        ) : null}

                        <button className="ik-miniBtn" onClick={() => nav(`/forms/${f.id}/fill`)}>
                          <FiPlay /> Responder
                        </button>

                        <button className="ik-miniBtn" onClick={() => nav(`/forms/${f.id}/responses`)}>
                          <FiList /> Respuestas
                        </button>
                      </>
                    ) : (
                      <button className="ik-miniBtn" disabled>
                        Cargando…
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
