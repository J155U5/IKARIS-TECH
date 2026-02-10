import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";

function safeArr(x) {
  return Array.isArray(x) ? x : [];
}

function normalizeField(f) {
  return {
    id: f?.id || "",
    type: f?.type || "short_text",
    label: f?.label || "Pregunta",
    help: f?.help || "",
    required: !!f?.required,
    options: safeArr(f?.options),

    binding: {
      enabled: !!f?.binding?.enabled,
      entity: f?.binding?.entity || "",
      valueCol: f?.binding?.valueCol || "id",
      labelCol: f?.binding?.labelCol || "name",
      mode: f?.binding?.mode || "select", // select | autocomplete
    },
    valueMode: f?.valueMode || "text", // text | id_label

    // ✅ Config por tipo
    config: {
      maxStars: Number(f?.config?.maxStars || 5),
      scaleMin: Number(f?.config?.scaleMin || 1),
      scaleMax: Number(f?.config?.scaleMax || 5),
      step: f?.config?.step ?? "",
      accept: f?.config?.accept || "",
      multiple: !!f?.config?.multiple,
    },

    visibility: {
      respondent: f?.visibility?.respondent !== false,
      editor: f?.visibility?.editor !== false,
    },
    editable: {
      respondent: f?.editable?.respondent !== false,
      editor: f?.editable?.editor !== false,
    },
    respondent_departments: safeArr(f?.respondent_departments),
    editor_departments: safeArr(f?.editor_departments),
  };
}

function canRespondToField(field, myDept) {
  const allowed = safeArr(field?.respondent_departments).map((x) => String(x).toUpperCase());
  if (allowed.length === 0) return true;
  return allowed.includes(String(myDept || "").toUpperCase());
}

function canSeeField(field) {
  return field?.visibility?.respondent !== false;
}

