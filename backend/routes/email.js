/* ═══════════════════════════════════════════════════════
   Email Routes (Skill Forge Success + Notifications)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../server.js';
import { sendForgeSuccessEmail } from '../utils/email.js';
import { generateEmailTemplate, generateCertificateHTML } from '../utils/certificate.js';

const router = express.Router();

/**
 * POST /api/email/send-forge-success
 * Send forge success email to creator with certificate and download links
 */
router.post('/send-forge-success', async (req, res, next) => {
  try {
    const {
      recipientEmail,
      recipientName,
      skillTitle,
      skillId,
      soulHash,
      invitationCode,
      createdDate
    } = req.body;

    // Validation
    if (!recipientEmail) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'recipientEmail is required'
      });
    }

    if (!skillTitle || !soulHash || !invitationCode) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'skillTitle, soulHash, and invitationCode are required'
      });
    }

    // Generate email HTML with download links
    const skillData = {
      title: skillTitle,
      author: recipientName || 'Creator'
    };

    // Construct download URLs (these will be implemented separately)
    const downloadUrls = {
      markdown: `${process.env.FRONTEND_URL}/download/${skillId}?format=markdown`,
      langchain: `${process.env.FRONTEND_URL}/download/${skillId}?format=langchain`,
      mcp: `${process.env.FRONTEND_URL}/download/${skillId}?format=mcp`,
      certificate: `${process.env.FRONTEND_URL}/download/${skillId}?format=certificate`
    };

    const emailHtml = generateEmailTemplate(
      skillData,
      soulHash,
      invitationCode,
      createdDate || new Date().toISOString(),
      downloadUrls
    );

    // Send email
    const emailResult = await sendForgeSuccessEmail({
      recipientEmail,
      recipientName: recipientName || 'Creator',
      skillTitle,
      soulHash,
      invitationCode,
      emailHtml
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
router.post('/test', async (req, res, next) => {
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
      invitationCode: 'TEST-CODE-42',
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
      `SELECT s.id, s.title, s.author_id, s.soul_hash, s.created_at, u.username, u.email
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

    // Generate invitation code (this should be stored in DB, but for now generate it)
    // In a real implementation, this would be fetched from the database
    const invitationCode = `42-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const skillData = {
      title: skill.title,
      author: skill.username || 'Creator',
      email: skill.email
    };

    const certificateHtml = generateCertificateHTML(
      skillData,
      skill.soul_hash,
      invitationCode,
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
 * POST /api/email/send-verification
 * Send account verification email
 */
router.post('/send-verification', async (req, res, next) => {
  try {
    const { email, verificationToken } = req.body;

    if (!email || !verificationToken) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'email and verificationToken are required'
      });
    }

    const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`;

    const { sendVerificationEmail } = await import('../utils/email.js');
    const result = await sendVerificationEmail(email, verificationLink);

    if (!result.success) {
      return res.status(500).json({
        error: 'Email sending failed',
        message: result.error
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent',
      messageId: result.messageId
    });
  } catch (error) {
    next(error);
  }
});

export default router;
