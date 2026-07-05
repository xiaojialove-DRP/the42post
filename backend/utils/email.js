/* ═══════════════════════════════════════════════════════
   Email Service — Resend (HTTP API)

   Why Resend (not SMTP): Zeabur blocks outbound SMTP ports
   (25/465/587) to prevent spam, so nodemailer always times out.
   Resend uses HTTPS (port 443), works reliably on Zeabur, and
   has a generous free tier (3,000 emails / month).

   Env:
     RESEND_API_KEY   (required) — https://resend.com/api-keys
     EMAIL_FROM       (optional) — defaults to onboarding@resend.dev
                                   (Resend's test sender, no domain
                                   verification needed)
   ═══════════════════════════════════════════════════════ */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'THE 42 POST';
// Resend's test sender can only deliver to the account owner's verified email.
// Any other recipient fails with a 403. We use this flag to surface a clear error.
const USING_TEST_SENDER = EMAIL_FROM === 'onboarding@resend.dev';

// ─── Startup check ───
if (!RESEND_API_KEY) {
  console.warn('⚠️  WARNING: RESEND_API_KEY not set!');
  console.warn('   Emails will NOT be delivered — only logged to console.');
  console.warn('   Get a key at https://resend.com/api-keys');
  console.warn('   Then set RESEND_API_KEY in Zeabur environment variables.');
} else {
  console.log(`✅ Email service: Resend (from: ${EMAIL_FROM_NAME} <${EMAIL_FROM}>)`);
  if (USING_TEST_SENDER) {
    console.warn('⚠️  Using Resend TEST sender (onboarding@resend.dev).');
    console.warn('   This address can ONLY deliver to the Resend account owner\'s verified email.');
    console.warn('   To send to real users, verify a domain at https://resend.com/domains');
    console.warn('   and set EMAIL_FROM=you@yourdomain.com in Zeabur environment variables.');
  }
}

// ─── Singleton Resend client ───
let resendClient = null;
function getResend() {
  if (!resendClient && RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ─── Admin degradation alerts ───
// Fired when the platform silently degrades (e.g. both LLM providers fail
// and a forge falls back to the template five-layer). For a research
// platform that degradation is data pollution, not just UX — so the
// operator must find out the same hour, not at the next manual data audit.
// Cooldown: at most one email per alert key per hour, so a provider outage
// during a busy stretch produces one email, not one per forge.
const ALERT_TO = process.env.ALERT_EMAIL || null;
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const lastAlertAt = new Map();

export async function sendAdminAlert(key, subject, body) {
  const now = Date.now();
  const last = lastAlertAt.get(key) || 0;
  if (now - last < ALERT_COOLDOWN_MS) return { success: false, throttled: true };
  lastAlertAt.set(key, now);

  if (!ALERT_TO) {
    // Loud in logs so it's greppable even without email configured.
    console.error(`🚨 [ADMIN ALERT — ALERT_EMAIL not set, email skipped] ${subject}\n${body}`);
    return { success: false, error: 'ALERT_EMAIL not configured' };
  }

  return sendViaResend({
    to: ALERT_TO,
    subject: `[42POST ALERT] ${subject}`,
    text: body,
    html: `<pre style="font-family:monospace;white-space:pre-wrap">${body}</pre>`
  });
}

// ─── Shared send helper (exported for digest emails etc.) ───
export async function sendViaResend({ to, subject, html, text, attachments }) {
  const client = getResend();

  // Dev mode: no key → log & fake success so the app flow isn't blocked
  if (!client) {
    console.log(`📧 [DEV MODE - email NOT actually sent] → ${to}`);
    console.log(`   Subject: ${subject}`);
    return {
      success: false,
      dev_mode: true,
      error: 'RESEND_API_KEY not configured',
      messageId: 'dev-' + Date.now()
    };
  }

  console.log(`📤 Attempting to send email via Resend → ${to}`);
  console.log(`   From: ${EMAIL_FROM_NAME} <${EMAIL_FROM}>`);
  console.log(`   Subject: ${subject}`);

  try {
    const result = await client.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
      ...(attachments && attachments.length ? { attachments } : {})
    });

    // Resend returns { data: { id }, error: null } on success
    // or { data: null, error: { message, name, statusCode } } on failure
    if (result.error) {
      const errObj = result.error;
      console.error('❌ Resend API error:');
      console.error('   name:', errObj.name);
      console.error('   message:', errObj.message);
      console.error('   statusCode:', errObj.statusCode);
      console.error('   full error:', JSON.stringify(errObj));

      // Friendly hint for the most common Resend mistake
      let hint = '';
      if (USING_TEST_SENDER) {
        hint = ' [HINT: onboarding@resend.dev can only send to the Resend account owner\'s verified email. Verify a domain at resend.com/domains and set EMAIL_FROM.]';
      } else if (/domain is not verified|not verified/i.test(errObj.message || '')) {
        hint = ' [HINT: Your EMAIL_FROM domain is not verified at Resend. Verify it at resend.com/domains.]';
      } else if (/invalid.*api.*key|api key/i.test(errObj.message || '')) {
        hint = ' [HINT: RESEND_API_KEY looks invalid. Regenerate at resend.com/api-keys.]';
      }

      return {
        success: false,
        error: (errObj.message || JSON.stringify(errObj)) + hint,
        errorName: errObj.name,
        statusCode: errObj.statusCode,
        timestamp: new Date().toISOString()
      };
    }

    const messageId = result.data?.id;
    console.log(`✓ Email sent to ${to} (id: ${messageId})`);
    return {
      success: true,
      messageId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Email sending exception:', error.message);
    console.error('   stack:', error.stack);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send forge success email to creator.
 */
export async function sendForgeSuccessEmail(options) {
  const {
    recipientEmail,
    recipientName = 'Creator',
    skillTitle = 'Untitled Skill',
    soulHash,
    emailHtml,
    attachments
  } = options;

  if (!recipientEmail) {
    throw new Error('recipientEmail is required');
  }

  return sendViaResend({
    to: recipientEmail,
    subject: `✨ 恭喜！你的 Skill 已成功铸造 | YOUR SKILL HAS BEEN FORGED`,
    html: emailHtml,
    attachments,
    text: `
恭喜！你的 Skill 已成功铸造

标题: ${skillTitle}
Soul-Hash: ${soulHash}

所有文件已发送到此邮件。

YOUR SKILL HAS BEEN FORGED

Congratulations on forging your skill, ${recipientName}!
    `.trim()
  });
}

export default {
  sendForgeSuccessEmail
};
