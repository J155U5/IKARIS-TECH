// web/src/api.js
import { supabase } from "./supabaseClient";

// Respeta tu .env: REACT_APP_API_URL=http://localhost:4000/api
const API_URL = process.env.REACT_APP_API_URL || "/api";

export async function apiFetch(path, opts = {}) {
  // ✅ NUEVO: si skipAuth = true, NO intentamos poner Authorization
  const skipAuth = !!opts.skipAuth;

  // 0) headers base
  const headers = { ...(opts.headers || {}) };

  // 1) JSON por defecto si no es FormData
  const isFormData =
    typeof FormData !== "undefined" && opts.body instanceof FormData;

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // 2) Authorization:
  // - Si ya viene Authorization, no tocar
  // - Si skipAuth, NO meter Authorization
  // - Si viene tokenOverride úsalo
  // - Si no, intenta getSession con timeout corto
  if (!headers["Authorization"] && !skipAuth) {
    let token = opts.tokenOverride || null;

    if (!token) {
      const withTimeout = (p, ms) =>
        Promise.race([
          p,
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error(`Timeout getSession (${ms}ms)`)), ms)
          ),
        ]);

      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 4000);
        token = data?.session?.access_token || null;
      } catch (_) {
        token = null;
      }
    }

    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // 3) Timeout duro solo para fetch
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);

  try {
    // ✅ IMPORTANTÍSIMO: quitar props custom antes de pasarlas a fetch
    const { tokenOverride, skipAuth: _skipAuth, ...fetchOpts } = opts;

    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOpts,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    const text = await res.text();
    let dataJson = null;

    try {
      dataJson = text ? JSON.parse(text) : null;
    } catch (_) {
      dataJson = text || null;
    }

    if (!res.ok) {
      const errObj =
        dataJson && typeof dataJson === "object"
          ? dataJson
          : { message: String(dataJson || "Error") };

      const msg =
        errObj?.message ||
        errObj?.error ||
        errObj?.details ||
        `HTTP ${res.status}`;

      errObj.status = res.status;
      throw Object.assign(new Error(msg), errObj);
    }

    return dataJson;
  } catch (e) {
    if (e?.name === "AbortError") {
      const err = new Error("Tiempo de espera agotado (API timeout)");
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
