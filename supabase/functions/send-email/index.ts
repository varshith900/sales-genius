import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, body, customerName } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS");

    if (!GMAIL_USER || !GMAIL_PASS) {
      return new Response(JSON.stringify({ error: "Gmail credentials not configured. Please add GMAIL_USER and GMAIL_PASS secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nodemailer = await import("npm:nodemailer@6.9.8");

    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `SalesAgent AI <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      text: body,
    });

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
