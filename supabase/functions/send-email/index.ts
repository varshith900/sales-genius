import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Encode to base64url
function base64url(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

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

    // Build RFC 2822 email message
    const fromName = customerName ? `SalesAgent AI` : `SalesAgent AI`;
    const rawEmail = [
      `From: ${fromName} <${GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
    ].join("\r\n");

    const encodedMessage = base64url(rawEmail);

    // Use Gmail API with App Password via Basic Auth won't work.
    // Use Gmail SMTP relay via the Gmail API REST endpoint
    // Gmail API: https://gmail.googleapis.com/gmail/v1/users/me/messages/send
    // With App Passwords, we use SMTP. But ports are blocked on edge functions.
    // Alternative: Use Resend if available, or use a simple SMTP relay.
    
    // Since SMTP ports are blocked in edge functions, let's use the Resend API 
    // as fallback, or we can try using Gmail via XOAuth2.
    // 
    // Best approach: Use nodemailer via npm compatibility
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
