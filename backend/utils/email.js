/* ═══════════════════════════════════════════════════════
   Email Service — Resend (HTTP API)

   Why Resend (not SMTP): Railway blocks outbound SMTP ports
   (25/465/587) to prevent spam, so nodemailer always times out.
   Resend uses HTTPS (port 443), works reliably on Railway, and
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

// ─── Startup check ───
if (!RESEND_API_KEY) {
  console.warn('⚠️  WARNING: RESEND_API_KEY not set!');
  console.warn('   Emails will NOT be delivered — only logged to console.');
  console.warn('   Get a key at https://resend.com/api-keys');
  console.warn('   Then set RESEND_API_KEY in Railway Variables.');
} else {
  console.log(`✅ Email service: Resend (from: ${EMAIL_FROM_NAME} <${EMAIL_FROM}>)`);
}

// ─── Singleton Resend client ───
let resendClient = null;
function getResend() {
  if (!resendClient && RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ─── Shared send helper ───
async function sendViaResend({ to, subject, html, text }) {
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

  try {
    const result = await client.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to,
      subject,
      html,
      text
    });

    // Resend returns { data: { id }, error: null } on success
    // or { data: null, error: { message, name } } on failure
    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || JSON.stringify(result.error),
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
    console.error('❌ Email sending error:', error.message);
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
    invitationCode,
    emailHtml
  } = options;

  if (!recipientEmail) {
    throw new Error('recipientEmail is required');
  }

  return sendViaResend({
    to: recipientEmail,
    subject: `✨ 恭喜！你的 Skill 已成功铸造 | YOUR SKILL HAS BEEN FORGED`,
    html: emailHtml,
    text: `
恭喜！你的 Skill 已成功铸造

标题: ${skillTitle}
Soul-Hash: ${soulHash}
邀请码: ${invitationCode}

所有文件已发送到此邮件。

YOUR SKILL HAS BEEN FORGED

Congratulations on forging your skill, ${recipientName}!
    `.trim()
  });
}

/**
 * Send verification email for new accounts.
 */
export async function sendVerificationEmail(email, verificationLink) {
  return sendViaResend({
    to: email,
    subject: 'Verify Your THE 42 POST Account',
    html: `
      <h2>Welcome to THE 42 POST</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationLink}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
    text: `Welcome to THE 42 POST\n\nVerify your email: ${verificationLink}\n\nThis link will expire in 24 hours.`
  });
}

export default {
  sendForgeSuccessEmail,
  sendVerificationEmail
};
