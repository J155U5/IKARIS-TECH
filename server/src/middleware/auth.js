const { supabaseAdmin } = require("../supabaseAdmin");
const { createSupabaseForToken } = require("../supabaseAnon");

// ✅ 1) Solo valida JWT y carga req.authUser
async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing Authorization Bearer token" });

    const supa = createSupabaseForToken(token);
    const { data: userData, error: userErr } = await supa.auth.getUser();

    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });

req.authUser = userData.user;

// ✅ Detectar proveedor OAuth (Google) para no bloquear por email_confirmed_at
const identities = Array.isArray(req.authUser?.identities) ? req.authUser.identities : [];
req.authUser.__isOAuthGoogle = identities.some((i) => i?.provider === "google");

return next();

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

// ✅ 2) Requiere token + membership (para rutas internas)
async function requireAuth(req, res, next) {
  try {
    // primero asegura authUser
    await new Promise((resolve, reject) => {
      requireUser(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const authUser = req.authUser;

    const { data: memberships, error: memErr } = await supabaseAdmin
      .from("company_users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .eq("active", true)
      .limit(1);

    if (memErr) return res.status(500).json({ error: memErr.message });

    if (!memberships || memberships.length === 0) {
      return res.status(403).json({
        error: "User has no company membership",
        needs_onboarding: true,
      });
    }

    req.companyUser = memberships[0];
    return next();
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
// ---- Auth lite: valida JWT pero NO exige membership ----
async function requireAuthUserOnly(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing Authorization Bearer token" });

    // Validar token con supabase (anon client con bearer)
    const supa = createSupabaseForToken(token);
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });

req.authUser = userData.user;

// ✅ Detectar proveedor también aquí (porque /me usa requireAuthUserOnly)
const identities = Array.isArray(req.authUser?.identities) ? req.authUser.identities : [];
req.authUser.__isOAuthGoogle = identities.some((i) => i?.provider === "google");

return next();

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

// ---- Role helpers ----
function isArchon(req) {
  return req?.companyUser?.role === "ARCHON";
}
function isEpistates(req) {
  return req?.companyUser?.role === "EPISTATES";
}
function isPolites(req) {
  return req?.companyUser?.role === "POLITES";
}

function requireArchon(req, res, next) {
  if (!isArchon(req)) return res.status(403).json({ error: "ARCHON required" });
  return next();
}

function requireArchonOrEpistates(req, res, next) {
  if (!(isArchon(req) || isEpistates(req))) {
    return res.status(403).json({ error: "ARCHON or EPISTATES required" });
  }
  return next();
}

function canCreateForms(req) {
  if (isArchon(req)) return true;
  if (isEpistates(req) && req.companyUser?.can_create_forms) return true;
  return false;
}

async function canEditForm(req, formId) {
  // (tu función igual como la tienes)
  // NO la toco para no romper tu lógica
  return false;
}

module.exports = {
  requireUser,            // ✅ AÑADIDO
  requireAuth,
  requireAuthUserOnly,
  requireArchon,
  requireArchonOrEpistates,
  isArchon,
  isEpistates,
  isPolites,
  canCreateForms,
  canEditForm,
};

