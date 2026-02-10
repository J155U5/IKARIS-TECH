const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in server/.env");
}

function createSupabaseForToken(token) {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

module.exports = { createSupabaseForToken };
