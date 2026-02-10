import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { supabase } from "../supabaseClient";
import { apiFetch } from "../api";
import AuthLayout from "./AuthLayout";
import "./auth.css";

const SECTORS = [
  "Manufactura automotriz",
  "Manufactura electrónica",
  "Industria alimentaria",
  "Industria farmacéutica",
  "Construcción e infraestructura",
  "Energía renovable",
  "Petróleo y gas",
  "Comercio minorista (retail)",
  "Comercio mayorista",
  "Comercio electrónico (e-commerce)",
  "Transporte terrestre de carga",
  "Transporte marítimo",
  "Transporte aéreo",
  "Logística y cadena de suministro",
  "Desarrollo de software",
  "Servicios de tecnología e IT",
  "Servicios financieros y banca",
  "Seguros y aseguradoras",
  "Bienes raíces e inmobiliaria",
  "Turismo y hotelería",
  "Restaurantes y alimentos preparados",
  "Telecomunicaciones",
  "Agricultura y agroindustria",
  "Ganadería y producción pecuaria",
  "Minería",
  "Medios de comunicación y publicidad",
  "Educación privada",
  "Servicios médicos y hospitales",
  "Consultoría empresarial",
  "Entretenimiento y videojuegos",
  "OTRO",
];

const ORG_TYPES = [
  "Empresas con fines de lucro",
  "Empresas sin fines de lucro",
  "Empresas públicas",
  "Empresas privadas",
  "Empresas mixtas",
  "OTRO",
];

