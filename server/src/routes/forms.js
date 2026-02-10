const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { supabaseAdmin } = require("../supabaseAdmin");

const router = express.Router();

/* =========================
   Helpers
   ========================= */

function asArr(v) {
  return Array.isArray(v) ? v : [];
}

function hasDeptAccess(list, dept) {
  const a = asArr(list);
  if (!a.length) return true; // vacío => sin restricción
  if (!dept) return false;
  return a.includes(dept);
}

function roleUpper(r) {
  return String(r || "").toUpperCase();
}

function isArchon(role) {
  return roleUpper(role) === "ARCHON";
}
function isEpistates(role) {
  return roleUpper(role) === "EPISTATES";
}
function isAdmin(role) {
  return isArchon(role) || isEpistates(role);
}

/**
 * Filtra fields según rol/departamento:
 * - ARCHON/EPISTATES: ve todo
 * - POLITES: solo lo que tenga visibility.respondent true y dept match
 */
function filterFieldsForUser(fields, { role, department }) {
  const r = roleUpper(role);
  if (r === "ARCHON" || r === "EPISTATES") return asArr(fields);

  return asArr(fields).filter((f) => {
    const vis = f?.visibility || {};
    const deptOk = hasDeptAccess(f?.respondent_departments, department);
    return vis.respondent !== false && deptOk;
  });
}

/**
 * Sanitiza answers entrantes: solo deja contestar lo permitido.
 */
function sanitizeAnswersForUser(rawAnswers, fields, { role, department }) {
  const r = roleUpper(role);
  const incoming = rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};
  const out = {};

  if (r === "ARCHON" || r === "EPISTATES") return incoming;

  const allowed = new Set(
    asArr(fields)
      .filter((f) => {
        const vis = f?.visibility || {};
        const edit = f?.editable || {};
        const deptOk = hasDeptAccess(f?.respondent_departments, department);
        return vis.respondent !== false && edit.respondent !== false && deptOk;
      })
      .map((f) => f.id)
  );

  for (const k of Object.keys(incoming)) {
    if (allowed.has(k)) out[k] = incoming[k];
  }
  return out;
}

/* =========================
   Company user
   ========================= */
