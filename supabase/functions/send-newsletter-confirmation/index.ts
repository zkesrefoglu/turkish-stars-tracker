import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// HTML escape function to prevent XSS
const escapeHtml = (str: string): string => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending welcome email to:", email);

    // Create HTML email content
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 0 auto; padding: 40px;">
                  <tr>
                    <td>
                      <h1 style="color: #E30A17; font-size: 32px; font-weight: bold; margin: 0 0 20px 0;">🇹🇷 Welcome to Turkish Stars Tracker!</h1>
                      
                      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                        Thank you for subscribing to our newsletter. We're thrilled to have you join our community of Turkish sports fans!
                      </p>

                      <div style="background-color: #fef2f2; border-left: 4px solid #E30A17; padding: 16px 20px; margin: 32px 0; border-radius: 4px;">
                        <p style="color: #991b1b; font-size: 16px; line-height: 24px; margin: 0;">
                          🎉 You're now subscribed with: <strong>${escapeHtml(email)}</strong>
                        </p>
                      </div>

                      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                        <strong>What to expect:</strong>
                      </p>
                      
                      <div style="margin: 16px 0;">
                        <p style="color: #333; font-size: 16px; line-height: 28px; margin: 8px 0;">⚽ Live match updates for Turkish footballers in Europe</p>
                        <p style="color: #333; font-size: 16px; line-height: 28px; margin: 8px 0;">🏀 NBA stats and highlights for Turkish basketball players</p>
                        <p style="color: #333; font-size: 16px; line-height: 28px; margin: 8px 0;">📊 Season stats and performance tracking</p>
                        <p style="color: #333; font-size: 16px; line-height: 28px; margin: 8px 0;">📰 Transfer rumors and breaking news</p>
                        <p style="color: #333; font-size: 16px; line-height: 28px; margin: 8px 0;">🗓️ Upcoming match schedules</p>
                      </div>

                      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;">

                      <div style="text-align: center; margin: 32px 0;">
                        <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
                          Start tracking your favorite Turkish athletes now:
                        </p>
                        <a href="https://turkishstarstracker.com" 
                           style="display: inline-block; background-color: #E30A17; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-top: 16px;">
                          Visit Turkish Stars Tracker
                        </a>
                      </div>

                      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;">

                      <p style="color: #8898aa; font-size: 14px; line-height: 22px; margin: 24px 0;">
                        Stay updated on Turkish athletes making their mark in top leagues around the world!
                      </p>

                      <p style="color: #8898aa; font-size: 12px; line-height: 20px; margin-top: 32px; text-align: center;">
                        © 2025 Turkish Stars Tracker. All rights reserved.<br>
                        <a href="https://turkishstarstracker.com" style="color: #E30A17; text-decoration: underline;">turkishstarstracker.com</a>
                      </p>

                      <p style="color: #ababab; font-size: 12px; line-height: 18px; margin-top: 16px; text-align: center;">
                        If you didn't subscribe to this newsletter, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: "Turkish Stars Tracker <newsletter@turkishstarstracker.com>",
      to: [email],
      subject: "Welcome to Turkish Stars Tracker - Track Your Favorite Athletes",
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-newsletter-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
