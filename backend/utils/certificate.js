/* ═══════════════════════════════════════════════════════
   Certificate Generator Utility
   Generates downloadable certificates for forged skills
   ═══════════════════════════════════════════════════════ */

/**
 * Generate HTML certificate for a skill
 * @param {Object} skillData - Skill data
 * @param {string} skillData.title - Skill title
 * @param {string} skillData.author - Creator name
 * @param {string} skillData.email - Creator email
 * @param {string} soulHash - Soul-Hash identifier
 * @param {string} invitationCode - Invitation code
 * @param {string} createdDate - Creation date (ISO format)
 * @returns {string} - HTML content of the certificate
 */
export function generateCertificateHTML(skillData, soulHash, invitationCode, createdDate) {
  const title = skillData.title || 'Untitled Skill';
  const author = skillData.author || skillData.username || 'Creator';
  const formattedDate = new Date(createdDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creator Card - ${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Playfair Display', 'Courier New', serif;
      background: #f5f5f5;
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .certificate-wrapper {
      background: white;
      padding: 40px;
      border-radius: 3px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      max-width: 1000px;
      width: 100%;
    }

    .commemorative-card {
      background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%);
      border: 2px solid #222;
      padding: 35px 30px;
      max-width: 500px;
      margin: 0 auto;
      text-align: center;
      font-family: 'Courier New', monospace;
      border-radius: 2px;
    }

    .card-border-outer {
      border: 4px solid #222;
      padding: 10px;
      background: white;
    }

    .card-border-inner {
      border: 1px solid #222;
      padding: 32px 60px;
      background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%);
    }

    .card-title-main {
      font-size: 24px;
      font-weight: bold;
      color: #222;
      margin-bottom: 4px;
      font-family: 'Playfair Display', serif;
      letter-spacing: 2px;
    }

    .card-header {
      font-size: 11px;
      font-style: italic;
      color: #999;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .card-divider-top,
    .card-divider-line,
    .card-divider-bottom {
      width: 100%;
      height: 1px;
      background: #ddd;
      margin: 12px 0;
    }

    .card-crest {
      font-size: 40px;
      margin: 12px 0;
      line-height: 1;
    }

    .card-creator-role {
      font-size: 14px;
      font-weight: bold;
      color: #222;
      margin: 6px 0 4px 0;
      font-family: 'Playfair Display', serif;
    }

    .card-skill-name {
      font-size: 12px;
      font-style: italic;
      color: #666;
      margin: 4px 0;
      font-family: 'Playfair Display', serif;
    }

    .card-meta {
      font-size: 11px;
      color: #999;
      margin: 4px 0;
      line-height: 1.6;
      font-family: 'Courier New', monospace;
    }

    .card-meta p {
      margin: 2px 0;
    }

    .card-rights {
      font-size: 10px;
      color: #bbb;
      margin: 4px 0;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
    }

    .card-soul-hash {
      font-size: 13px;
      color: #222;
      margin: 6px 0;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .card-forged-date {
      font-size: 11px;
      color: #666;
      margin: 4px 0;
      font-family: 'Courier New', monospace;
    }

    .card-footer {
      font-size: 9px;
      color: #222;
      font-weight: bold;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
      margin-top: 8px;
    }

    .invitation-section {
      font-size: 10px;
      color: #bbb;
      margin: 8px 0;
      letter-spacing: 1px;
    }

    .invitation-code {
      font-size: 14px;
      font-weight: bold;
      color: #222;
      margin: 4px 0;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
    }

    .invitation-note {
      font-size: 9px;
      color: #ccc;
      margin: 6px 0;
      line-height: 1.5;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .certificate-wrapper {
        background: transparent;
        padding: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <div class="commemorative-card">
      <div class="card-border-outer">
        <div class="card-border-inner">
          <!-- Header -->
          <div class="card-title-main">The 42 Post</div>
          <div class="card-header">Creator's Certificate · 创作者证书</div>

          <!-- Crest/Icon -->
          <div class="card-divider-top"></div>
          <div class="card-crest">✨</div>
          <div class="card-divider-line"></div>

          <!-- Creator Role -->
          <div class="card-creator-role">Community Creator</div>

          <!-- Skill Info -->
          <div class="card-skill-name">${title}</div>
          <div class="card-meta">
            <p>Created by: ${author}</p>
          </div>

          <!-- Rights Info -->
          <div class="card-rights">
            License: ⊕ Open · Remix: ✓
          </div>

          <!-- Soul Hash and Date -->
          <div class="card-soul-hash">Soul-Hash: ${soulHash}</div>
          <div class="card-forged-date">Forged: ${formattedDate}</div>

          <!-- Divider -->
          <div class="card-divider-bottom"></div>

          <!-- Invitation Code -->
          <div class="invitation-section">INVITATION CODE · 邀请码</div>
          <div class="invitation-code">${invitationCode}</div>
          <div class="invitation-note">Share this code with those who share our values<br/>用邀请码分享给志同道合的伙伴</div>

          <!-- Divider -->
          <div class="card-divider-bottom"></div>

          <!-- Footer -->
          <div class="card-footer">www.42post.io</div>
        </div>
      </div>
    </div>
  </div>
  <script>
    // Auto-print when loaded
    if (window.location.hash === '#print') {
      window.addEventListener('load', () => {
        window.print();
      });
    }
  </script>
</body>
</html>`;

  return html;
}

/**
 * Generate email template HTML with certificate card
 * @param {Object} skillData - Skill data
 * @param {string} soulHash - Soul-Hash identifier
 * @param {string} invitationCode - Invitation code
 * @param {string} createdDate - Creation date
 * @param {Object} downloadUrls - Download URLs for different formats
 * @returns {string} - HTML content of the email
 */
export function generateEmailTemplate(
  skillData,
  soulHash,
  invitationCode,
  createdDate,
  downloadUrls = {}
) {
  const title = skillData.title || 'Untitled Skill';
  const author = skillData.author || skillData.username || 'Creator';
  const formattedDate = new Date(createdDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const markdownUrl = downloadUrls.markdown || '#';
  const langchainUrl = downloadUrls.langchain || '#';
  const mcpUrl = downloadUrls.mcp || '#';
  const certificateUrl = downloadUrls.certificate || '#';

  // This returns the same HTML as email-template.html with template variables replaced
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Playfair Display', 'Courier New', serif;
      background: #f9f9f9;
      color: #333;
      line-height: 1.6;
    }

    .email-container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
    }

    .email-header {
      padding: 40px 30px;
      border-bottom: 2px solid #222;
      text-align: center;
    }

    .email-header h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #222;
    }

    .email-header p {
      font-size: 14px;
      color: #666;
    }

    .email-body {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 14px;
      margin-bottom: 20px;
      color: #333;
    }

    .congratulation {
      padding: 20px;
      background: #f0f8f0;
      border-left: 4px solid #22c55e;
      margin: 20px 0;
      font-size: 13px;
      line-height: 1.8;
    }

    .skill-card-section {
      margin: 40px 0;
      text-align: center;
    }

    .commemorative-card {
      background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%);
      border: 2px solid #222;
      padding: 35px 30px;
      max-width: 500px;
      margin: 0 auto 30px auto;
      text-align: center;
      font-family: 'Courier New', monospace;
      border-radius: 2px;
    }

    .card-border-outer {
      border: 4px solid #222;
      padding: 10px;
      background: white;
    }

    .card-border-inner {
      border: 1px solid #222;
      padding: 32px 60px;
      background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%);
    }

    .card-title-main {
      font-size: 24px;
      font-weight: bold;
      color: #222;
      margin-bottom: 4px;
      font-family: 'Playfair Display', serif;
      letter-spacing: 2px;
    }

    .card-header {
      font-size: 11px;
      font-style: italic;
      color: #999;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .card-divider-top, .card-divider-line, .card-divider-bottom {
      width: 100%;
      height: 1px;
      background: #ddd;
      margin: 12px 0;
    }

    .card-crest {
      font-size: 40px;
      margin: 12px 0;
      line-height: 1;
    }

    .card-creator-role {
      font-size: 14px;
      font-weight: bold;
      color: #222;
      margin: 6px 0 4px 0;
      font-family: 'Playfair Display', serif;
    }

    .card-skill-name {
      font-size: 12px;
      font-style: italic;
      color: #666;
      margin: 4px 0;
      font-family: 'Playfair Display', serif;
    }

    .card-meta {
      font-size: 11px;
      color: #999;
      margin: 4px 0;
      line-height: 1.6;
      font-family: 'Courier New', monospace;
    }

    .card-meta p {
      margin: 2px 0;
    }

    .card-rights {
      font-size: 10px;
      color: #bbb;
      margin: 4px 0;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
    }

    .card-soul-hash {
      font-size: 13px;
      color: #222;
      margin: 6px 0;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .card-forged-date {
      font-size: 11px;
      color: #666;
      margin: 4px 0;
      font-family: 'Courier New', monospace;
    }

    .card-divider-bottom {
      width: 100%;
      height: 1px;
      background: #ddd;
      margin: 4px 0;
    }

    .card-footer {
      font-size: 9px;
      color: #222;
      font-weight: bold;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
    }

    .install-title {
      font-size: 14px;
      font-weight: bold;
      margin: 20px 0 15px 0;
      color: #222;
      letter-spacing: 0.5px;
    }

    .download-formats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 15px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .download-item {
      background: white;
      border: 1px solid #ddd;
      padding: 14px 10px;
      border-radius: 2px;
      text-align: center;
    }

    .format-icon {
      font-size: 22px;
      margin-bottom: 7px;
      display: block;
    }

    .format-name {
      display: block;
      font-size: 12px;
      font-weight: bold;
      color: #222;
      margin-bottom: 2px;
    }

    .format-type {
      display: block;
      font-size: 9px;
      color: #999;
      margin-bottom: 8px;
      font-style: italic;
    }

    .download-btn {
      display: inline-block;
      background: #222;
      color: white;
      padding: 6px 10px;
      text-decoration: none;
      border-radius: 2px;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 0.3px;
    }

    .download-certificate-btn {
      display: inline-block;
      background: #222;
      color: white;
      padding: 12px 28px;
      text-decoration: none;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: 20px 0;
    }

    .action-section {
      margin: 30px 0;
      text-align: center;
    }

    .action-btn {
      display: inline-block;
      background: #222;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: 8px 5px;
    }

    .email-footer {
      padding: 30px;
      border-top: 2px solid #ddd;
      background: #f9f9f9;
      font-size: 11px;
      color: #999;
      text-align: center;
    }

    h3 {
      font-size: 14px;
      font-weight: bold;
      color: #222;
      margin: 20px 0 10px 0;
    }

    .steps-list {
      font-size: 12px;
      color: #666;
      line-height: 1.8;
      margin: 10px 0;
    }

    .steps-list li {
      margin-left: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- HEADER -->
    <div class="email-header">
      <h1>✨ 你的 Skill 已成功铸造 ✨</h1>
      <p>Your Skill Has Been Forged Successfully</p>
    </div>

    <!-- BODY -->
    <div class="email-body">
      <p class="greeting">亲爱的创作者，</p>

      <div class="congratulation">
        <p><strong>恭喜！🎉 你已成功铸造了一份独特的 Skill。</strong></p>
        <p style="margin-top: 10px;">你的想法、你的品味、你对世界的独特视角，现已被结构化、被记录、被验证。</p>
        <p style="margin-top: 10px;">这个 Skill 现已上线至 THE 42 POST 社区，准备好被采纳、被使用、被改进。</p>
        <p style="margin-top: 10px;">接下来，你可以在邮件下方找到所有安装包，集成到你的系统中，或分享给志同道合的伙伴。</p>
      </div>

      <!-- COMMEMORATIVE CARD SECTION -->
      <div class="skill-card-section">
        <!-- COMMEMORATIVE CARD - Creator's Certificate -->
        <div class="commemorative-card">
          <div class="card-border-outer">
            <div class="card-border-inner">
              <!-- Header -->
              <div class="card-title-main">The 42 Post</div>
              <div class="card-header">Creator's Certificate · 创作者证书</div>

              <!-- Crest/Icon -->
              <div class="card-divider-top"></div>
              <div class="card-crest">✨</div>
              <div class="card-divider-line"></div>

              <!-- Creator Role -->
              <div class="card-creator-role">Community Creator</div>

              <!-- Skill Info -->
              <div class="card-skill-name">${title}</div>
              <div class="card-meta">
                <p>Created by: ${author}</p>
              </div>

              <!-- Rights Info -->
              <div class="card-rights">
                License: ⊕ Open · Remix: ✓
              </div>

              <!-- Soul Hash and Date -->
              <div class="card-soul-hash">Soul-Hash: ${soulHash}</div>
              <div class="card-forged-date">Forged: ${formattedDate}</div>

              <!-- Divider -->
              <div class="card-divider-bottom"></div>

              <!-- Invitation Code -->
              <div style="font-size: 10px; color: #bbb; margin: 8px 0; letter-spacing: 1px;">INVITATION CODE · 邀请码</div>
              <div style="font-size: 14px; font-weight: bold; color: #222; margin: 4px 0; font-family: 'Courier New', monospace; letter-spacing: 2px;">${invitationCode}</div>
              <div style="font-size: 9px; color: #ccc; margin: 6px 0; line-height: 1.5;">Share this code with those who share our values<br/>用邀请码分享给志同道合的伙伴</div>

              <!-- Divider -->
              <div class="card-divider-bottom"></div>

              <!-- Footer -->
              <div class="card-footer">www.42post.io</div>
            </div>
          </div>
        </div>

        <!-- DOWNLOAD CERTIFICATE -->
        <div style="text-align: center; margin: 20px 0;">
          <a href="${certificateUrl}" style="display: inline-block; background: #222; color: white; padding: 12px 28px; text-decoration: none; border-radius: 3px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">📥 下载证书 / DOWNLOAD CERTIFICATE</a>
        </div>

        <!-- DOWNLOAD SECTION -->
        <div class="install-title">INSTALL YOUR SKILL</div>

        <div class="download-formats">
          <!-- MARKDOWN -->
          <div class="download-item">
            <span class="format-icon">📖</span>
            <div class="format-name">Markdown</div>
            <div class="format-type">Human-Readable</div>
            <a href="${markdownUrl}" class="download-btn">↓ DOWNLOAD</a>
          </div>

          <!-- LANGCHAIN -->
          <div class="download-item">
            <span class="format-icon">🐍</span>
            <div class="format-name">LangChain</div>
            <div class="format-type">Python Dev</div>
            <a href="${langchainUrl}" class="download-btn">↓ DOWNLOAD</a>
          </div>

          <!-- MCP CONFIG -->
          <div class="download-item">
            <span class="format-icon">⚙️</span>
            <div class="format-name">MCP Config</div>
            <div class="format-type">Deployment</div>
            <a href="${mcpUrl}" class="download-btn">↓ DOWNLOAD</a>
          </div>
        </div>

        <div style="text-align: center; font-size: 11px; color: #999; margin-top: 8px; font-style: italic;">
          All formats contain the complete five-layer skill architecture.
        </div>
      </div>

      <!-- NEXT STEPS -->
      <h3>接下来你可以：</h3>
      <div class="steps-list">
        <ol>
          <li>选择一种格式下载，集成到你的 Agent 系统</li>
          <li>在 Playground 体验你的 Skill 效果</li>
          <li>分享你的 Skill 链接到社区，让更多人发现它</li>
          <li>定期检查 Impact Dashboard，看你的 Skill 如何被使用</li>
        </ol>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="email-footer">
      <p><strong>THE 42 POST</strong></p>
      <p>A Base for Human Values Alignment in AI Agents</p>
      <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">有任何问题？直接回复这封邮件即可。</p>
      <p>© 2026 THE 42 POST · All rights reserved</p>
    </div>
  </div>
</body>
</html>`;
}

export default {
  generateCertificateHTML,
  generateEmailTemplate
};
