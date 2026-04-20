/* ═══════════════════════════════════════════════════════
   Email Service Utility
   Handles email sending for skill forging confirmations
   ═══════════════════════════════════════════════════════ */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

// Initialize email transporter
function initializeEmailTransporter() {
  // If SMTP is not configured, return a mock transporter for development
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('⚠ Email service not configured. Using development mode (emails logged only).');
    return {
      sendMail: async (options) => {
        console.log(`📧 [DEV MODE] Email would be sent to: ${options.to}`);
        console.log(`   Subject: ${options.subject}`);
        return { messageId: 'dev-mode-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

// Get or create transporter
function getTransporter() {
  if (!transporter) {
    transporter = initializeEmailTransporter();
  }
  return transporter;
}

/**
 * Send forge success email to creator
 * @param {Object} options - Email options
 * @param {string} options.recipientEmail - Creator's email
 * @param {string} options.recipientName - Creator's name/username
 * @param {string} options.skillTitle - Skill title
 * @param {string} options.soulHash - Soul-Hash identifier
 * @param {string} options.invitationCode - Invitation code
 * @param {string} options.emailHtml - HTML content of the email
 * @returns {Promise<Object>} - Result with messageId or error
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

  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `THE 42 POST <${process.env.SMTP_USER || 'noreply@42post.io'}>`,
      to: recipientEmail,
      subject: `✨ 恭喜！你的 Skill 已成功铸造 | YOUR SKILL HAS BEEN FORGED`,
      html: emailHtml,
      // Plain text fallback
      text: `
恭喜！你的 Skill 已成功铸造

标题: ${skillTitle}
Soul-Hash: ${soulHash}
邀请码: ${invitationCode}

所有文件已发送到此邮件。

YOUR SKILL HAS BEEN FORGED

Congratulations on forging your skill!
      `.trim()
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`✓ Email sent successfully to ${recipientEmail}`);
    return {
      success: true,
      messageId: result.messageId,
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
 * Send verification email for new accounts
 * @param {string} email - Recipient email
 * @param {string} verificationLink - Verification link
 * @returns {Promise<Object>}
 */
export async function sendVerificationEmail(email, verificationLink) {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `THE 42 POST <${process.env.SMTP_USER || 'noreply@42post.io'}>`,
      to: email,
      subject: 'Verify Your THE 42 POST Account',
      html: `
        <h2>Welcome to THE 42 POST</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('❌ Verification email error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  sendForgeSuccessEmail,
  sendVerificationEmail,
  getTransporter,
  initializeEmailTransporter
};