export default function FormFill() {
  const { id } = useParams();
  const nav = useNavigate();

  const [ctx, setCtx] = useState(null);
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [lookups, setLookups] = useState({});
  const [lookupLoading, setLookupLoading] = useState({});

  const myDept = ctx?.me?.companyUser?.department || ctx?.me?.department || "";

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
      const formObj = f?.form || null;
      setForm(formObj);

      const flds = safeArr(formObj?.fields).map(normalizeField);
      setFields(flds);

      const init = {};
      for (const fld of flds) {
        if (fld.type === "checkbox") init[fld.id] = [];
        else if (fld.type === "consent") init[fld.id] = false;
        else init[fld.id] = "";
      }
      setAnswers(init);
    } catch (e) {
      console.error(e);
      alert("No tienes permiso o no se pudo cargar el formulario.");
      nav("/forms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const needed = new Set(
      fields
        .filter((f) => f?.binding?.enabled && f?.binding?.entity)
        .map((f) => String(f.binding.entity))
    );

    for (const entity of needed) {
      if (lookups[entity]) continue;
      if (lookupLoading[entity]) continue;

      (async () => {
        try {
          setLookupLoading((p) => ({ ...p, [entity]: true }));
          const res = await apiFetch(`/lookups/${entity}`);
          const items = safeArr(res?.items);
          setLookups((p) => ({ ...p, [entity]: items }));
        } catch (e) {
          console.error("lookup error:", entity, e);
        } finally {
          setLookupLoading((p) => ({ ...p, [entity]: false }));
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  function setFieldValue(fieldId, value) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  const visibleFields = useMemo(() => {
    return fields.filter((f) => canSeeField(f));
  }, [fields]);

  function validate() {
    for (const f of visibleFields) {
      if (!f.required) continue;
      if (!canRespondToField(f, myDept)) continue;

      const v = answers[f.id];
      const empty =
        v === null ||
        v === undefined ||
        v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (f.type === "consent" && v !== true);

      if (empty) return `Falta: ${f.label || "Campo requerido"}`;
    }
    return null;
  }

  async function onSubmit() {
    const err = validate();
    if (err) return alert(err);

    setSubmitting(true);
    try {
      const payloadAnswers = {};
      for (const f of visibleFields) {
        if (!canRespondToField(f, myDept)) continue;

        const v = answers[f.id];
        if (f.type === "checkbox") payloadAnswers[f.id] = safeArr(v);
        else payloadAnswers[f.id] = v;
      }

      await apiFetch(`/forms/${id}/answers`, {
        method: "POST",
        body: { answers: payloadAnswers, department: myDept || null },
      });

      alert("✅ Respuesta enviada.");
      nav(`/forms/${id}/responses`);
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo enviar la respuesta.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(f) {
    const disabled = !canRespondToField(f, myDept) || f.editable?.respondent === false;
    const value = answers[f.id];
    const useBinding = !!f?.binding?.enabled && !!f?.binding?.entity;

    // ========= Binding (catálogos) =========
    if (useBinding) {
      const entity = String(f.binding.entity);
      const items = safeArr(lookups[entity]);
      const loadingEntity = !!lookupLoading[entity];

      const selectedId =
        value && typeof value === "object" ? value.value || value.id || "" : String(value || "");

      if (f.binding.mode === "autocomplete") {
        const selectedLabel = value && typeof value === "object" ? value.label || "" : "";

        return (
          <div style={{ display: "grid", gap: 8 }}>
            <input
              className="ik-row__input"
              style={{ height: 42 }}
              disabled={disabled}
              value={selectedLabel}
              placeholder={loadingEntity ? "Cargando…" : "Escribe para buscar…"}
              onChange={(e) => setFieldValue(f.id, { value: "", label: e.target.value })}
            />

            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 12,
              }}
            >
              {(items || [])
                .filter((it) =>
                  String(it?.label || "").toLowerCase().includes(String(selectedLabel || "").toLowerCase())
                )
                .slice(0, 25)
                .map((it) => (
                  <button
                    key={it.value}
                    type="button"
                    className="ik-miniBtn"
                    style={{ width: "100%", textAlign: "left", borderRadius: 0 }}
                    disabled={disabled}
                    onClick={() => {
                      if (f.valueMode === "id_label") setFieldValue(f.id, { value: it.value, label: it.label });
                      else setFieldValue(f.id, it.label);
                    }}
                  >
                    {it.label}
                  </button>
                ))}
            </div>
          </div>
        );
      }

      return (
        <select
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={selectedId}
          onChange={(e) => {
            const picked = items.find((it) => String(it.value) === String(e.target.value));
            if (f.valueMode === "id_label") {
              setFieldValue(f.id, { value: picked?.value || e.target.value, label: picked?.label || "" });
            } else {
              setFieldValue(f.id, picked?.label || "");
            }
          }}
        >
          <option value="">{lookupLoading[entity] ? "Cargando…" : "Selecciona…"}</option>
          {items.map((it) => (
            <option key={it.value} value={it.value}>
              {it.label}
            </option>
          ))}
        </select>
      );
    }

    // ========= Tipos normales =========
    if (f.type === "short_text") {
      return (
        <input
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
          placeholder="Respuesta…"
        />
      );
    }

    if (f.type === "email") {
      return (
        <input
          type="email"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
          placeholder="correo@dominio.com"
        />
      );
    }

    if (f.type === "phone") {
      return (
        <input
          type="tel"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
          placeholder="Teléfono…"
        />
      );
    }

    if (f.type === "url") {
      return (
        <input
          type="url"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
          placeholder="https://…"
        />
      );
    }

    if (f.type === "paragraph") {
      return (
        <textarea
          className="ik-row__input"
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
          placeholder="Escribe…"
          style={{ minHeight: 90 }}
        />
      );
    }

    if (f.type === "number") {
      return (
        <input
          type="number"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          step={String(f?.config?.step || "any")}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
          placeholder="0"
        />
      );
    }

    if (f.type === "date") {
      return (
        <input
          type="date"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
        />
      );
    }

    if (f.type === "time") {
      return (
        <input
          type="time"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
        />
      );
    }

    if (f.type === "datetime") {
      return (
        <input
          type="datetime-local"
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
        />
      );
    }

    if (f.type === "radio") {
      return (
        <div style={{ display: "grid", gap: 8 }}>
          {safeArr(f.options).map((opt) => (
            <label key={opt} style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
              <input
                type="radio"
                name={f.id}
                disabled={disabled}
                checked={String(value || "") === String(opt)}
                onChange={() => setFieldValue(f.id, opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    if (f.type === "checkbox") {
      const arr = safeArr(value);
      return (
        <div style={{ display: "grid", gap: 8 }}>
          {safeArr(f.options).map((opt) => {
            const checked = arr.includes(opt);
            return (
              <label key={opt} style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) setFieldValue(f.id, [...arr, opt]);
                    else setFieldValue(f.id, arr.filter((x) => x !== opt));
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      );
    }

    if (f.type === "select") {
      return (
        <select
          className="ik-row__input"
          style={{ height: 42 }}
          disabled={disabled}
          value={String(value || "")}
          onChange={(e) => setFieldValue(f.id, e.target.value)}
        >
          <option value="">Selecciona…</option>
          {safeArr(f.options).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (f.type === "yes_no") {
      return (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="ik-miniBtn"
            disabled={disabled}
            onClick={() => setFieldValue(f.id, "Sí")}
            style={{ marginTop: 0 }}
          >
            Sí
          </button>
          <button
            type="button"
            className="ik-miniBtn"
            disabled={disabled}
            onClick={() => setFieldValue(f.id, "No")}
            style={{ marginTop: 0 }}
          >
            No
          </button>
        </div>
      );
    }

    if (f.type === "consent") {
      return (
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value === true}
            onChange={(e) => setFieldValue(f.id, e.target.checked)}
          />
          Confirmo / Acepto
        </label>
      );
    }

    if (f.type === "rating") {
      const n = Math.max(3, Math.min(10, Number(f?.config?.maxStars || 5)));
      const cur = Number(value || 0);

      return (
        <div style={{ display: "flex", gap: 8, fontSize: 24, lineHeight: 1 }}>
          {Array.from({ length: n }).map((_, i) => {
            const star = i + 1;
            const filled = star <= cur;
            return (
              <button
                key={star}
                type="button"
                disabled={disabled}
                onClick={() => setFieldValue(f.id, String(star))}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  fontSize: 24,
                }}
                title={`${star}`}
              >
                {filled ? "★" : "☆"}
              </button>
            );
          })}
        </div>
      );
    }

    if (f.type === "linear_scale") {
      const a = Number(f?.config?.scaleMin ?? 1);
      const b = Number(f?.config?.scaleMax ?? 5);
      const min = Math.min(a, b);
      const max = Math.max(a, b);

      const arr = [];
      for (let i = min; i <= max; i++) arr.push(i);

      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {arr.map((n) => (
            <button
              key={n}
              type="button"
              className="ik-miniBtn"
              disabled={disabled}
              onClick={() => setFieldValue(f.id, String(n))}
              style={{
                marginTop: 0,
                width: 54,
                height: 42,
                borderRadius: 12,
                fontWeight: 900,
                opacity: String(value || "") === String(n) ? 1 : 0.85,
              }}
              title={`${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    if (f.type === "file") {
      // Nota: si quieres subir a Supabase Storage aquí, se integra luego.
      return (
        <input
          type="file"
          className="ik-row__input"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // por ahora guardamos nombre (o luego subes y guardas URL)
            setFieldValue(f.id, file.name);
          }}
          accept={String(f?.config?.accept || "")}
          multiple={!!f?.config?.multiple}
          style={{ height: 42, paddingTop: 8 }}
        />
      );
    }

    return (
      <input
        className="ik-row__input"
        style={{ height: 42 }}
        disabled={disabled}
        value={String(value || "")}
        onChange={(e) => setFieldValue(f.id, e.target.value)}
        placeholder="Respuesta…"
      />
    );
  }

  return (
    <DashboardLayout ctx={ctx || { loading: true }}>
      <div style={{ padding: 6 }}>
        <div className="ik-pagehead">
          <div>
            <div className="ik-h1">Responder formulario</div>
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
              {form?.description ? (
                <div style={{ opacity: 0.9, marginBottom: 12 }}>{form.description}</div>
              ) : null}

              <div style={{ display: "grid", gap: 14 }}>
                {visibleFields.map((f) => {
                  const deptBlocked = !canRespondToField(f, myDept);
                  const required = !!f.required && !deptBlocked;

                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,.10)",
                        background: "rgba(255,255,255,.03)",
                        opacity: deptBlocked ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>
                        {f.label} {required ? <span style={{ opacity: 0.8 }}>*</span> : null}
                      </div>

                      {f.help ? <div style={{ opacity: 0.8, marginBottom: 10 }}>{f.help}</div> : null}

                      {deptBlocked ? (
                        <div style={{ opacity: 0.8, fontWeight: 800 }}>No aplica para tu departamento.</div>
                      ) : (
                        renderField(f)
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="ik-actionBtn" onClick={onSubmit} disabled={submitting}>
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
                <button className="ik-actionBtn ghost" onClick={() => nav("/forms")}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