async function loadCompanyUser({ companyId, authUserId }) {
  const { data, error } = await supabaseAdmin
    .from("company_users")
    .select("auth_user_id, company_id, username, role, department, can_create_forms, active")
    .eq("company_id", companyId)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/* =========================
   LIST FORMS (visibles)
   GET /api/forms
   ========================= */
router.get("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.ctx.company_id;
    const authUserId = req.ctx.auth_user_id;

    const me = await loadCompanyUser({ companyId, authUserId });
    if (!me || me.active === false) return res.status(403).json({ error: "inactive_user" });

    const role = roleUpper(me.role || "POLITES");
    const department = me.department || null;

    const { data, error } = await supabaseAdmin
      .from("forms")
      .select("id, company_id, title, description, assigned_departments, respondent_departments, editor_departments, fields, created_at, created_by, updated_at, updated_by, is_archived")
      .eq("company_id", companyId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const visible = (data || []).filter((f) => {
      if (isAdmin(role)) return true;
      const assigned = asArr(f.assigned_departments);
      if (!assigned.length) return true;
      return department ? assigned.includes(department) : false;
    });

    const out = visible.map((f) => ({
      ...f,
      fields: filterFieldsForUser(f.fields, { role, department }),
    }));

    return res.json({ forms: out });
  } catch (e) {
    console.error("[GET /api/forms] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* =========================
   GET FORM by id
   GET /api/forms/:id
   ========================= */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const formId = req.params.id;
    const companyId = req.ctx.company_id;
    const authUserId = req.ctx.auth_user_id;

    const me = await loadCompanyUser({ companyId, authUserId });
    if (!me || me.active === false) return res.status(403).json({ error: "inactive_user" });

    const role = roleUpper(me.role || "POLITES");
    const department = me.department || null;

    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", formId)
      .maybeSingle();

    if (error) throw error;
    if (!form || form.is_archived) return res.status(404).json({ error: "not_found" });

    if (!isAdmin(role)) {
      const assigned = asArr(form.assigned_departments);
      if (assigned.length && (!department || !assigned.includes(department))) {
        return res.status(403).json({ error: "no_visibility" });
      }
    }

    return res.json({
      form: { ...form, fields: filterFieldsForUser(form.fields, { role, department }) },
    });
  } catch (e) {
    console.error("[GET /api/forms/:id] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* =========================
   CREATE FORM
   POST /api/forms
   ========================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    const companyId = req.ctx.company_id;
    const authUserId = req.ctx.auth_user_id;

    const me = await loadCompanyUser({ companyId, authUserId });
    if (!me || me.active === false) return res.status(403).json({ error: "inactive_user" });

    const role = roleUpper(me.role || "POLITES");
    const canCreate = isAdmin(role) || me.can_create_forms === true;
    if (!canCreate) return res.status(403).json({ error: "no_create_permission" });

    const body = req.body || {};
    const title = body.title ? String(body.title).trim() : "";
    const description = body.description ? String(body.description) : null;

    if (!title) return res.status(400).json({ error: "missing_title" });

    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (!fields.length) return res.status(400).json({ error: "fields_required" });

    const payload = {
      company_id: companyId,
      title,
      description,
      fields,
      assigned_departments: Array.isArray(body.assigned_departments) ? body.assigned_departments : [],
      respondent_departments: Array.isArray(body.respondent_departments) ? body.respondent_departments : [],
      editor_departments: Array.isArray(body.editor_departments) ? body.editor_departments : [],
      created_by: authUserId,
    };

    const { data: created, error } = await supabaseAdmin
      .from("forms")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    await supabaseAdmin.from("audit_log").insert({
      company_id: companyId,
      actor_user_id: authUserId,
      entity: "form",
      entity_id: created.id,
      action: "create",
      meta: { title: created.title },
    });

    return res.json({ ok: true, form: created });
  } catch (e) {
    console.error("[POST /api/forms] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* =========================
   UPDATE FORM
   PUT /api/forms/:id
   ========================= */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const formId = req.params.id;
    const companyId = req.ctx.company_id;
    const authUserId = req.ctx.auth_user_id;

    const me = await loadCompanyUser({ companyId, authUserId });
    if (!me || me.active === false) return res.status(403).json({ error: "inactive_user" });

    const role = roleUpper(me.role || "POLITES");
    const department = me.department || null;

    const { data: form, error: fErr } = await supabaseAdmin
      .from("forms")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", formId)
      .maybeSingle();

    if (fErr) throw fErr;
    if (!form || form.is_archived) return res.status(404).json({ error: "not_found" });

    const canEdit = isAdmin(role) || hasDeptAccess(form.editor_departments, department);
    if (!canEdit) return res.status(403).json({ error: "no_edit_permission" });

    const body = req.body || {};
    const patch = {};

    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.description === "string") patch.description = body.description;
    if (Array.isArray(body.fields)) patch.fields = body.fields;

    if (Array.isArray(body.assigned_departments)) patch.assigned_departments = body.assigned_departments;
    if (Array.isArray(body.respondent_departments)) patch.respondent_departments = body.respondent_departments;
    if (Array.isArray(body.editor_departments)) patch.editor_departments = body.editor_departments;

    patch.updated_at = new Date().toISOString();
    patch.updated_by = authUserId;

    const { data: updated, error } = await supabaseAdmin
      .from("forms")
      .update(patch)
      .eq("company_id", companyId)
      .eq("id", formId)
      .select("*")
      .single();

    if (error) throw error;

    await supabaseAdmin.from("audit_log").insert({
      company_id: companyId,
      actor_user_id: authUserId,
      entity: "form",
      entity_id: formId,
      action: "update",
      meta: { keys: Object.keys(patch) },
    });

    return res.json({ ok: true, form: updated });
  } catch (e) {
    console.error("[PUT /api/forms/:id] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* =========================
   SUBMIT ANSWER
   POST /api/forms/:id/answers
   ========================= */
router.post("/:id/answers", requireAuth, async (req, res) => {
  try {
    const formId = req.params.id;
    const companyId = req.ctx.company_id;
    const authUserId = req.ctx.auth_user_id;

    const me = await loadCompanyUser({ companyId, authUserId });
    if (!me || me.active === false) return res.status(403).json({ error: "inactive_user" });

    const role = roleUpper(me.role || "POLITES");
    const department = me.department || null;

    const { data: form, error: fErr } = await supabaseAdmin
      .from("forms")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", formId)
      .maybeSingle();

    if (fErr) throw fErr;
    if (!form || form.is_archived) return res.status(404).json({ error: "form_not_found" });

    if (!isAdmin(role)) {
      const assigned = asArr(form.assigned_departments);
      if (assigned.length && (!department || !assigned.includes(department))) {
        return res.status(403).json({ error: "no_visibility" });
      }

      const respDept = asArr(form.respondent_departments);
      if (respDept.length && (!department || !respDept.includes(department))) {
        return res.status(403).json({ error: "no_respond_permission" });
      }
    }

    const rawAnswers = req.body?.answers || {};
    const cleaned = sanitizeAnswersForUser(rawAnswers, form.fields, { role, department });

    const { data: inserted, error } = await supabaseAdmin
      .from("answers")
      .insert({
        company_id: companyId,
        form_id: formId,
        auth_user_id: authUserId,
        user_username: me.username,
        department,
        answers: cleaned,
        status: "pending",
        last_edited: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabaseAdmin.from("audit_log").insert({
      company_id: companyId,
      actor_user_id: authUserId,
      entity: "answer",
      entity_id: inserted.id,
      action: "create",
      meta: { form_id: formId },
    });

    return res.json({ ok: true, answer: inserted });
  } catch (e) {
    console.error("[POST /api/forms/:id/answers] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* =========================
   LIST ANSWERS (editores/admin)
   GET /api/forms/:id/answers
   ========================= */
router.get("/:id/answers", requireAuth, async (req, res) => {
  try {
    const formId = req.params.id;
    const companyId = req.ctx.company_id;
    const authUserId = req.ctx.auth_user_id;

    const me = await loadCompanyUser({ companyId, authUserId });
    if (!me || me.active === false) return res.status(403).json({ error: "inactive_user" });

    const role = roleUpper(me.role || "POLITES");
    const department = me.department || null;

    const { data: form, error: fErr } = await supabaseAdmin
      .from("forms")
      .select("id, editor_departments, is_archived")
      .eq("company_id", companyId)
      .eq("id", formId)
      .maybeSingle();

    if (fErr) throw fErr;
    if (!form || form.is_archived) return res.status(404).json({ error: "form_not_found" });

    const canSee = isAdmin(role) || hasDeptAccess(form.editor_departments, department);
    if (!canSee) return res.status(403).json({ error: "no_permission" });

    const { data: rows, error } = await supabaseAdmin
      .from("answers")
      .select("id, user_username, department, status, answers, created_at, updated_at, last_edited")
      .eq("company_id", companyId)
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ ok: true, answers: rows || [] });
  } catch (e) {
    console.error("[GET /api/forms/:id/answers] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
