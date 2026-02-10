import React, { useEffect, useMemo, useState, useRef } from "react";
import { apiFetch } from "../../api";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import "../../styles/formbuilder.css";

import {
  FiPlus,
  FiTrash2,
  FiSave,
  FiSettings,
  FiX,
  FiChevronDown,
} from "react-icons/fi";

import {
  MdShortText,
  MdNotes,
  MdRadioButtonChecked,
  MdCheckBox,
  MdArrowDropDownCircle,
  MdNumbers,
  MdDateRange,
  MdSchedule,
  MdAttachFile,
  MdEmail,
  MdPhone,
  MdLink,
  MdCheckCircle,
  MdThumbUp,
  MdStarRate,

  // ✅ Toolbar (Google-like)
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatColorText,
  MdImage,
} from "react-icons/md";


// ✅ Tipos estilo Google/Kobo
const FIELD_TYPES = [
  { k: "short_text", label: "Respuesta corta", icon: <MdShortText />, sub: "Texto breve" },
  { k: "paragraph", label: "Párrafo", icon: <MdNotes />, sub: "Texto largo" },

  { k: "radio", label: "Varias opciones", icon: <MdRadioButtonChecked />, sub: "Una opción" },
  { k: "checkbox", label: "Casillas", icon: <MdCheckBox />, sub: "Varias opciones" },
  { k: "select", label: "Desplegable", icon: <MdArrowDropDownCircle />, sub: "Lista" },

  { k: "number", label: "Número", icon: <MdNumbers />, sub: "Entero/decimal" },
  { k: "date", label: "Fecha", icon: <MdDateRange />, sub: "Calendario" },
  { k: "time", label: "Hora", icon: <MdSchedule />, sub: "Reloj" },
  { k: "datetime", label: "Fecha y hora", icon: <MdSchedule />, sub: "Fecha + hora" },

  { k: "email", label: "Email", icon: <MdEmail />, sub: "Validación email" },
  { k: "phone", label: "Teléfono", icon: <MdPhone />, sub: "Validación teléfono" },
  { k: "url", label: "URL", icon: <MdLink />, sub: "Link" },

  { k: "yes_no", label: "Sí / No", icon: <MdThumbUp />, sub: "Booleano" },
  { k: "consent", label: "Consentimiento", icon: <MdCheckCircle />, sub: "Checkbox legal" },

  { k: "rating", label: "Calificación", icon: <MdStarRate />, sub: "Estrellas" },
  { k: "linear_scale", label: "Escala lineal", icon: <MdNumbers />, sub: "1–5 / 0–10" },

  { k: "file", label: "Subir archivo", icon: <MdAttachFile />, sub: "Adjunto" },
];

function getTypeMeta(k) {
  return FIELD_TYPES.find((t) => t.k === k) || FIELD_TYPES[0];
}

// =========================
// ✅ Toolbar REAL + RichTextField (contentEditable)
// - Bold/Italic/Underline/Color sobre selección
// - Toggle: si no hay selección, afecta lo que escribas
// - Imagen: modal tipo "Arrastra el archivo aquí" + drag&drop
// =========================

function InlineToolbar({ onCmd, onImage }) {
  return (
    <div className="fb-toolbar" onMouseDown={(e) => e.preventDefault()}>
      <button type="button" className="fb-tbBtn" title="Negrita" onClick={() => onCmd("bold")}>
        <MdFormatBold />
      </button>

      <button type="button" className="fb-tbBtn" title="Cursiva" onClick={() => onCmd("italic")}>
        <MdFormatItalic />
      </button>

      <button
        type="button"
        className="fb-tbBtn"
        title="Subrayado"
        onClick={() => onCmd("underline")}
      >
        <MdFormatUnderlined />
      </button>

      <button
        type="button"
        className="fb-tbBtn"
        title="Color de texto"
        onClick={(e) => {
          e.stopPropagation();
          onCmd("color");
        }}
      >
        <MdFormatColorText />
      </button>

    </div>
  );
}

