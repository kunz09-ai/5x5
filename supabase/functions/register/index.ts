import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"];
const supabase = createClient(SUPABASE_URL, SECRET_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "error", message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const formObject = await req.json();

    // Public signups land on the waitlist, not straight onto the roster --
    // an admin promotes someone to a confirmed racer from the admin page.
    // Personal invite links (register/confirm) are a separate flow and are
    // unaffected by this.
    const { error: insertError } = await supabase.from("registrations").insert({
      racer_name: formObject.racerName || "",
      racer_email: formObject.racerEmail || "",
      status: "waitlisted",
      how_heard: formObject.howHeard || null,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Waitlist signup failed:", error);
    return new Response(
      JSON.stringify({ status: "error", message: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
