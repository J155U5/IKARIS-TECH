const express = require("express");
const { requireUser } = require("../middleware/auth");
const { supabaseAdmin } = require("../supabaseAdmin");

const router = express.Router();

/**
 * GET /api/lookups/:entity
 * entity: departments | company_users
 * Retorna: { items: [{ value, label }] }
 */
router.get("/:entity", requireUser, async (req, res) => {
  try {
    const entity = String(req.params.entity || "").trim();

    // ✅ saca el auth_user_id del usuario autenticado
    const authUserId = req.authUser?.id;
    if (!authUserId) return res.status(401).json({ error: "Unauthorized" });

    // ✅ detecta company_id desde company_users (no depende de /auth/me)
    const { data: cu, error: cuErr } = await supabaseAdmin
      .from("company_users")
      .select("company_id")
      .eq("auth_user_id", authUserId)
      .limit(1)
      .maybeSingle();

    if (cuErr) throw cuErr;
    const companyId = cu?.company_id;
    if (!companyId) return res.status(400).json({ error: "User has no company membership" });

    // =========================
    // LOOKUP: departments
    // =========================
    if (entity === "departments") {
      const { data, error } = await supabaseAdmin
        .from("departments")
        .select("id,name")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      return res.json({
        items: (data || []).map((d) => ({ value: d.id, label: d.name })),
      });
    }

    // =========================
    // LOOKUP: company_users
    // =========================
    if (entity === "company_users") {
      const { data, error } = await supabaseAdmin
        .from("company_users")
        .select("auth_user_id,username,active")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("username", { ascending: true });

      if (error) throw error;

      return res.json({
        items: (data || []).map((u) => ({ value: u.auth_user_id, label: u.username })),
      });
    }

    return res.status(400).json({ error: "Unknown entity" });
  } catch (e) {
    console.error("LOOKUPS error:", e);
    return res.status(500).json({ error: "Lookup failed" });
  }
});

module.exports = router;
