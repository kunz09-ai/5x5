import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generateToken } from "../_shared/token.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"];
const supabase = createClient(SUPABASE_URL, SECRET_KEY);

const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;
// Points at the static confirm.html page on GitHub Pages, not the Edge Function directly --
// Edge Functions rewrite text/html GET responses to text/plain, so the function only
// returns JSON and this static page (which can call it via fetch/CORS) does the rendering.
const CONFIRM_PAGE_URL = "https://kunz09-ai.github.io/5x5/confirm.html";

async function sendMail(to: string, subject: string, text: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });
  try {
    await client.send({ from: GMAIL_USER, to, subject, content: text, html });
  } finally {
    await client.close();
  }
}

function racerTextBody(f: Record<string, string>) {
  return (
    `Hey ${f.racerName},\n\n` +
    `Your registration for the SLO 5x5 Adventure Race is confirmed. Prepare to seek discomfort on September 12th!\n\n` +
    `We have recorded your details:\n` +
    `- T-Shirt Size: ${f.tshirtSize}\n` +
    `- Afterparty: ${f.afterparty}\n` +
    `- Party Guests: ${f.partyGuests}\n` +
    `\nSee you at Morro Rock at 5:30 AM.\n\nReach out with any questions, 650.714.3340 Josh Kunz`
  );
}

function racerHtmlBody(f: Record<string, string>) {
  return `
  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;background-color:#111827;color:#f3f4f6;padding:40px 20px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border:1px solid #374151;border-radius:8px;overflow:hidden;text-align:left;">
      <div style="background-color:#ea580c;padding:25px;text-align:center;">
        <h1 style="margin:0;font-family:Impact,sans-serif;font-size:36px;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">SLO <span style="color:#111827;">5X5</span></h1>
      </div>
      <div style="padding:30px;">
        <h2 style="margin-top:0;font-family:Impact,sans-serif;font-size:24px;color:#ea580c;text-transform:uppercase;letter-spacing:1px;">Registration Confirmed</h2>
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;">Hey <strong>${f.racerName}</strong>,</p>
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;">Your registration for the SLO 5x5 Adventure Race is locked in. Prepare to seek discomfort on September 12th.</p>
        <div style="background-color:#111827;padding:20px;border-left:4px solid #ea580c;margin:25px 0;border-radius:4px;">
          <p style="margin:0 0 10px 0;color:#d1d5db;"><strong>T-Shirt Size:</strong> ${f.tshirtSize}</p>
          <p style="margin:0 0 10px 0;color:#d1d5db;"><strong>Afterparty:</strong> ${f.afterparty}</p>
          <p style="margin:0;color:#d1d5db;"><strong>Party Guests:</strong> ${f.partyGuests}</p>
        </div>
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;">See you at Morro Rock at 5:30 AM sharp.</p>
        <hr style="border:none;border-top:1px solid #374151;margin:30px 0;" />
        <p style="font-size:14px;color:#9ca3af;margin:0;line-height:1.5;">Reach out with any questions:<br/><strong>Josh Kunz</strong> | 650.714.3340</p>
      </div>
    </div>
  </div>`;
}

function inviteeTextBody(inviteeName: string, racerName: string, confirmBase: string) {
  return (
    `Hey ${inviteeName || "there"},\n\n` +
    `${racerName} has officially invited you to take on the SLO 5x5 Adventure Race this September 12th.\n\n` +
    `28 miles of biking, 10 miles of hiking, 4,500 feet of climbing across 5 peaks in San Luis Obispo.\n\n` +
    `To accept the challenge and select your T-Shirt from J.Carroll ($30), use one of the confirmation links below:\n\n` +
    `No T-Shirt: ${confirmBase}&tshirt=None\n` +
    `Small: ${confirmBase}&tshirt=S\n` +
    `Medium: ${confirmBase}&tshirt=M\n` +
    `Large: ${confirmBase}&tshirt=L\n` +
    `XL: ${confirmBase}&tshirt=XL\n` +
    `2XL: ${confirmBase}&tshirt=2XL\n` +
    `3XL: ${confirmBase}&tshirt=3XL\n\n` +
    `Or reach out to me directly, Josh Kunz, 650.714.3340`
  );
}