function validatePassword(pw) {
  if (!pw || pw.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(pw)) return "Debe incluir al menos 1 mayúscula";
  if (!/[a-z]/.test(pw)) return "Debe incluir al menos 1 minúscula";
  if (!/[0-9]/.test(pw)) return "Debe incluir al menos 1 número";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Debe incluir al menos 1 caracter especial";
  if (/[.,;'"´“”]/.test(pw)) return 'No se permiten . , ; comillas (\' " ) ni ´';
  return null;
}

function slugifyCompany(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    representative_name: "",
    company_name: "",
    email: "",
    password: "",
    confirm: "",
    country: "México",
    sector: SECTORS[0],
    organization_type: ORG_TYPES[0],
    accept_terms: false,
    marketing_opt_in: false,
  });

  const [loading, setLoading] = useState(false);

// ---- UI password ----
const [showPw, setShowPw] = useState(false);
const [showConfirmPw, setShowConfirmPw] = useState(false);

// ✅ solo un tooltip abierto a la vez: "pw" | "confirm" | null
const [openTip, setOpenTip] = useState(null);

// refs para detectar click fuera
const pwBoxRef = useRef(null);
const confirmBoxRef = useRef(null);


useEffect(() => {
  function onDown(e) {
    const t = e.target;

    const inPw = pwBoxRef.current && pwBoxRef.current.contains(t);
    const inConfirm = confirmBoxRef.current && confirmBoxRef.current.contains(t);

    // ✅ si clic fuera de ambos, cerrar todo
    if (!inPw && !inConfirm) setOpenTip(null);

    // ✅ si clic en uno, abrir solo ese
    if (inPw) setOpenTip("pw");
    if (inConfirm) setOpenTip("confirm");
  }

  function onKey(e) {
    if (e.key === "Escape") setOpenTip(null);
  }

  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("pointerdown", onDown, true);
    document.removeEventListener("keydown", onKey);
  };
}, []);


  function getPasswordChecks(pw) {
    const s = String(pw || "");
    return {
      len: s.length >= 8,
      upper: /[A-Z]/.test(s),
      lower: /[a-z]/.test(s),
      number: /[0-9]/.test(s),
      symbol: /[^A-Za-z0-9]/.test(s),
      forbidden: !/[.,;'"´“”]/.test(s),
    };
  }

  const pwChecks = useMemo(() => getPasswordChecks(form.password), [form.password]);
  const passwordsMatch = useMemo(
    () => !!form.confirm && form.password === form.confirm,
    [form.password, form.confirm]
  );

  const company_slug = useMemo(() => slugifyCompany(form.company_name), [form.company_name]);
  const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

async function handleGoogle() {
  setLoading(true);
  try {
    // ✅ Guardamos el flujo (signup)
    localStorage.setItem("IKARIS_OAUTH_FLOW", "signup");

    // ✅ Guardar los datos de empresa ANTES de redirigir a Google
    localStorage.setItem(
      "IKARIS_PENDING_COMPANY",
      JSON.stringify({
        representative_name: String(form.representative_name || "").trim(),
        company_name: String(form.company_name || "").trim(),
        country: String(form.country || "").trim(),
        sector: String(form.sector || "").trim(),
        organization_type: String(form.organization_type || "").trim(),
        marketing_opt_in: !!form.marketing_opt_in,
      })
    );

    // ✅ redirect fijo y permitido en Supabase
    const redirectTo = `${window.location.origin}/auth/callback`;

    // ✅ limpia sesión supabase antes de iniciar OAuth
    try { await supabase.auth.signOut(); } catch (_) {}

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) throw error;
  } catch (err) {
    await Swal.fire({
      icon: "error",
      title: "No se pudo continuar",
      text: err?.message || "Error con Google",
      confirmButtonText: "Ok",
    });
    setLoading(false);
  }
}



  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.accept_terms) {
      await Swal.fire({
        icon: "warning",
        title: "Falta aceptación",
        text: "Debes aceptar Términos y Políticas.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const pwErr = validatePassword(form.password);
    if (pwErr) {
      await Swal.fire({
        icon: "warning",
        title: "Contraseña inválida",
        text: pwErr,
        confirmButtonText: "Ok",
      });
      return;
    }

    if (form.password !== form.confirm) {
      await Swal.fire({
        icon: "warning",
        title: "No coinciden",
        text: "Las contraseñas no coinciden.",
        confirmButtonText: "Ok",
      });
      return;
    }

    setLoading(true);

try {
  // ✅ normaliza email para evitar "Email mismatch for auth_user_id"
  const email = String(form.email || "").trim().toLowerCase();

  // ✅ Queremos que el link de verificación regrese a /auth/callback
  const emailRedirectTo =
    process.env.REACT_APP_EMAIL_REDIRECT || `${window.location.origin}/auth/callback`;

  // 1) Signup (manda verificación)
  const { data, error } = await supabase.auth.signUp({
    email,
    password: form.password,
    options: { emailRedirectTo },
  });

  if (error) throw error;

  // ✅ FIX: a veces signUp no devuelve data.user (depende de confirm email / settings)
  let userId = data?.user?.id || null;

  if (!userId) {
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr) throw uErr;
    userId = u?.user?.id || null;
  }

  if (!userId) {
    throw new Error(
      "No se pudo obtener el user id del registro. Intenta de nuevo en 5-10s o usa otro correo."
    );
  }

  await apiFetch("/auth/start-registration", {
    method: "POST",
    skipAuth: true, // ✅ aquí NO hay sesión aún (hasta confirmar correo)
    body: JSON.stringify({
      auth_user_id: userId,
      email,
      representative_name: String(form.representative_name || "").trim(),
      company_name: String(form.company_name || "").trim(),
      country: String(form.country || "").trim(),
      sector: String(form.sector || "").trim(),
      organization_type: String(form.organization_type || "").trim(),
      marketing_opt_in: !!form.marketing_opt_in,
    }),
  });



  // 3) Siempre pedir verificación (flujo limpio)
  await Swal.fire({
    icon: "success",
    title: "Revisa tu correo",
    text: "Te enviamos un enlace de verificación. Al confirmarlo podrás iniciar sesión.",
    confirmButtonText: "Ok",
  });

  window.location.replace("/login");
  return;
} catch (err) {
  console.error("REGISTER ERROR:", err);

  await Swal.fire({
    icon: "error",
    title: "Error al registrarse",
    // ✅ ahora sí verás el motivo real del backend: Missing fields / mismatch / etc.
    text: err?.message || "No se pudo crear la cuenta",
    confirmButtonText: "Ok",
  });
} finally {
  setLoading(false);
}


  }

  return (
<AuthLayout
  title="Crear cuenta"
  subtitle="Bienvenido a Ikaris Tech, registra tu empresa y controla tu operación."
  sideTitle="IKARIS"
  sideText="Un sistema serio: formularios, evidencias, flujos y auditoría."
  hideRight
>

      <div className="auth-form">
        <button type="button" className="btn-ghost" onClick={handleGoogle} disabled={loading}>
          Registrarme con Google
        </button>

        <div className="divider">o con correo</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <div className="label">Nombre Completo del Representante</div>
            <input
              className="input"
              value={form.representative_name}
              onChange={(e) => onChange("representative_name", e.target.value)}
              required
              placeholder="Nombre completo"
            />
          </div>

          <div className="row2">
            <div>
              <div className="label">Empresa</div>
              <input
                className="input"
                value={form.company_name}
                onChange={(e) => onChange("company_name", e.target.value)}
                required
                placeholder="Nombre de la empresa"
              />
            </div>

            <div>
              <div className="label">Slug (auto)</div>
              <input className="input" value={company_slug} readOnly />
            </div>
          </div>

          <div className="row2">
            <div>
              <div className="label">Correo</div>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                required
                placeholder="correo@empresa.com"
              />
            </div>

            <div>
              <div className="label">País</div>
              <input
                className="input"
                value={form.country}
                onChange={(e) => onChange("country", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="row2">
            <div>
              <div className="label">Sector</div>
              <select
                className="select"
                value={form.sector}
                onChange={(e) => onChange("sector", e.target.value)}
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Tipo de organización</div>
              <select
                className="select"
                value={form.organization_type}
                onChange={(e) => onChange("organization_type", e.target.value)}
              >
                {ORG_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

<div className="row2">
{/* Password */}
<div ref={pwBoxRef} style={{ position: "relative" }}>

    <div className="label">Contraseña</div>

    <div className="pw-wrap">
      <input
        className="input pw-input"
        type={showPw ? "text" : "password"}
        value={form.password}
        onChange={(e) => onChange("password", e.target.value)}
       onFocus={() => setOpenTip("pw")}


        required
        placeholder="Ingrese Nueva Contraseña"
        autoComplete="new-password"
      />

<button
  type="button"
  className="pw-eye"
  onClick={() => setShowPw((v) => !v)}
  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
>
  <span className={`eye-ic ${showPw ? "on" : ""}`} />
</button>

    </div>

{openTip === "pw" && (
  <div className="pw-float">
        <div className="pw-title">Tu contraseña debe cumplir:</div>

        <div className={`pw-item ${pwChecks.len ? "ok" : "bad"}`}>
         <span className="pw-dot" />
          <span>Al menos 8 caracteres</span>
        </div>

<div className={`pw-item ${pwChecks.upper ? "ok" : "bad"}`}>
  <span className="pw-dot" />
  <span>Al menos 1 mayúscula (A-Z)</span>
</div>


        <div className={`pw-item ${pwChecks.lower ? "ok" : "bad"}`}>
          <span className="pw-dot" />

          <span>Al menos 1 minúscula (a-z)</span>
        </div>

        <div className={`pw-item ${pwChecks.number ? "ok" : "bad"}`}>
          <span className="pw-dot" />

          <span>Al menos 1 número (0-9)</span>
        </div>

        <div className={`pw-item ${pwChecks.symbol ? "ok" : "bad"}`}>
          <span className="pw-dot" />

          <span>Al menos 1 símbolo (!@#$…)</span>
        </div>

        <div className={`pw-item ${pwChecks.forbidden ? "ok" : "bad"}`}>
          <span className="pw-dot" />

          <span>No usar: . , ; comillas ' " ni ´</span>
        </div>
      </div>
    )}
  </div>

{/* Confirm */}
<div ref={confirmBoxRef} style={{ position: "relative" }}>

    <div className="label">Confirmación</div>

    <div className="pw-wrap">
      <input
        className="input pw-input"
        type={showConfirmPw ? "text" : "password"}
        value={form.confirm}
        onChange={(e) => onChange("confirm", e.target.value)}
       onFocus={() => setOpenTip("confirm")}


        required
        placeholder="Repite la contraseña"
        autoComplete="new-password"
      />

<button
  type="button"
  className="pw-eye"
  onClick={() => setShowConfirmPw((v) => !v)}
  aria-label={showConfirmPw ? "Ocultar confirmación" : "Mostrar confirmación"}
>
  <span className={`eye-ic ${showConfirmPw ? "on" : ""}`} />
</button>

    </div>

{openTip === "confirm" && (
  <div className="pw-float">
        <div className="pw-title">Confirmación:</div>

        {!form.confirm ? (
          <div className="pw-item bad">
           <span className="pw-dot" />

            <span>Escribe la confirmación</span>
          </div>
        ) : passwordsMatch ? (
          <div className="pw-item ok">
            <span className="pw-dot" />

            <span>Las contraseñas coinciden</span>
          </div>
        ) : (
          <div className="pw-item bad">
            <span className="pw-dot" />

            <span>Las contraseñas no coinciden</span>
          </div>
        )}
      </div>
    )}
  </div>
</div>


          <label className="check">
            <input
              type="checkbox"
              checked={form.accept_terms}
              onChange={(e) => onChange("accept_terms", e.target.checked)}
            />
            Acepto Términos y Políticas (obligatorio)
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.marketing_opt_in}
              onChange={(e) => onChange("marketing_opt_in", e.target.checked)}
            />
            Acepto recibir correos con actualizaciones/ofertas (opcional)
          </label>

          <button className="btn" disabled={loading}>
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>

          <div className="linkrow">
            <span className="small">
              ¿Ya tienes cuenta? <Link className="a" to="/login">Inicia sesión</Link>
            </span>
            <span className="small">Verificación: 24h</span>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