function RichTextField({
  value,
  onChange,
  placeholder,
  variant = "default", // "default" | "title"
  minHeight = 44,
}) {
  const ref = useRef(null);



  // ✅ Color popover (faltaba esto)
  const [colorOpen, setColorOpen] = useState(false);
  const [colorPos, setColorPos] = useState({ top: 0, left: 0 });

  // toggle states (para cuando no hay selección)
  const [tBold, setTBold] = useState(false);
  const [tItalic, setTItalic] = useState(false);
  const [tUnderline, setTUnderline] = useState(false);
  const [tColor, setTColor] = useState(""); // ej "#ff0000"

  // Mantener HTML sincronizado
  useEffect(() => {
    if (!ref.current) return;
    const current = ref.current.innerHTML || "";
    const next = String(value || "");
    if (current !== next) ref.current.innerHTML = next || "";
  }, [value]);

  function hasSelectionInside() {
    const el = ref.current;
    const sel = window.getSelection?.();
    if (!el || !sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    return el.contains(range.commonAncestorContainer);
  }

  function applyTogglesIfNeeded() {
    const el = ref.current;
    if (!el) return;
    el.style.fontWeight = tBold ? "900" : "";
    el.style.fontStyle = tItalic ? "italic" : "";
    el.style.textDecoration = tUnderline ? "underline" : "";
    el.style.color = tColor ? tColor : "";
  }

  useEffect(() => {
    applyTogglesIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tBold, tItalic, tUnderline, tColor]);

  // ✅ cerrar popover al click afuera (AQUÍ, no en OptionsEditor)
  useEffect(() => {
    function onDown(e) {
      if (!colorOpen) return;
      const pop = document.querySelector(".fb-colorPop");
      if (pop && !pop.contains(e.target)) setColorOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorOpen]);

  function exec(cmd, val) {
    ref.current?.focus();
    try {
      document.execCommand(cmd, false, val);
    } catch (_) {}
    onChange?.(ref.current?.innerHTML || "");
  }

  function onCmd(kind, anchorEl) {
    const selected = hasSelectionInside();

    if (kind === "bold") {
      if (selected) exec("bold");
      else setTBold((v) => !v);
      return;
    }

    if (kind === "italic") {
      if (selected) exec("italic");
      else setTItalic((v) => !v);
      return;
    }

    if (kind === "underline") {
      if (selected) exec("underline");
      else setTUnderline((v) => !v);
      return;
    }

if (kind === "color") {
  // ✅ anclar debajo del campo que estás editando (ref.current)
  const el = ref.current;
  if (el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    setColorPos({
      top: r.bottom + 10,
      left: Math.min(r.left, window.innerWidth - 260),
    });
  }
  setColorOpen((v) => !v);
  return;
}

  }

 

  return (
    <div className={`fb-lineField ${variant === "title" ? "is-title" : ""}`}>
      <div
        ref={ref}
        className="fb-rich"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={() => onChange?.(ref.current?.innerHTML || "")}
        onFocus={() => applyTogglesIfNeeded()}
      />

         <InlineToolbar onCmd={onCmd} />


{colorOpen ? (
  <div
    className="fb-colorPop open"
    style={{ top: colorPos.top, left: colorPos.left }}
    onMouseDown={(e) => e.preventDefault()}
  >
    <div className="fb-colorHdr">
      <span className="fb-colorTitle">Color</span>
      <button
        type="button"
        className="fb-colorClear"
        onClick={() => {
          const selected = hasSelectionInside();
          if (selected) exec("removeFormat");
          else setTColor("");
          setColorOpen(false);
        }}
        title="Quitar formato"
      >
        Quitar
      </button>
    </div>

    <div className="fb-colorMatrix">
      {[
        // Neutros
        ["#111827","#374151","#6b7280","#9ca3af","#d1d5db","#f3f4f6","#ffffff"],
        // Rojos
        ["#7f1d1d","#b91c1c","#dc2626","#ef4444","#f87171","#fecaca","#fff1f2"],
        // Naranjas/Amarillos
        ["#7c2d12","#c2410c","#ea580c","#f97316","#fb923c","#fed7aa","#fff7ed"],
        ["#78350f","#b45309","#d97706","#f59e0b","#fbbf24","#fde68a","#fffbeb"],
        // Verdes
        ["#14532d","#15803d","#16a34a","#22c55e","#4ade80","#bbf7d0","#f0fdf4"],
        // Azules
        ["#0c4a6e","#0369a1","#0284c7","#0ea5e9","#38bdf8","#bae6fd","#f0f9ff"],
        // Índigos/Violetas
        ["#1e3a8a","#2563eb","#3b82f6","#60a5fa","#bfdbfe","#eef2ff","#ffffff"],
        ["#3b0764","#6d28d9","#7c3aed","#8b5cf6","#a78bfa","#ddd6fe","#f5f3ff"],
        // Rosas
        ["#881337","#be123c","#e11d48","#f43f5e","#fb7185","#fecdd3","#fff1f2"],
      ].flat().map((c) => (
        <button
          key={c}
          type="button"
          className="fb-colorCell"
          style={{ background: c }}
          onClick={() => {
            const selected = hasSelectionInside();
            if (selected) exec("foreColor", c);
            else setTColor(c);
            setColorOpen(false);
          }}
        />
      ))}
    </div>
  </div>
) : null}



    </div>
  );
}





function uid() {
  return "fld_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 6);
}

function normalizeField(f) {
  return {
    id: f?.id || uid(),
    type: f?.type || "short_text",
    label: f?.label || "Pregunta sin título",
    help: f?.help || "",
    required: !!f?.required,

    // ✅ opciones manuales (cuando NO hay binding)
    options: Array.isArray(f?.options) ? f.options : [],

    // ✅ NUEVO: binding ERP (opcional)
    binding: {
      enabled: !!f?.binding?.enabled,
      entity: f?.binding?.entity || "",        // ej: "departments"
      valueCol: f?.binding?.valueCol || "id",  // ej: "id"
      labelCol: f?.binding?.labelCol || "name",// ej: "name"
      mode: f?.binding?.mode || "select",      // "select" | "autocomplete"
    },

    // ✅ NUEVO: cómo se guarda la respuesta
    // "text" -> string normal
    // "id_label" -> { value, label }
    valueMode: f?.valueMode || "text",
    // ✅ NUEVO: configuración por tipo (para preview y para FormFill)
    config: {
      // rating
      maxStars: Number(f?.config?.maxStars || 5),

      // linear_scale
      scaleMin: Number(f?.config?.scaleMin || 1),
      scaleMax: Number(f?.config?.scaleMax || 5),

      // number
      step: f?.config?.step ?? "",

      // file
      accept: f?.config?.accept || "", // ej: "image/*,.pdf"
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
    respondent_departments: Array.isArray(f?.respondent_departments) ? f.respondent_departments : [],
    editor_departments: Array.isArray(f?.editor_departments) ? f.editor_departments : [],
  };

}
function TypePicker({ value, onChange }) {
  const meta = getTypeMeta(value);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="ik-typeWrap" ref={wrapRef}>
      <button
        type="button"
        className="ik-typeBtn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Tipo de pregunta"
      >
        <span className="ik-typeBtn__left">
          <span className="ik-typeIc">{meta.icon}</span>
          <span className="ik-typeLbl">{meta.label}</span>
        </span>
        <span className="ik-typeCaret">
          <FiChevronDown />
        </span>
      </button>

      {open ? (
        <div className="ik-typePop" onClick={(e) => e.stopPropagation()}>
          <div className="ik-typePop__panel">
            <div className="ik-typePop__grid">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  className="ik-typePopItem"
                  onClick={() => {
                    onChange(t.k);
                    setOpen(false);
                  }}
                >
                  <span className="ik-typePopItem__ic">{t.icon}</span>
                  <span className="ik-typePopItem__txt">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



function renderTypePreview(f) {
  const t = f.type;

  // 👇 Preview "real": usamos type correcto.
  // Para que se vea como control real pero no te ensucie el builder,
  // dejamos editable visualmente, pero NO guardamos nada.
  // (Si quieres bloquear interacción, cambia pointerEvents a "none".)
  const common = {
    className: "ik-row__input",
    style: { height: 42 },
    defaultValue: "",
  };

  if (t === "short_text") return <input {...common} type="text" placeholder="Respuesta…" />;
  if (t === "email") return <input {...common} type="email" placeholder="correo@dominio.com" />;
  if (t === "phone") return <input {...common} type="tel" placeholder="Teléfono…" />;
  if (t === "url") return <input {...common} type="url" placeholder="https://…" />;

  if (t === "paragraph") {
    return (
      <textarea
        className="ik-row__input"
        style={{ minHeight: 90 }}
        placeholder="Respuesta larga…"
        defaultValue=""
      />
    );
  }

  if (t === "number") {
    return (
      <input
        {...common}
        type="number"
        step={String(f?.config?.step || "any")}
        placeholder="0"
      />
    );
  }

  // ✅ AQUÍ está el cambio clave: inputs de fecha/hora reales
  if (t === "date") return <input {...common} type="date" />;
  if (t === "time") return <input {...common} type="time" />;
  if (t === "datetime") return <input {...common} type="datetime-local" />;

  if (t === "select") {
    return (
      <select className="ik-row__input" style={{ height: 42 }} defaultValue="" disabled>
        <option value="">Selecciona…</option>
      </select>
    );
  }


  if (t === "radio") {
    return (
      <div style={{ display: "grid", gap: 10, opacity: 0.9 }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
          <input type="radio" disabled /> Opción…
        </label>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
          Las opciones se editan abajo.
        </div>
      </div>
    );
  }


  if (t === "checkbox") {
    return (
      <div style={{ display: "grid", gap: 10, opacity: 0.9 }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
          <input type="checkbox" disabled /> Opción…
        </label>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
          Las opciones se editan abajo.
        </div>
      </div>
    );
  }


  if (t === "yes_no") {
    return (
      <div className="ik-chipRow">
        <span className="ik-chipMini">Sí</span>
        <span className="ik-chipMini">No</span>
      </div>
    );
  }

  if (t === "consent") {
    return (
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
        <input type="checkbox" /> Acepto / Confirmo
      </label>
    );
  }

  if (t === "rating") {
    const n = Math.max(3, Math.min(10, Number(f?.config?.maxStars || 5)));
    return (
      <div style={{ display: "flex", gap: 6, fontSize: 20 }}>
        {Array.from({ length: n }).map((_, i) => (
          <button
            key={i}
            type="button"
            style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 20 }}
            title={`${i + 1}`}
          >
            ☆
          </button>
        ))}
      </div>
    );
  }

  if (t === "linear_scale") {
    const a = Number(f?.config?.scaleMin ?? 1);
    const b = Number(f?.config?.scaleMax ?? 5);
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const arr = [];
    for (let i = min; i <= Math.min(max, min + 9); i++) arr.push(i);

    return (
      <div className="ik-chipRow">
        {arr.map((n) => (
          <button
            key={n}
            type="button"
            className="ik-chipMini"
            style={{ cursor: "pointer" }}
            title={`${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  if (t === "file") {
    return (
      <input
        type="file"
        className="ik-row__input"
        style={{ height: 42, paddingTop: 8 }}
        accept={String(f?.config?.accept || "")}
        multiple={!!f?.config?.multiple}
      />
    );
  }

  return <div style={{ opacity: 0.8 }}>Vista previa no disponible.</div>;
}

function OptionsEditor({ value, onChange }) {
  const opts = Array.isArray(value) ? value : [];

  function setAt(i, next) {
    const copy = [...opts];
    copy[i] = next;
    onChange(copy);
  }

  function add() {
    onChange([...(opts.length ? opts : []), `Opción ${opts.length + 1}`]);
  }

  function remove(i) {
    const copy = [...opts];
    copy.splice(i, 1);
    onChange(copy);
  }

  useEffect(() => {
    if (opts.length === 0) onChange(["Opción 1", "Opción 2"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ik-optEditor">
      {opts.map((opt, i) => (
        <div key={`${i}_${opt}`} className="ik-optRow">
          <input
            className="ik-row__input"
            style={{ height: 42 }}
            value={String(opt || "")}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={`Opción ${i + 1}`}
          />

          <button
            type="button"
            className="ik-ibtn--iconOnly"
            title="Quitar opción"
            onClick={() => remove(i)}
          >
            <FiTrash2 />
          </button>
        </div>
      ))}

      <div className="ik-optActions">
        <button type="button" className="ik-optAdd" onClick={add}>
          <FiPlus /> Agregar opción
        </button>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const nav = useNavigate();

  const { id } = useParams(); // si existe => edit
  const isEdit = !!id;

  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("Nuevo formulario");
  const [description, setDescription] = useState("");

  const [fields, setFields] = useState([normalizeField({ label: "Nueva pregunta" })]);
  const [activeFieldId, setActiveFieldId] = useState(fields?.[0]?.id || null);

  // Drawer
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("form"); // "form" | "field"

  // permisos del form
  const [assignedDepartments, setAssignedDepartments] = useState([]);
  const [respondentDepartments, setRespondentDepartments] = useState([]);
  const [editorDepartments, setEditorDepartments] = useState([]);
  const [typeMenuFieldId, setTypeMenuFieldId] = useState(null);

  useEffect(() => {
    // asegura activeFieldId válido
    if (!fields.length) return;
    if (!activeFieldId || !fields.some((f) => f.id === activeFieldId)) {
      setActiveFieldId(fields[0].id);
    }
  }, [fields, activeFieldId]);

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

      if (isEdit) {
        const res = await apiFetch(`/forms/${id}`);
        const f = res?.form;
        if (f) {
          setTitle(f.title || "Formulario");
          setDescription(f.description || "");
          setFields((Array.isArray(f.fields) ? f.fields : []).map(normalizeField));

          setAssignedDepartments(Array.isArray(f.assigned_departments) ? f.assigned_departments : []);
          setRespondentDepartments(Array.isArray(f.respondent_departments) ? f.respondent_departments : []);
          setEditorDepartments(Array.isArray(f.editor_departments) ? f.editor_departments : []);
        }
      }
    } catch (e) {
      console.error(e);
      window.location.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const role = String(ctx?.role || "POLITES").toUpperCase();
  const canCreate =
    role === "ARCHON" || role === "EPISTATES" || ctx?.me?.companyUser?.can_create_forms === true;

  useEffect(() => {
    if (!loading && !canCreate) nav("/forms");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canCreate]);

  function addField() {
    const nf = normalizeField({ label: "Nueva pregunta" });
    setFields((prev) => [...prev, nf]);
    setActiveFieldId(nf.id);
  }

  function delField(fid) {
    setFields((prev) => prev.filter((x) => x.id !== fid));
    if (activeFieldId === fid) {
      // el useEffect ya repara el active
    }
  }
  function dupField(fid) {
    const i = fields.findIndex((x) => x.id === fid);
    if (i < 0) return;
    const base = fields[i];
    const copy = normalizeField({ ...base, id: uid() });
    setFields((prev) => {
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
    setActiveFieldId(copy.id);
  }

  function insertFieldAfter(fid) {
    const i = fields.findIndex((x) => x.id === fid);
    const nf = normalizeField({ label: "Nueva pregunta" });
    setFields((prev) => {
      const next = [...prev];
      const idx = i >= 0 ? i + 1 : next.length;
      next.splice(idx, 0, nf);
      return next;
    });
    setActiveFieldId(nf.id);
  }

function patchField(fid, patch) {
  setFields((prev) => prev.map((x) => (x.id === fid ? normalizeField({ ...x, ...patch }) : x)));
}

function parseDepts(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}


  function openSettings(tab, fieldId) {
    if (fieldId) setActiveFieldId(fieldId);
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  async function onSave() {
    const payload = {
      title,
      description,
      fields,
      assigned_departments: assignedDepartments,
      respondent_departments: respondentDepartments,
      editor_departments: editorDepartments,
    };

    try {
      if (!isEdit) {
        const res = await apiFetch("/forms", { method: "POST", body: payload });
        nav(`/forms/${res.form.id}/edit`);
      } else {
        await apiFetch(`/forms/${id}`, { method: "PUT", body: payload });
        nav("/forms");
      }
  } catch (e) {
    console.error(e);
    await Swal.fire({
      icon: "error",
      title: "No se pudo guardar",
      text: e?.message || "Verifica tu conexión o permisos.",
      confirmButtonText: "OK",
    });
  }

  }

  const activeField = fields.find((f) => f.id === activeFieldId) || null;
  const activeIsOpt = activeField ? ["radio", "checkbox", "select"].includes(activeField.type) : false;

  return (
    <DashboardLayout ctx={ctx || { loading: true }}>
      <div style={{ padding: 6 }}>
        <div className="ik-pagehead">
          <div>
            <div className="ik-h1">{isEdit ? "Editar formulario" : "Nuevo formulario"}</div>
            <div className="ik-sub">Constructor minimal + permisos en panel lateral.</div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="ik-actionBtn ghost"
              onClick={() => openSettings("form")}
              title="Permisos (⚙️)"
              style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
            >
              <FiSettings /> Ajustes
            </button>

            <button className="ik-actionBtn" onClick={onSave} disabled={!canCreate}>
              <FiSave /> &nbsp; Guardar
            </button>
          </div>
        </div>

        <div className="ik-fb">
{/* Top (título/descripcion) */}
<div className="ik-fb__top">
  <RichTextField
  variant="title"
  value={title}
  onChange={(html) => setTitle(html)}
  placeholder="Título del formulario"
  minHeight={54}
/>


<RichTextField
  value={description}
  onChange={(html) => setDescription(html)}
  placeholder="Descripción (opcional)"
  minHeight={54}
/>

</div>


          {/* Preguntas */}
          {fields.map((f) => {
            const isOpt = ["radio", "checkbox", "select"].includes(f.type);
            const active = f.id === activeFieldId;

return (
  <div
    key={f.id}
    className={`ik-q ${active ? "is-active" : ""}`}
    onClick={() => setActiveFieldId(f.id)}
  >
    {typeMenuFieldId === f.id ? (
      <div className="ik-typeInline" onClick={(e) => e.stopPropagation()}>
        <div className="ik-typeInline__top">
          <div className="ik-typeInline__title">Tipo de pregunta</div>

          <button
            type="button"
            className="ik-ibtn--iconOnly"
            onClick={() => setTypeMenuFieldId(null)}
            title="Cerrar"
          >
            <FiX />
          </button>
        </div>

        <div className="ik-typeInline__grid">
          {FIELD_TYPES.map((t) => (
            <button
              key={t.k}
              type="button"
              className="ik-typeInline__item"
              onClick={() => {
                const nextType = t.k;
                const nextIsOpt = ["radio", "checkbox", "select"].includes(nextType);

                const nextConfig = { ...(f.config || {}) };
                if (nextType === "rating" && !nextConfig.maxStars) nextConfig.maxStars = 5;
                if (nextType === "linear_scale") {
                  nextConfig.scaleMin = nextConfig.scaleMin ?? 1;
                  nextConfig.scaleMax = nextConfig.scaleMax ?? 5;
                }

                patchField(f.id, {
                  type: nextType,
                  options: nextIsOpt
                    ? (Array.isArray(f.options) && f.options.length
                        ? f.options
                        : ["Opción 1", "Opción 2"])
                    : [],
                  config: nextConfig,
                });

                setTypeMenuFieldId(null);
              }}
            >
              <span className="ik-typeInline__ic">{t.icon}</span>
              <span className="ik-typeInline__txt">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    ) : (
      <>
        <div className="ik-q__head">
          <RichTextField
            value={f.label}
            onChange={(html) => patchField(f.id, { label: html })}
            placeholder="Pregunta"
            minHeight={44}
          />

          <button
            type="button"
            className="ik-typeBtn"
            onClick={(e) => {
              e.stopPropagation();
              setTypeMenuFieldId(f.id);
            }}
            title="Tipo de pregunta"
          >
            <span className="ik-typeBtn__left">
              <span className="ik-typeIc">{getTypeMeta(f.type).icon}</span>
              <span className="ik-typeLbl">{getTypeMeta(f.type).label}</span>
            </span>
            <span className="ik-typeCaret">
              <FiChevronDown />
            </span>
          </button>

          <div className="ik-required">
            <span className="ik-required__lbl">Obligatorio</span>

            <button
              type="button"
              className={`ik-switch ${f.required ? "on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                patchField(f.id, { required: !f.required });
              }}
              aria-pressed={!!f.required}
              title="Obligatorio"
            >
              <span className="ik-switch__knob" />
            </button>
          </div>

          <div className="ik-q__actions">
            <button
              type="button"
              className="ik-ibtn--iconOnly"
              title="Permisos de este campo"
              onClick={(e) => {
                e.stopPropagation();
                openSettings("field", f.id);
              }}
            >
              <FiSettings />
            </button>

            <button
              type="button"
              className="ik-ibtn--iconOnly"
              title="Duplicar"
              onClick={(e) => {
                e.stopPropagation();
                dupField(f.id);
              }}
            >
              ⧉
            </button>

            <button
              type="button"
              className="ik-ibtn--iconOnly"
              title="Insertar debajo"
              onClick={(e) => {
                e.stopPropagation();
                insertFieldAfter(f.id);
              }}
            >
              <FiPlus />
            </button>

            <button
              type="button"
              className="ik-ibtn--iconOnly"
              title="Eliminar"
              onClick={async (e) => {
                e.stopPropagation();

                const r = await Swal.fire({
                  icon: "warning",
                  title: "Eliminar campo",
                  text: "Esto eliminará la pregunta del formulario.",
                  showCancelButton: true,
                  confirmButtonText: "Eliminar",
                  cancelButtonText: "Cancelar",
                });

                if (r.isConfirmed) delField(f.id);
              }}
            >
              <FiTrash2 />
            </button>
          </div>
        </div>

        <div className="ik-q__body" onClick={(e) => e.stopPropagation()}>
          <div className="ik-q__control">{renderTypePreview(f)}</div>

          {f.type === "rating" ? (
            <input
              className="ik-row__input"
              style={{ height: 42 }}
              value={String(f?.config?.maxStars ?? 5)}
              onChange={(e) =>
                patchField(f.id, {
                  config: { ...(f.config || {}), maxStars: Number(e.target.value || 5) },
                })
              }
              placeholder="Estrellas (ej: 5)"
            />
          ) : null}

          {f.type === "linear_scale" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                className="ik-row__input"
                style={{ height: 42 }}
                value={String(f?.config?.scaleMin ?? 1)}
                onChange={(e) =>
                  patchField(f.id, {
                    config: { ...(f.config || {}), scaleMin: Number(e.target.value || 1) },
                  })
                }
                placeholder="Min (ej: 1)"
              />
              <input
                className="ik-row__input"
                style={{ height: 42 }}
                value={String(f?.config?.scaleMax ?? 5)}
                onChange={(e) =>
                  patchField(f.id, {
                    config: { ...(f.config || {}), scaleMax: Number(e.target.value || 5) },
                  })
                }
                placeholder="Max (ej: 5)"
              />
            </div>
          ) : null}

          {f.type === "file" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="ik-row__input"
                style={{ height: 42 }}
                value={String(f?.config?.accept || "")}
                onChange={(e) =>
                  patchField(f.id, { config: { ...(f.config || {}), accept: e.target.value } })
                }
                placeholder='accept (ej: "image/*,.pdf")'
              />
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
                <input
                  type="checkbox"
                  checked={!!f?.config?.multiple}
                  onChange={(e) =>
                    patchField(f.id, {
                      config: { ...(f.config || {}), multiple: e.target.checked },
                    })
                  }
                />
                Permitir múltiples archivos
              </label>
            </div>
          ) : null}

          {isOpt ? (
            <OptionsEditor
              value={f.options}
              onChange={(nextOpts) => patchField(f.id, { options: nextOpts })}
            />
          ) : null}
        </div>
      </>
    )}
  </div>
);

          })}

          <button className="ik-actionBtn" onClick={addField} style={{ width: "fit-content" }}>
            <FiPlus /> &nbsp; Agregar pregunta
          </button>
        </div>

        {/* Drawer */}
        <div className={`ik-drawer ${settingsOpen ? "open" : ""}`}>
          <div className="ik-drawer__head">
            <div className="ik-tabs">
              <button
                className={`ik-tab ${settingsTab === "form" ? "active" : ""}`}
                onClick={() => setSettingsTab("form")}
              >
                Formulario
              </button>
              <button
                className={`ik-tab ${settingsTab === "field" ? "active" : ""}`}
                onClick={() => setSettingsTab("field")}
                disabled={!activeField}
              >
                Campo
              </button>
            </div>

            <button className="ik-ibtn" onClick={() => setSettingsOpen(false)} title="Cerrar">
              <FiX />
            </button>
          </div>

          <div className="ik-drawer__body">
            {settingsTab === "form" ? (
              <>
                <div className="ik-sub" style={{ marginBottom: 12 }}>
                  Permisos del formulario (departamentos separados por coma).
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
  Visibilidad general
</div>

                    <input
                      className="ik-row__input"
                      style={{ height: 42 }}
                      value={assignedDepartments.join(", ")}
                      onChange={(e) => setAssignedDepartments(parseDepts(e.target.value))}
                      placeholder="Si vacío => visible a toda la empresa"
                    />
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
  Quién puede responder
</div>

                    <input
                      className="ik-row__input"
                      style={{ height: 42 }}
                      value={respondentDepartments.join(", ")}
                      onChange={(e) => setRespondentDepartments(parseDepts(e.target.value))}
                      placeholder="Si vacío => cualquiera con visibilidad"
                    />
                  </div>

                  <div>
                   <div style={{ fontWeight: 900, marginBottom: 6 }}>
  Quién puede editar
</div>

                    <input
                      className="ik-row__input"
                      style={{ height: 42 }}
                      value={editorDepartments.join(", ")}
                      onChange={(e) => setEditorDepartments(parseDepts(e.target.value))}
                      placeholder="Ej: DIRECCION, AUDITORIA"
                    />
                  </div>

                  <button className="ik-miniBtn" onClick={() => nav("/forms")}>
                    Volver a lista
                  </button>
                </div>
              </>
            ) : (
              <>
                {!activeField ? (
                  <div className="ik-empty">Selecciona un campo para editar permisos.</div>
                ) : (
                  <>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
                      Campo: <span style={{ opacity: 0.85 }}>{activeField.label}</span>
                    </div>

                    <div className="ik-sub" style={{ marginBottom: 12 }}>
                      Visibilidad/edición por rol + deptos por campo.
                    </div>

<div style={{ display: "grid", gap: 12 }}>
  <div className="ik-card" style={{ padding: 12 }}>
    <div style={{ fontWeight: 900, marginBottom: 10 }}>Respondent</div>

    <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
      <input
        type="checkbox"
        checked={activeField.visibility.respondent !== false}
        onChange={(e) =>
          patchField(activeField.id, {
            visibility: { ...activeField.visibility, respondent: e.target.checked },
          })
        }
      />
      Visible
    </label>

    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <input
        type="checkbox"
        checked={activeField.editable.respondent !== false}
        onChange={(e) =>
          patchField(activeField.id, {
            editable: { ...activeField.editable, respondent: e.target.checked },
          })
        }
      />
      Editable
    </label>

    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>Deptos respondent (coma)</div>
      <input
        className="ik-row__input"
        style={{ height: 42 }}
        value={activeField.respondent_departments.join(", ")}
        onChange={(e) =>
          patchField(activeField.id, { respondent_departments: parseDepts(e.target.value) })
        }
        placeholder="Ej: ALMACEN, TRAFICO"
      />
    </div>
  </div>

  <div className="ik-card" style={{ padding: 12 }}>
    <div style={{ fontWeight: 900, marginBottom: 10 }}>Editor</div>

    <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
      <input
        type="checkbox"
        checked={activeField.visibility.editor !== false}
        onChange={(e) =>
          patchField(activeField.id, {
            visibility: { ...activeField.visibility, editor: e.target.checked },
          })
        }
      />
      Visible
    </label>

    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <input
        type="checkbox"
        checked={activeField.editable.editor !== false}
        onChange={(e) =>
          patchField(activeField.id, {
            editable: { ...activeField.editable, editor: e.target.checked },
          })
        }
      />
      Editable
    </label>

    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>Deptos editor (coma)</div>
      <input
        className="ik-row__input"
        style={{ height: 42 }}
        value={activeField.editor_departments.join(", ")}
        onChange={(e) =>
          patchField(activeField.id, { editor_departments: parseDepts(e.target.value) })
        }
        placeholder="Ej: DIRECCION, AUDITORIA"
      />
    </div>
  </div>

  <div className="ik-card" style={{ padding: 12 }}>
    <div style={{ fontWeight: 900, marginBottom: 10 }}>Vinculación (ERP)</div>

    <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
      <input
        type="checkbox"
        checked={!!activeField.binding?.enabled}
        onChange={(e) =>
          patchField(activeField.id, {
            binding: { ...activeField.binding, enabled: e.target.checked },
            // si activas binding, lo correcto es guardar id+label
            valueMode: e.target.checked ? "id_label" : "text",
            // si activas binding, lo correcto es que el tipo sea select por defecto
            type: e.target.checked ? "select" : activeField.type,
            options: e.target.checked ? [] : activeField.options,
          })
        }
      />
      Usar datos del sistema (catálogos)
    </label>

    {activeField.binding?.enabled ? (
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Catálogo</div>
          <select
            className="ik-row__input"
            style={{ height: 42 }}
            value={activeField.binding.entity || ""}
            onChange={(e) =>
              patchField(activeField.id, {
                binding: { ...activeField.binding, entity: e.target.value },
              })
            }
          >
            <option value="">Selecciona…</option>
            <option value="departments">Departamentos</option>
            <option value="company_users">Usuarios</option>
            {/* luego agregamos: terceros, productos, etc */}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Columna ID</div>
            <input
              className="ik-row__input"
              style={{ height: 42 }}
              value={activeField.binding.valueCol || "id"}
              onChange={(e) =>
                patchField(activeField.id, {
                  binding: { ...activeField.binding, valueCol: e.target.value },
                })
              }
              placeholder="id"
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Columna texto</div>
            <input
              className="ik-row__input"
              style={{ height: 42 }}
              value={activeField.binding.labelCol || "name"}
              onChange={(e) =>
                patchField(activeField.id, {
                  binding: { ...activeField.binding, labelCol: e.target.value },
                })
              }
              placeholder="name"
            />
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Modo</div>
          <select
            className="ik-row__input"
            style={{ height: 42 }}
            value={activeField.binding.mode || "select"}
            onChange={(e) =>
              patchField(activeField.id, {
                binding: { ...activeField.binding, mode: e.target.value },
              })
            }
          >
            <option value="select">Desplegable</option>
            <option value="autocomplete">Autocompletar</option>
          </select>
        </div>

        <div className="ik-empty">
          Al responder, se guardará: {"{ value: id, label: texto }"}.
        </div>
      </div>
    ) : null}
  </div>

  {activeIsOpt ? (
    <div className="ik-empty">
      Tip: Las opciones del campo se editan en “Detalles” dentro de la pregunta.
    </div>
  ) : null}
</div>

                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

 }