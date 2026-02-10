import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";

// =====================
// Helpers UI (Detalle)
// =====================
function pickLabel(v) {
  if (v && typeof v === "object") {
    if (typeof v.label === "string" && v.label.trim()) return v.label;
    if (typeof v.name === "string" && v.name.trim()) return v.name;
    if (typeof v.value === "string" && v.value.trim()) return v.value;
    if (typeof v.id === "string" && v.id.trim()) return v.id;
  }
  return v;
}

function asText(v) {
  const x = pickLabel(v);

  if (x === null || x === undefined) return "—";
  if (typeof x === "boolean") return x ? "Sí" : "No";
  if (typeof x === "number") return String(x);
  if (typeof x === "string") return x.trim() ? x : "—";

  if (Array.isArray(x)) {
    const parts = x.map((p) => asText(p)).filter((s) => s && s !== "—");
    return parts.length ? parts.join(", ") : "—";
  }

  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function renderAnswerValue(v) {
  if (Array.isArray(v)) {
    if (!v.length) return <span style={{ opacity: 0.75 }}>—</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {v.map((x, i) => (
          <span
            key={i}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {asText(x)}
          </span>
        ))}
      </div>
    );
  }

  const s = asText(v);
  const isUrl = typeof s === "string" && /^https?:\/\//i.test(s);

  if (isUrl) {
    return (
      <a href={s} target="_blank" rel="noreferrer" style={{ fontWeight: 900, textDecoration: "underline" }}>
        Ver archivo
      </a>
    );
  }

  return <span style={{ whiteSpace: "pre-wrap" }}>{s}</span>;
}

function safeObj(obj) {
  return obj && typeof obj === "object" ? obj : {};
}

function renderDetailCards(form, a) {
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  const ans = safeObj(a?.answers);

  if (!fields.length) {
    return (
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", opacity: 0.9 }}>
        {JSON.stringify(ans, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {fields.map((f) => {
        const key = f?.id;
        const label = f?.label || key || "Campo";
        const value = key ? ans[key] : undefined;

        const empty =
          value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

        return (
          <div
            key={key || label}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(255,255,255,.03)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
            <div style={{ opacity: empty ? 0.75 : 1 }}>{empty ? "—" : renderAnswerValue(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function FormResponses() {
  const { id } = useParams();
  const nav = useNavigate();

  const [ctx, setCtx] = useState(null);
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function boot() {
    setLoading(true);
    try {
      const me = await apiFetch("/auth/me");
      setCtx({
        me,
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

      const f = await apiFetch(`/forms/${id}`);
      setForm(f?.form || null);

      const r = await apiFetch(`/forms/${id}/answers`);
      setAnswers(r?.answers || []);
    } catch (e) {
      console.error(e);
      alert("No tienes permiso o no se pudieron cargar respuestas.");
      nav("/forms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <DashboardLayout ctx={ctx || { loading: true }}>
      <div style={{ padding: 6 }}>
        <div className="ik-pagehead">
          <div>
            <div className="ik-h1">Respuestas</div>
            <div className="ik-sub">{form?.title || "Formulario"}</div>
          </div>

          <button className="ik-actionBtn ghost" onClick={() => nav("/forms")}>
            Volver
          </button>
        </div>

        <div className="ik-card" style={{ padding: 14 }}>
          {loading ? (
            "Cargando…"
          ) : (
            <>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Total: {answers.length}</div>

              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.8 }}>
                      <th style={{ padding: 10 }}>Usuario</th>
                      <th style={{ padding: 10 }}>Depto</th>
                      <th style={{ padding: 10 }}>Estado</th>
                      <th style={{ padding: 10 }}>Fecha</th>
                      <th style={{ padding: 10 }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((a) => (
                      <tr key={a.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                        <td style={{ padding: 10, fontWeight: 800 }}>{a.user_username}</td>
                        <td style={{ padding: 10 }}>{a.department || "—"}</td>
                        <td style={{ padding: 10 }}>{a.status}</td>
                        <td style={{ padding: 10 }}>{new Date(a.created_at).toLocaleString()}</td>
                        <td style={{ padding: 10 }}>{renderDetailCards(form, a)}</td>
                      </tr>
                    ))}

                    {!answers.length ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 12, opacity: 0.8 }}>
                          No hay respuestas aún.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
