const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireUser, requireAuthUserOnly } = require("../middleware/auth");
const { sendWelcomeEmail } = require("../email/smtp");




const router = express.Router();
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- util ---
function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
// REGISTRO parte 1.5 (DB sin sesión):
// Se llama DESPUÉS de supabase.auth.signUp() aunque NO haya session.
// Crea empresa + ARCHON + pending_registrations usando service role.
router.post("/start-registration", async (req, res) => {
  try {
    const {
      auth_user_id,
      email,
      representative_name,
      company_name,
      country,
      sector,
      organization_type,
      marketing_opt_in,
    } = req.body || {};

    if (!auth_user_id || !email || !representative_name || !company_name || !country || !sector || !organization_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 0) Validar que el usuario exista en auth.users y que el email coincida
    // (evita que te peguen al endpoint sin haber hecho signUp)
    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(auth_user_id);
    if (uErr || !u?.user) return res.status(400).json({ error: "Invalid auth_user_id" });

    const userEmail = (u.user.email || "").toLowerCase();
    if (userEmail !== String(email).toLowerCase()) {
      return res.status(400).json({ error: "Email mismatch for auth_user_id" });
    }

    // 1) Si ya tiene membership, no permitir duplicado
    const { data: existingMem } = await supabaseAdmin
      .from("company_users")
      .select("id")
      .eq("auth_user_id", auth_user_id)
      .limit(1);

    if (existingMem && existingMem.length > 0) {
      return res.status(409).json({ error: "User already belongs to a company" });
    }

const slug = slugify(company_name);

// ✅ detectar provider desde el usuario real de auth.users
const provider =
  u?.user?.app_metadata?.provider ||
  u?.user?.identities?.[0]?.provider ||
  "email";

const isGoogleOAuth = provider === "google";

const { data: company, error: compErr } = await supabaseAdmin
  .from("companies")
  .insert({
    name: company_name,
    slug,
    country,
    sector,
    organization_type,
    representative_name,
    owner_auth_user_id: u.user.id,
    owner_email: u.user.email,
    // ✅ Google: queda verificada al instante
    verified_at: isGoogleOAuth ? new Date().toISOString() : null,
  })
  .select("*")
  .single();



    if (compErr) return res.status(400).json({ error: compErr.message });

    // 3) Crear membership ARCHON (Director)
    const { error: memErr } = await supabaseAdmin.from("company_users").insert({
      company_id: company.id,
      auth_user_id,
      username: userEmail.split("@")[0] || "archon",
      role: "ARCHON",
      department: "DIRECCION",
      active: true,
      can_create_forms: true,
    });

    if (memErr) return res.status(500).json({ error: memErr.message });

// ✅ Solo email/password requiere pending_registrations
if (!isGoogleOAuth) {
  const { error: pendErr } = await supabaseAdmin
    .from("pending_registrations")
    .insert({
      auth_user_id: u.user.id,
      company_id: company.id,
      email: u.user.email,
      verified: false,
    });

  if (pendErr) return res.status(500).json({ error: pendErr.message });
}



    // 5) Auditoría opcional
    await supabaseAdmin.from("audit_log").insert({
      company_id: company.id,
      actor_user_id: auth_user_id,
      entity: "user",
      entity_id: auth_user_id,
      action: "create",
      meta: { marketing_opt_in: !!marketing_opt_in, type: "signup_start" },
    });

    return res.status(200).json({ ok: true, company_id: company.id });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// REGISTRO parte 2 (DB): crear empresa + ARCHON + pending_registrations
// Este endpoint se llama DESPUÉS de supabase.auth.signUp en frontend.
router.post("/register-company", requireAuthUserOnly, async (req, res) => {


  try {
    const {
      representative_name,
      company_name,
      country,
      sector,
      organization_type,
      marketing_opt_in, // true/false (no obligatorio)
    } = req.body || {};

    if (!representative_name || !company_name || !country || !sector || !organization_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const authUser = req.authUser;
// ✅ detectar provider
const provider =
  authUser?.app_metadata?.provider ||
  authUser?.identities?.[0]?.provider ||
  "email";

const isGoogleOAuth = provider === "google";

    // Si ya tiene company_users, no permitir “doble empresa” en este MVP
    // (tú pediste 1 Director por empresa, y por registro; SaaS multi-tenant puede crecer luego)
    // Ya lo resolvemos indirectamente con requireAuth que trae 1 membership;
    // pero en registro inicial aún no existe membership, así que hay que checar.
    const { data: existingMem } = await supabaseAdmin
      .from("company_users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .limit(1);

    if (existingMem && existingMem.length > 0) {
      return res.status(409).json({ error: "User already belongs to a company" });
    }

    const slug = slugify(company_name);

    // 1) crear empresa
    const { data: company, error: compErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name: company_name,
        slug,
        country,
        sector,
        organization_type,
        representative_name,
        owner_auth_user_id: authUser.id,
        owner_email: authUser.email,
        // verified_at se llenará cuando confirme email (trigger en DB)
      })
      .select("*")
      .single();

    if (compErr) {
      // si slug duplicado
      return res.status(400).json({ error: compErr.message });
    }

    // 2) crear membership ARCHON (Director)
    const { error: memErr } = await supabaseAdmin.from("company_users").insert({
      company_id: company.id,
      auth_user_id: authUser.id,
      username: authUser.email?.split("@")[0] || "archon",
      role: "ARCHON",
      department: "DIRECCION",
      active: true,
      can_create_forms: true,
    });

    if (memErr) return res.status(500).json({ error: memErr.message });

    // 3) crear pending_registrations con expiración 24h
    const { error: pendErr } = await supabaseAdmin.from("pending_registrations").insert({
      auth_user_id: authUser.id,
      company_id: company.id,
      email: authUser.email,
      verified: false,
    });

    if (pendErr) return res.status(500).json({ error: pendErr.message });

    // 4) opcional: guardar marketing opt-in (si quieres)
    // Lo más limpio: guardarlo en meta de company o en tabla aparte.
    // Por ahora lo dejamos en audit:
    await supabaseAdmin.from("audit_log").insert({
      company_id: company.id,
      actor_user_id: authUser.id,
      entity: "user",
      entity_id: authUser.id,
      action: "create",
      meta: { marketing_opt_in: !!marketing_opt_in, type: "signup" },
    });

    return res.status(200).json({ ok: true, company });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

router.get("/me", requireAuthUserOnly, async (req, res) => {
  // ✅ timeout duro: si algo se cuelga, responde 504 y el frontend no se queda esperando
  const killer = setTimeout(() => {
    if (!res.headersSent) {
      return res.status(504).json({ error: "Timeout en /auth/me" });
    }
  }, 12000);

  try {

    const authUser = req.authUser;

    // ✅ buscar membership (si existe)
    const { data: memberships, error: memErr } = await supabaseAdmin
      .from("company_users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .eq("active", true)
      .limit(1);

    if (memErr) return res.status(500).json({ error: memErr.message });

let companyUser = memberships?.[0] || null;

// ✅ provider real desde Supabase
const provider =
  authUser?.app_metadata?.provider ||
  authUser?.identities?.[0]?.provider ||
  "email";

const isGoogleOAuth = provider === "google";

// ✅ Si entra con Google y NO tiene membership,
// intentamos auto-ligarlo a una empresa existente (owner_email / owner_auth_user_id)
if (!companyUser && isGoogleOAuth) {
  // 1) Buscar empresa por owner_auth_user_id o owner_email
  const { data: ownedCompany, error: ownedErr } = await supabaseAdmin
    .from("companies")
    .select("*")
    .or(`owner_auth_user_id.eq.${authUser.id},owner_email.ilike.${authUser.email}`)
    .limit(1)
    .maybeSingle();

  if (!ownedErr && ownedCompany?.id) {
    // 2) Crear membership (si ya existe, no rompe por unique(company_id, auth_user_id))
    const { data: newMem, error: newMemErr } = await supabaseAdmin
      .from("company_users")
      .upsert(
        {
          company_id: ownedCompany.id,
          auth_user_id: authUser.id,
          username: authUser.email?.split("@")[0] || "archon",
          role: "ARCHON",
          department: "DIRECCION",
          active: true,
          can_create_forms: true,
        },
        { onConflict: "company_id,auth_user_id" }
      )
      .select("*")
      .single();

    if (!newMemErr && newMem?.id) {
      companyUser = newMem;
    }
  }
}

// ✅ si DESPUÉS de intentar auto-link NO hay empresa todavía → onboarding
if (!companyUser) {
  return res.status(200).json({
    ok: true,
    user: {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
    },
    membership: null,
    company: null,
    needs_onboarding: true,
  });
}


    // ✅ cargar company si ya hay membership
    const { data: company, error: compErr } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", companyUser.company_id)
      .single();

    if (compErr) return res.status(500).json({ error: compErr.message });

// ✅ Verificación:
// - Email/password: usa email_confirmed_at
// - Google OAuth: NO pedimos verificación de correo
const emailConfirmedAt = authUser.email_confirmed_at;



// ✅ Reglas NUEVAS (como tú pediste):
// - Google OAuth: NO pide confirmación por correo, NO pide verified_at
// - Email/password: requiere company.verified_at y email_confirmed_at
const isVerified = isGoogleOAuth
  ? true
  : (!!company?.verified_at && !!emailConfirmedAt);

if (!isVerified) {
  return res.status(403).json({
    error: "Email not verified",
    needs_verification: true,
    provider,
    email: authUser.email,
  });
}


// ✅ Enviar bienvenida 1 sola vez (para verificados y Google)
// ⚡ CLAVE: NO esperar SMTP aquí. Disparar async y responder /me inmediato.
try {
  if (!companyUser.welcome_sent_at) {
    const companyUserId = companyUser.id;
    const to = authUser.email;
    const representativeName = company?.representative_name || authUser.email;
    const companyName = company?.name;

    // Fire-and-forget: NO await
    setImmediate(async () => {
      try {
        await sendWelcomeEmail({ to, representativeName, companyName });

        await supabaseAdmin
          .from("company_users")
          .update({ welcome_sent_at: new Date().toISOString() })
          .eq("id", companyUserId);
      } catch (e) {
        console.error("Welcome email failed (async):", e?.message || e);
      }
    });
  }
} catch (e) {
  console.error("Welcome email scheduling failed:", e?.message || e);
}






    return res.status(200).json({
      ok: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: emailConfirmedAt,
      },
      membership: companyUser,
      company,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  } finally {
    clearTimeout(killer);
  }
});


// ✅ Actualizar perfil (phone / avatar_url) con cooldown de 3 días
router.patch("/profile", requireAuthUserOnly, async (req, res) => {
  try {
    const authUser = req.authUser;
    const { phone, avatar_url } = req.body || {};

    // 1) buscar membership activo
    const { data: memberships, error: memErr } = await supabaseAdmin
      .from("company_users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .eq("active", true)
      .limit(1);

    if (memErr) return res.status(500).json({ error: memErr.message });
    const me = memberships?.[0];
    if (!me) return res.status(403).json({ error: "No membership" });

    const patch = {};

    // 2) Phone: solo si viene definido (permite mandar "" para limpiar)
    if (phone !== undefined) {
      const last = me.phone_updated_at ? new Date(me.phone_updated_at).getTime() : 0;
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      if (last && now - last < threeDays) {
        const nextAt = new Date(last + threeDays).toISOString();
        return res.status(429).json({
          error: "Phone cooldown",
          message: "Solo puedes actualizar el teléfono cada 3 días.",
          next_allowed_at: nextAt,
        });
      }

      patch.phone = String(phone || "").trim() || null;
      patch.phone_updated_at = new Date().toISOString();
    }

    // 3) Avatar url: no necesita cooldown (si quieres, se lo metemos luego)
    if (avatar_url !== undefined) {
      patch.avatar_url = String(avatar_url || "").trim() || null;
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("company_users")
      .update(patch)
      .eq("id", me.id)
      .select("*")
      .single();

    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.status(200).json({ ok: true, membership: updated });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

router.post("/logout", (_req, res) => {
  // logout real lo maneja supabase en frontend (supabase.auth.signOut)
  return res.status(200).json({ ok: true });
});

module.exports = router;
