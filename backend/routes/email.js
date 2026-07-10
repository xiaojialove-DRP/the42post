/* ═══════════════════════════════════════════════════════
   Email Routes (Skill Forge Success + Notifications)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../utils/db.js';
import { sendForgeSuccessEmail } from '../utils/email.js';
import { generateEmailTemplate, generateCertificateHTML } from '../utils/certificate.js';
import { isValidEmail } from '../utils/validation.js';
import { requireAdminKey } from '../utils/auth.js';
import { rateLimitForge } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/email/send-forge-success
 * Send forge success email to creator with certificate and download links
 */
// rateLimitForge: 5/hour per identity (user > anon device > IP). This
// endpoint is necessarily unauthenticated (forging is anonymous), so the
// rate limit + binding the content to a real skill below are what stop it
// being used as an open mailer / phishing relay from our verified domain.
router.post('/send-forge-success', rateLimitForge, async (req, res, next) => {
  try {
    const {
      recipientEmail,
      recipientName,
      skillId,
      createdDate,
      cardImageBase64,
      blessing
    } = req.body;

    // Validation
    if (!recipientEmail) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'recipientEmail is required'
      });
    }

    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'recipientEmail must be a valid email address'
      });
    }

    if (!skillId) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'skillId is required'
      });
    }

    // Bind the email content to a REAL published skill. The title / soul-hash
    // / domain come from the database, NOT from the request body — otherwise
    // anyone could POST arbitrary "official" text to any recipient. If the
    // skill doesn't exist we refuse, so the endpoint can't be a generic mailer.
    const skillRow = await db.query(
      `SELECT title, soul_hash, domain FROM skills WHERE id = $1 AND deleted_at IS NULL`,
      [skillId]
    );
    if (skillRow.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'skillId does not match a published skill'
      });
    }
    const skillTitle = skillRow.rows[0].title;
    const soulHash = skillRow.rows[0].soul_hash;
    const domain = skillRow.rows[0].domain || 'ideas';

    // Generate email HTML with download links and card image
    const skillData = {
      title: skillTitle,
      author: recipientName || 'Creator',
      domain: domain || 'ideas'
    };

    // Construct download URLs
    const apiBaseUrl = (process.env.FRONTEND_URL || 'https://the42post.com').replace(/\/$/, '');
    const downloadUrls = {
      markdown: `${apiBaseUrl}/api/download/${skillId}?format=markdown`,
      langchain: `${apiBaseUrl}/api/download/${skillId}?format=langchain`,
      mcp: `${apiBaseUrl}/api/download/${skillId}?format=mcp`,
      site: apiBaseUrl
    };

    // If a base64 card image was provided, send it as a CID inline attachment
    // (works in Gmail and all major email clients; plain data: URIs are stripped
    // by Gmail's CSS sanitiser). The template receives the CID reference string
    // so it renders <img src="cid:creator-card"> instead of the data: URI.
    //
    // Resend's Attachment type (node_modules/resend/dist/index.d.mts) uses
    // camelCase contentType/contentId, and has no "inline" field at all --
    // setting contentId is what marks an attachment inline. This previously
    // used content_type/content_id/inline (snake_case, and a field that
    // doesn't exist), which Resend silently ignored: the PNG still sent as a
    // normal, non-inline attachment, but nothing was tagged with the cid the
    // template's <img src="cid:creator-card"> was pointing at -- a broken
    // image in the email body every time, with the real PNG only reachable
    // as a separate attachment.
    let emailAttachments = [];
    let templateCardRef = null;
    if (cardImageBase64 && cardImageBase64.startsWith('data:image/')) {
      const base64Data = cardImageBase64.split(',')[1];
      if (base64Data) {
        emailAttachments = [{
          filename: 'creator-card.png',
          content: base64Data,
          contentType: 'image/png',
          contentId: 'creator-card'
        }];
        templateCardRef = 'cid:creator-card';
      }
    }

    const emailHtml = generateEmailTemplate(
      skillData,
      soulHash,
      createdDate || new Date().toISOString(),
      downloadUrls,
      templateCardRef,
      blessing || ''
    );

    // Send email
    const emailResult = await sendForgeSuccessEmail({
      recipientEmail,
      recipientName: recipientName || 'Creator',
      skillTitle,
      soulHash,
      emailHtml,
      attachments: emailAttachments
    });

    if (!emailResult.success) {
      return res.status(500).json({
        error: 'Email sending failed',
        message: emailResult.error || 'Unknown error'
      });
    }

    // Log email sending event (optional)
    try {
      await db.query(
        `INSERT INTO email_logs (skill_id, recipient_email, email_type, status, message_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [skillId || null, recipientEmail, 'forge_success', 'sent', emailResult.messageId || null]
      );
    } catch (dbError) {
      console.warn('Could not log email event:', dbError.message);
      // Continue anyway - email was sent successfully
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: emailResult.messageId,
      timestamp: emailResult.timestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/email/certificate/:skill_id
 * Download the creator certificate as HTML file
 */
/**
 * POST /api/email/test
 * Test email sending configuration
 * Used to verify SMTP is properly configured
 */
// Operator-only diagnostic: sends a canned email to any address to verify
// mail config. Admin-gated (x-admin-key) so it can't be used as an open
// relay by anyone who finds the route.
router.post('/test', requireAdminKey, async (req, res, next) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'testEmail is required'
      });
    }

    // Send test email
    const emailResult = await sendForgeSuccessEmail({
      recipientEmail: testEmail,
      recipientName: 'Test User',
      skillTitle: '测试技能 | Test Skill',
      soulHash: 'SOUL_TEST_' + Math.random().toString(16).slice(2, 8),
      emailHtml: `
        <h2>🧪 THE 42 POST 邮件配置测试</h2>
        <p>这是一封测试邮件，用于验证 SMTP 配置是否正确。</p>
        <p><strong>如果你收到这封邮件，说明邮件服务配置成功！</strong></p>
        <hr>
        <p><em>Generated at ${new Date().toISOString()}</em></p>
      `
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: emailResult.error,
        message: '邮件发送失败。请检查 SMTP 配置。'
      });
    }

    res.json({
      success: true,
      message: `测试邮件已发送到 ${testEmail}`,
      messageId: emailResult.messageId,
      note: '请检查邮箱（包括垃圾邮件文件夹）'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/certificate/:skill_id', async (req, res, next) => {
  try {
    const { skill_id } = req.params;

    // Fetch skill data from database
    const skillResult = await db.query(
      `SELECT s.id, s.title, s.author_id, s.soul_hash, s.created_at, u.username
       FROM skills s
       LEFT JOIN users u ON s.author_id = u.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [skill_id]
    );

    if (skillResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Skill not found'
      });
    }

    const skill = skillResult.rows[0];

    const skillData = {
      title: skill.title,
      author: skill.username || 'Creator'
      // email intentionally omitted — not rendered in the certificate and
      // must not be handed to a public endpoint (PARTICIPANT_DATA.md).
    };

    const certificateHtml = generateCertificateHTML(
      skillData,
      skill.soul_hash,
      skill.created_at
    );

    // Set headers for download
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Creator_Card_${skill.soul_hash}.html"`);

    res.send(certificateHtml);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/email/diagnostics
 * Report whether email config env vars are present (without leaking the key).
 * Use this to quickly verify Zeabur environment variables are set correctly.
 */
router.get('/diagnostics', (req, res) => {
  const apiKeyPresent = !!process.env.RESEND_API_KEY;
  const apiKeyPrefix = apiKeyPresent
    ? process.env.RESEND_API_KEY.slice(0, 6) + '...'
    : null;
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const usingTestSender = emailFrom === 'onboarding@resend.dev';

  res.json({
    ok: true,
    resend_api_key: {
      present: apiKeyPresent,
      prefix: apiKeyPrefix
    },
    email_from: emailFrom,
    email_from_name: process.env.EMAIL_FROM_NAME || 'THE 42 POST',
    using_test_sender: usingTestSender,
    warning: usingTestSender
      ? 'Using onboarding@resend.dev — can ONLY deliver to the Resend account owner\'s verified email. For production, verify a domain at https://resend.com/domains and set EMAIL_FROM.'
      : null,
    frontend_url: process.env.FRONTEND_URL || null,
    ready: apiKeyPresent && !usingTestSender
  });
});

export default router;
