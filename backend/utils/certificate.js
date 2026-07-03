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
 * @param {string} createdDate - Creation date (ISO format)
 * @returns {string} - HTML content of the certificate
 */
// HTML escape helper to prevent XSS in generated HTML files
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

export function generateCertificateHTML(skillData, soulHash, createdDate) {
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
  <title>Creator Card - ${esc(title)}</title>
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
          <div class="card-skill-name">${esc(title)}</div>
          <div class="card-meta">
            <p>Created by: ${esc(author)}</p>
          </div>

          <!-- Soul Hash (Prominent) -->
          <div class="card-divider-bottom"></div>
          <div class="card-soul-hash-prominent">
            <div style="font-size: 11px; color: #999; letter-spacing: 2px; margin-bottom: 6px; text-transform: uppercase;">Soul-Hash</div>
            <div style="font-size: 18px; font-family: 'JetBrains Mono', monospace; font-weight: 600; letter-spacing: 1px; color: #333; word-break: break-all;">${esc(soulHash)}</div>
          </div>

          <!-- Rights Info and Date -->
          <div class="card-rights">
            License: ⊕ Open · Remix: ✓
          </div>
          <div class="card-forged-date">Forged: ${formattedDate}</div>

          <!-- Divider -->
          <div class="card-divider-bottom"></div>

          <!-- Footer -->
          <div class="card-footer">www.the42post.com</div>
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
 * @param {string} createdDate - Creation date
 * @param {Object} downloadUrls - Download URLs for different formats
 * @param {string} cardImageBase64 - Optional card image as base64 PNG
 * @returns {string} - HTML content of the email
 */
export function generateEmailTemplate(
  skillData,
  soulHash,
  createdDate,
  downloadUrls = {},
  cardImageBase64 = null,
  blessing = ''
) {
  const title = skillData.title || 'Untitled Skill';
  const author = skillData.author || skillData.username || 'Creator';
  const formattedDate = new Date(createdDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  // Detected from the skill's own content rather than a passed-in language
  // flag — no language field reaches this function from its caller, and
  // this matches the same content-based detection routes/skills.js already
  // uses to self-heal five_layer language after publish. Found this whole
  // email body hardcoded Chinese-only during a bilingual consistency audit.
  const isCn = /[一-鿿]/.test(title + (blessing || ''));

  const markdownUrl = downloadUrls.markdown || '#';
  const langchainUrl = downloadUrls.langchain || '#';
  const mcpUrl = downloadUrls.mcp || '#';
  const certificateUrl = downloadUrls.certificate || '#';
  const siteUrl = downloadUrls.site || 'https://the42post.com';
  const archiveUrl = `${siteUrl}/archive.html`;

  // Domain accent colours — matches styles.css card themes
  const DOMAIN_ACCENT = {
    safety: '#7e96a8', science: '#8fae7e', narrative: '#c9a06a',
    design: '#d98d76', visual: '#a892c4', experience: '#c4a35c',
    sound: '#7fa8b8', ideas: '#b8a23c', history: '#a08a6e', fun: '#cc7e9a'
  };
  const DOMAIN_GLYPH = {
    safety: '⛨', science: '✶', narrative: '✒', design: '◈',
    visual: '◉', experience: '❖', sound: '♫', ideas: '✦',
    history: '⌛', fun: '✺'
  };
  const domainKey = (skillData.domain || 'ideas').toLowerCase();
  const accent = DOMAIN_ACCENT[domainKey] || DOMAIN_ACCENT.ideas;
  const glyph  = DOMAIN_GLYPH[domainKey]  || DOMAIN_GLYPH.ideas;
  const domainLabel = domainKey.toUpperCase();
  const CN_DOMAIN_NAME = {
    safety:'安全', science:'科学', narrative:'叙事', design:'设计',
    visual:'视觉', experience:'体验', sound:'声音', ideas:'想法',
    history:'历史', fun:'趣味'
  };
  const domainLabelDisplay = isCn
    ? `${CN_DOMAIN_NAME[domainKey] || domainKey} · ${domainLabel}`
    : domainLabel;

  // Compute 8%-tinted background gradient for this domain
  const DOMAIN_RGB = {
    safety:[126,150,168], science:[143,174,126], narrative:[201,160,106],
    design:[217,141,118], visual:[168,146,196],  experience:[196,163,92],
    sound:[127,168,184],  ideas:[184,162,60],    history:[160,138,110], fun:[204,126,154]
  };
  const [dr, dg, db] = DOMAIN_RGB[domainKey] || DOMAIN_RGB.ideas;
  const mixRgb = (hex, r, g, b, t) => {
    const br = parseInt(hex.slice(1,3),16), bg_ = parseInt(hex.slice(3,5),16), bb = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.round(br*(1-t)+r*t)},${Math.round(bg_*(1-t)+g*t)},${Math.round(bb*(1-t)+b*t)})`;
  };
  const cardBg1 = mixRgb('#fbf6ee', dr, dg, db, 0.056);
  const cardBg2 = mixRgb('#f4ead8', dr, dg, db, 0.08);
  const cardBg3 = mixRgb('#f0e2ce', dr, dg, db, 0.096);

  // This returns the same HTML as email-template.html with template variables replaced
  return `<!DOCTYPE html>
<html lang="${isCn ? 'zh-CN' : 'en'}">
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
      padding: 20px 24px;
      background: #eef7f1;
      margin: 20px 0;
      font-size: 13px;
      line-height: 1.8;
      border-radius: 2px;
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
      <h1>${isCn ? '✨ 你的 Skill 已成功铸造 ✨' : '✨ Your Skill Has Been Forged ✨'}</h1>
      <p>${isCn ? 'Your Skill Has Been Forged Successfully' : 'Your idea is now a Skill, live on THE 42 POST'}</p>
    </div>

    <!-- BODY -->
    <div class="email-body">
      <p class="greeting">${isCn ? '亲爱的创作者，' : 'Dear creator,'}</p>

      <div class="congratulation">
        ${isCn ? `
        <p><strong>恭喜！🎉 你已成功铸造了一份独特的 Skill。</strong></p>
        <p style="margin-top: 10px;">你的想法、你的品味、你对世界的独特视角，现已被结构化、被记录、被验证。</p>
        <p style="margin-top: 10px;">这个 Skill 现已上线至 THE 42 POST 社区，准备好被采纳、被使用、被改进。</p>
        <p style="margin-top: 10px;">接下来，你可以在邮件下方找到所有安装包，集成到你的系统中，或分享给志同道合的伙伴。</p>
        ` : `
        <p><strong>Congratulations! 🎉 You have successfully forged a unique Skill.</strong></p>
        <p style="margin-top: 10px;">Your idea, your taste, your particular way of seeing the world — it's now structured, recorded, and verified.</p>
        <p style="margin-top: 10px;">This Skill is now live in the THE 42 POST community, ready to be adopted, used, and improved on.</p>
        <p style="margin-top: 10px;">Below, you'll find every install package — integrate it into your own system, or share it with someone who'd get it.</p>
        `}
      </div>

      <!-- COMMEMORATIVE CARD SECTION -->
      <div class="skill-card-section">
        ${cardImageBase64 ? `
        <!-- Card Image (PNG) -->
        <div style="margin: 20px 0; text-align: center;">
          <img src="${cardImageBase64}" alt="Creator Card" style="max-width: 100%; height: auto; border-radius: 4px; display: inline-block;">
        </div>
        ` : `
        <!-- COMMEMORATIVE CARD - domain-themed warm version -->
        <div style="
          display: inline-block;
          width: 260px;
          padding: 9px;
          background: linear-gradient(150deg, ${cardBg1} 0%, ${cardBg2} 55%, ${cardBg3} 100%);
          border: 1px solid ${accent}72;
          border-radius: 12px;
          box-shadow: 0 6px 28px rgba(42,32,24,0.14);
          text-align: center;
          font-family: 'Courier New', monospace;
          box-sizing: border-box;
        ">
          <!-- inner frame. Block layout, not flexbox: many email clients
               (Outlook desktop, several webmail CSS sanitizers) either drop
               flex-direction while keeping display:flex, or ignore it
               outright — both leave flex's true default (row) in effect,
               which squeezed every row into one line and forced the
               unbreakable Soul-Hash string into a sliver of width, wrapping
               it one character per line. Plain stacked divs (block is the
               real, universally-supported default for a <div>) can't fail
               that way. -->
          <div style="
            border: 1px solid ${accent}60;
            outline: 1px solid ${accent}28;
            outline-offset: 2px;
            border-radius: 7px;
            padding: 16px 14px 12px;
            text-align: center;
          ">
            <!-- brand -->
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 3px; color: #3c3028; text-transform: uppercase;">${isCn ? '第 42 邮 报' : 'THE 42 POST'}</div>
            <div style="font-size: 10px; font-style: italic; color: #8a7c6e; letter-spacing: 0.3px; margin-top: 2px;">${isCn ? '创作者证书' : "Creator's Certificate"}</div>

            <!-- domain seal — line-height centers the glyph instead of flex -->
            <div style="
              width: 38px; height: 38px;
              line-height: 38px;
              font-size: 18px;
              color: ${accent};
              border: 2px solid ${accent}b0;
              border-radius: 50%;
              background: ${accent}12;
              margin: 11px auto 4px;
              text-align: center;
            ">${glyph}</div>

            <!-- skill name -->
            <div style="font-size: 14px; font-weight: 700; color: #2a2018; font-family: Georgia, serif; line-height: 1.3; margin-top: 7px;">${esc(title)}</div>

            <!-- domain pill -->
            <div style="
              display: inline-block;
              font-size: 8px; font-weight: 700; letter-spacing: 2.4px;
              text-transform: uppercase;
              color: ${accent};
              border: 1px solid ${accent}90;
              padding: 2px 10px;
              border-radius: 20px;
              margin-top: 7px;
            ">${domainLabelDisplay}</div>

            ${blessing ? `<!-- blessing -->
            <div style="font-size: 9px; font-style: italic; color: #5a4f44; text-align: center; line-height: 1.55; padding: 2px 10px; font-family: Georgia, serif; margin-top: 7px;">
              <span style="color: ${accent};">“</span>${esc(blessing)}<span style="color: ${accent};">”</span>
            </div>` : ''}

            <!-- divider -->
            <div style="width: 80%; height: 1px; background: ${accent}30; margin: 9px auto;"></div>

            <!-- creator + date -->
            <div style="font-size: 9px; color: #8a7c6e; letter-spacing: 0.6px;">
              ${isCn
                ? `由 ${esc(author)} 创作 · ${new Date(createdDate).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}`
                : `Forged by ${esc(author)} · ${formattedDate}`}
            </div>

            <!-- soul hash -->
            <div style="font-size: 9px; color: #8a7c6e; letter-spacing: 1px; font-weight: 700; color: ${accent}; word-break: break-all; margin-top: 7px;">${esc(soulHash ? soulHash.substring(0, 14) : '')}</div>

            <!-- divider -->
            <div style="width: 80%; height: 1px; background: ${accent}30; margin: 9px auto;"></div>

            <!-- website -->
            <div style="font-size: 7.5px; letter-spacing: 2px; color: rgba(138,124,110,0.65);">www.the42post.com</div>
          </div>
        </div>
        `}

        <!-- Card Download Option -->
        <div style="text-align: center; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; margin-bottom: 10px;">💾 Your Creator Card is ready to download:</p>
          <a href="${certificateUrl}" style="display: inline-block; background: #222; color: white; padding: 12px 28px; text-decoration: none; border-radius: 3px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">📥 Download as PNG</a>
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
      <h3>${isCn ? '接下来你可以：' : 'What you can do next:'}</h3>
      <div class="steps-list">
        ${isCn ? `
        <ol>
          <li>选择一种格式下载，集成到你的 Agent 系统</li>
          <li>在 Playground 体验你的 Skill 效果</li>
          <li>分享你的 Skill 链接到社区，让更多人发现它</li>
        </ol>
        ` : `
        <ol>
          <li>Download a format and integrate it into your own agent system</li>
          <li>Try your Skill out for yourself in the Playground</li>
          <li>Share your Skill's link so others in the community can find it</li>
        </ol>
        `}
      </div>

    </div>

    <!-- FOOTER -->
    <div class="email-footer">
      <p>感谢您的参与！</p>
      <p style="color: #bbb; margin-top: 2px;">Thank you for your participation.</p>
      <p style="margin-top: 14px;"><a href="${siteUrl}" style="color: #666; text-decoration: none; font-weight: bold;">www.the42post.com</a></p>
      <p style="margin-top: 4px; color: #aaa;">Forging Human Wisdom for a Better AI Future</p>
      <p style="margin-top: 14px; border-top: 1px solid #eee; padding-top: 12px; color: #ccc; font-size: 10px;">© 2026 The 42 Post · All rights reserved</p>
    </div>
  </div>
</body>
</html>`;
}

export default {
  generateCertificateHTML,
  generateEmailTemplate
};
