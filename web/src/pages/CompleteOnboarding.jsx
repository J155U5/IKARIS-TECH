import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
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

function slugifyCompany(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

export default function CompleteOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    representative_name: "",
    company_name: "",
    country: "México",
    sector: SECTORS[0],
    organization_type: ORG_TYPES[0],
    marketing_opt_in: false,
  });

  // ✅ Precarga desde state o localStorage
  useEffect(() => {
    const fromState = location.state?.prefill || null;
    const fromLsRaw = localStorage.getItem("IKARIS_PENDING_COMPANY");
    const fromLs = fromLsRaw ? JSON.parse(fromLsRaw) : null;

    const p = fromState || fromLs;
    if (!p) return;

    setForm((s) => ({
      ...s,
      representative_name: p.representative_name || s.representative_name,
      company_name: p.company_name || s.company_name,
      country: p.country || s.country,
      sector: p.sector || s.sector,
      organization_type: p.organization_type || s.organization_type,
      marketing_opt_in: !!p.marketing_opt_in,
    }));
  }, [location.state]);

  const company_slug = useMemo(() => slugifyCompany(form.company_name), [form.company_name]);
  const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
await apiFetch("/auth/register-company", {
  method: "POST",
  body: JSON.stringify({
    representative_name: form.representative_name,
    company_name: form.company_name,
    country: form.country,
    sector: form.sector,
    organization_type: form.organization_type,
    marketing_opt_in: form.marketing_opt_in,
  }),
});


      // ✅ Ya quedó creada: limpiamos pendiente
      localStorage.removeItem("IKARIS_PENDING_COMPANY");

      await Swal.fire({
        icon: "success",
        title: "Empresa creada",
        text: "Listo. Ya puedes usar IKARIS.",
        confirmButtonText: "Entrar",
      });

      window.location.replace("/dashboard");

    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo completar",
        text: err?.message || "Error creando empresa",
        confirmButtonText: "Ok",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Completar registro"
      subtitle="Solo falta crear tu empresa para empezar."
      sideTitle="Onboarding"
      sideText="Esto define tu espacio multi-empresa y tu rol ARCHON."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <div className="label">Nombre y apellidos del representante</div>
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
  <input className="input" value="(se genera automáticamente)" readOnly />
</div>


        </div>

        <div className="row2">
          <div>
            <div className="label">País</div>
            <input
              className="input"
              value={form.country}
              onChange={(e) => onChange("country", e.target.value)}
              required
            />
          </div>

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

        <label className="check">
          <input
            type="checkbox"
            checked={form.marketing_opt_in}
            onChange={(e) => onChange("marketing_opt_in", e.target.checked)}
          />
          Acepto recibir correos con actualizaciones/ofertas (opcional)
        </label>

        <button className="btn" disabled={loading}>
          {loading ? "Creando..." : "Crear empresa y entrar"}
        </button>
      </form>
    </AuthLayout>
  );
}