function inviteeHtmlBody(inviteeName: string, racerName: string, confirmBase: string) {
  return `
  <div style="font-family:'Inter',Helvetica,Arial,sans-serif;background-color:#111827;color:#f3f4f6;padding:40px 20px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border:1px solid #374151;border-radius:8px;overflow:hidden;text-align:left;">
      <div style="background-color:#ea580c;padding:25px;text-align:center;">
        <h1 style="margin:0;font-family:Impact,sans-serif;font-size:36px;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">SLO <span style="color:#111827;">5X5</span></h1>
      </div>
      <div style="padding:30px;">
        <h2 style="margin-top:0;font-family:Impact,sans-serif;font-size:24px;color:#ea580c;text-transform:uppercase;letter-spacing:1px;">You've Been Challenged</h2>
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;">Hey <strong>${inviteeName || "there"}</strong>,</p>
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;"><strong>${racerName}</strong> has officially invited you to take on the SLO 5x5 Adventure Race this September 12th.</p>
        <div style="background-color:#111827;padding:20px;text-align:center;margin:25px 0;border-radius:4px;border:1px solid #374151;">
          <p style="margin:0;font-family:Impact,sans-serif;font-size:22px;color:#ea580c;letter-spacing:1px;">28 MILES <span style="color:#4b5563;">|</span> 4,500' GAIN <span style="color:#4b5563;">|</span> 5 PEAKS</p>
        </div>
        <div style="text-align:center;margin:35px 0;border-top:1px solid #374151;border-bottom:1px solid #374151;padding:25px 0;">
          <h3 style="color:#ea580c;margin-top:0;margin-bottom:20px;font-family:Impact,sans-serif;font-size:18px;letter-spacing:1px;">ACCEPT CHALLENGE &amp; SELECT T-SHIRT FROM J.CARROLL ($30)</h3>
          <div style="margin-bottom:15px;">
            <a href="${confirmBase}&tshirt=S"   style="display:inline-block;background-color:#374151;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:4px;margin:4px;">S</a>
            <a href="${confirmBase}&tshirt=M"   style="display:inline-block;background-color:#374151;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:4px;margin:4px;">M</a>
            <a href="${confirmBase}&tshirt=L"   style="display:inline-block;background-color:#374151;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:4px;margin:4px;">L</a>
            <a href="${confirmBase}&tshirt=XL"  style="display:inline-block;background-color:#374151;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:4px;margin:4px;">XL</a>
            <a href="${confirmBase}&tshirt=2XL" style="display:inline-block;background-color:#374151;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:4px;margin:4px;">2XL</a>
            <a href="${confirmBase}&tshirt=3XL" style="display:inline-block;background-color:#374151;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:4px;margin:4px;">3XL</a>
          </div>
          <div>
            <a href="${confirmBase}&tshirt=None" style="display:inline-block;background-color:#ea580c;color:#ffffff;text-decoration:none;font-family:Impact,sans-serif;font-size:16px;padding:12px 25px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;">ACCEPT - NO T-SHIRT</a>
          </div>
        </div>
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;">If you have any questions before accepting, talk to <strong>${racerName}</strong>.</p>
        <hr style="border:none;border-top:1px solid #374151;margin:30px 0;" />
        <p style="font-size:14px;color:#9ca3af;margin:0;line-height:1.5;">Or reach out to me directly with any questions:<br/><strong>Josh Kunz</strong> | 650.714.3340</p>
      </div>
    </div>
  </div>`;
}

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

    const { error: insertError } = await supabase.from("registrations").insert({
      racer_name: formObject.racerName || "",
      racer_email: formObject.racerEmail || "",
      tshirt_size: formObject.tshirtSize || "None",
      afterparty: formObject.afterparty || "Yes",
      party_guests: formObject.partyGuests ? parseInt(formObject.partyGuests, 10) : 0,
      invite1_name: formObject.invite1Name || null,
      invite1_email: formObject.invite1Email || null,
      invite2_name: formObject.invite2Name || null,
      invite2_email: formObject.invite2Email || null,
      invite3_name: formObject.invite3Name || null,
      invite3_email: formObject.invite3Email || null,
    });

    if (insertError) throw insertError;

    // Email failures shouldn't roll back the registration -- same behavior as the
    // original Apps Script (registration is recorded even if MailApp throws).
    try {
      if (formObject.racerEmail && formObject.racerEmail.includes("@")) {
        await sendMail(
          formObject.racerEmail.trim(),
          "Registration Confirmed: SLO 5x5 Adventure Race",
          racerTextBody(formObject),
          racerHtmlBody(formObject),
        );
      }

      const invitees = [
        { name: formObject.invite1Name, email: formObject.invite1Email },
        { name: formObject.invite2Name, email: formObject.invite2Email },
        { name: formObject.invite3Name, email: formObject.invite3Email },
      ];

      for (const invitee of invitees) {
        if (invitee.email && invitee.email.includes("@")) {
          const token = await generateToken(invitee.email);
          const confirmBase =
            `${CONFIRM_PAGE_URL}?` +
            `token=${encodeURIComponent(token)}` +
            `&name=${encodeURIComponent(invitee.name || "")}` +
            `&email=${encodeURIComponent(invitee.email.trim())}` +
            `&inviter=${encodeURIComponent(formObject.racerName || "")}`;

          await sendMail(
            invitee.email.trim(),
            "You've been challenged: SLO 5x5 Adventure Race!",
            inviteeTextBody(invitee.name, formObject.racerName, confirmBase),
            inviteeHtmlBody(invitee.name, formObject.racerName, confirmBase),
          );
        }
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Registration failed:", error);
    return new Response(
      JSON.stringify({ status: "error", message: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
