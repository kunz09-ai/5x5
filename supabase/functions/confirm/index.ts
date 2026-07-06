import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyToken } from "../_shared/token.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"];
const supabase = createClient(SUPABASE_URL, SECRET_KEY);

// Edge Functions rewrite text/html responses to text/plain on GET requests
// (they're meant for APIs, not serving pages) -- so this returns JSON, and a
// static confirm.html page on GitHub Pages renders the actual result.
function json(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const params = new URL(req.url).searchParams;

  const email = (params.get("email") || "").trim().toLowerCase();
  const token = params.get("token") || "";
  const name = params.get("name") || "Unknown";
  const inviter = params.get("inviter") || "Unknown";
  const tshirt = params.get("tshirt") || "None";

  const valid = email && token && (await verifyToken(email, token));

  if (!valid) {
    return json({ status: "invalid" });
  }

  try {
    // Upsert rather than insert-or-reject: email link-safety scanners (Gmail, Outlook,
    // corporate filters) pre-fetch every link in an email before the recipient ever
    // clicks. With a plain insert, the scanner's request would "confirm" the invitee
    // first (often with the wrong t-shirt size, whichever link the scanner hit), and
    // the real human click would just get rejected as a duplicate. Upserting means
    // every valid click -- scanner or human -- simply records that click's t-shirt
    // choice, so the person's own click always wins and always sees the success page.
    const { error: upsertError } = await supabase
      .from("confirmed_invitees")
      .upsert(
        { name, email, invited_by: inviter, tshirt_size: tshirt },
        { onConflict: "email" },
      );

    if (upsertError) throw upsertError;

    return json({ status: "confirmed", inviter, tshirt });
  } catch (error) {
    console.error("Confirmation failed:", error);
    return json({ status: "error" });
  }
});
