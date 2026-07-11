import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"];
const supabase = createClient(SUPABASE_URL, SECRET_KEY);

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function passwordMatches(provided: string): boolean {
  if (provided.length !== ADMIN_PASSWORD.length) return false;
  let diff = 0;
  for (let i = 0; i < ADMIN_PASSWORD.length; i++) {
    diff |= provided.charCodeAt(i) ^ ADMIN_PASSWORD.charCodeAt(i);
  }
  return diff === 0;
}

// Only these tables/columns can be touched from this endpoint -- keeps the
// admin page from being able to write anything beyond curated bio text.
const EDITABLE_TABLES = new Set(["registrations", "confirmed_invitees"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const password = req.headers.get("x-admin-password") || "";
  if (!passwordMatches(password)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (req.method === "GET") {
    const [{ data: registrations, error: regError }, { data: confirmedInvitees, error: ciError }] =
      await Promise.all([
        supabase
          .from("registrations")
          .select(
            "id, created_at, racer_name, racer_email, tshirt_size, afterparty, party_guests, invite1_name, invite1_email, invite2_name, invite2_email, invite3_name, invite3_email, bio",
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("confirmed_invitees")
          .select("id, created_at, name, email, invited_by, tshirt_size, bio")
          .order("created_at", { ascending: true }),
      ]);

    if (regError || ciError) {
      console.error("Admin list failed:", regError || ciError);
      return json({ error: "Failed to load data" }, 500);
    }

    return json({ registrations, confirmed_invitees: confirmedInvitees });
  }

  if (req.method === "PATCH") {
    try {
      const { table, id, bio } = await req.json();

      if (!EDITABLE_TABLES.has(table) || typeof id !== "string") {
        return json({ error: "Invalid request" }, 400);
      }

      const { error } = await supabase.from(table).update({ bio }).eq("id", id);
      if (error) throw error;

      return json({ status: "success" });
    } catch (error) {
      console.error("Admin update failed:", error);
      return json({ error: "Update failed" }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
});
