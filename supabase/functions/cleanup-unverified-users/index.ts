/// <reference path="../_shared/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

Deno.serve(async (_req: Request) => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500 }
    );
  }

  const supabase = createClient(url, serviceKey);

  // 1) Buscar registros expirados
  const { data: pending, error } = await supabase
    .from("pending_registrations")
    .select("id, auth_user_id, company_id")
    .lt("expires_at", new Date().toISOString())
    .eq("verified", false);

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  let deletedUsers = 0;
  let deletedCompanies = 0;
  let deletedPending = 0;
  const errors: any[] = [];

  for (const row of pending ?? []) {
    try {
      // 2) Borra la empresa (cascade borra sus cosas)
      const { error: companyErr } = await supabase
        .from("companies")
        .delete()
        .eq("id", row.company_id);

      if (companyErr) throw companyErr;
      deletedCompanies++;

      // 3) Borra el usuario auth
      const { error: userErr } = await supabase.auth.admin.deleteUser(row.auth_user_id);
      if (userErr) throw userErr;
      deletedUsers++;

      // 4) Borra el pending_registrations
      const { error: pendErr } = await supabase
        .from("pending_registrations")
        .delete()
        .eq("id", row.id);

      if (pendErr) throw pendErr;
      deletedPending++;
    } catch (e) {
      errors.push({ row, error: String(e) });
      // no rompe el loop, sigue con el siguiente
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned: (pending ?? []).length,
      deletedCompanies,
      deletedUsers,
      deletedPending,
      errors,
    }),
    { status: 200 }
  );
});
