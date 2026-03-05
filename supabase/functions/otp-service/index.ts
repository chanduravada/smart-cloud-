// Edge Function: otp-service
// Handles custom 4-digit OTP: send via Resend + verify against DB
//
// Supabase Secrets required:
//   RESEND_API_KEY             (get free at resend.com)
//   SUPABASE_SERVICE_ROLE_KEY  (auto-populated by Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── OTP email template ───────────────────────────────────────────────────────

function buildOtpEmail(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#0ea5e9);padding:32px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">☁ Smart Cloud</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Secure File Storage</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;text-align:center;">
            <div style="font-size:20px;font-weight:600;color:#f1f5f9;margin-bottom:8px;">Your verification code</div>
            <div style="font-size:14px;color:#94a3b8;margin-bottom:32px;">Enter this 4-digit code to sign in. Expires in 10 minutes.</div>
            <div style="display:inline-block;background:#0f172a;border:2px solid #2563eb;border-radius:16px;padding:24px 48px;margin-bottom:32px;">
              <div style="font-size:52px;font-weight:800;color:#3b82f6;letter-spacing:18px;font-family:'Courier New',monospace;">${code}</div>
            </div>
            <div style="font-size:13px;color:#64748b;">If you didn't request this, you can safely ignore this email.</div>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #334155;padding:20px 32px;text-align:center;">
            <div style="font-size:12px;color:#475569;">© ${new Date().getFullYear()} Smart Cloud · Secure · Private · Fast</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send via Brevo (Sendinblue) REST API ─────────────────────────────────────
// Free tier: 300 emails/day, no custom domain needed, sends to ANY email

async function sendEmailBrevo(to: string, code: string, apiKey: string, senderEmail: string): Promise<void> {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Smart Cloud', email: senderEmail },
      to: [{ email: to }],
      subject: 'Your Smart Cloud verification code',
      htmlContent: buildOtpEmail(code),
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Brevo error (${resp.status}): ${body}`);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, email, code } = body as { action: string; email: string; code?: string };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── SEND ──────────────────────────────────────────────────────────────────
    if (action === 'send') {
      if (!email) throw new Error('email required');

      const otp = String(Math.floor(1000 + Math.random() * 9000));

      // Invalidate old codes
      await supabase.from('otp_codes').delete().eq('email', email).eq('used', false);

      // Store new code
      const { error: insertErr } = await supabase.from('otp_codes').insert({
        email,
        code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (insertErr) throw insertErr;

      // Send via Brevo (works for any email address)
      const brevoKey = Deno.env.get('BREVO_API_KEY')!;
      const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')!;
      await sendEmailBrevo(email, otp, brevoKey, senderEmail);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── VERIFY ────────────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!email || !code) throw new Error('email and code required');

      // ── Demo bypass: code "0000" always passes (for presentations/testing) ──
      if (code === '0000') {
        return new Response(JSON.stringify({ valid: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(JSON.stringify({ valid: false, error: 'Invalid or expired OTP' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('otp_codes').update({ used: true }).eq('id', data.id);

      return new Response(JSON.stringify({ valid: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[otp-service]', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
