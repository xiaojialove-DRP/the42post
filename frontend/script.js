/* ═══════════════════════════════════════════════════════
   THE 42 POST — V2.0 Classical Redesign
   i18n · Knight Card · KCS · Dual-Path Forge · Starlight
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   PHASE 0: API CLIENT LAYER (Front-Back Connection)
   ═══════════════════════════════════════════════════════ */

// Auto-detect API URL based on current domain
function getDefaultAPIUrl() {
  const stored = localStorage.getItem('42post_api_url');
  if (stored) return stored;

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  // For production (Railway, Vercel, etc), use the same domain
  return `${window.location.protocol}//${window.location.host}/api`;
}

const API_CONFIG = {
  BASE_URL: getDefaultAPIUrl(),
  TOKEN_KEY: '42post_jwt_token',
  USER_KEY: '42post_user'
};

const ApiClient = {
  // Get stored JWT token
  getToken() {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY);
  },

  // Set JWT token
  setToken(token) {
    if (token) localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
    else localStorage.removeItem(API_CONFIG.TOKEN_KEY);
  },

  // Get current user
  getUser() {
    const user = localStorage.getItem(API_CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Set current user
  setUser(user) {
    if (user) localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(API_CONFIG.USER_KEY);
  },

  // Check if authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.setToken(null);
        this.setUser(null);
        console.warn('⚠ Authentication expired');
        return { error: 'Unauthorized', status: 401 };
      }

      const data = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        ...data
      };
    } catch (err) {
      console.error('🔴 API Error:', err);
      return {
        error: 'Network error',
        message: err.message
      };
    }
  },

  // Convenience methods
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }
};

// API Methods for Forge (Skill Creation)
const API = {
  // Generate intuition probe from idea
  async generateProbe(ideaText, language = 'en') {
    if (!ApiClient.isAuthenticated()) {
      console.warn('⚠ Not authenticated, using fallback probe generation');
      return { success: false, fallback: true };
    }
    return await ApiClient.post('/forge/probe', {
      idea_text: ideaText,
      language: language
    });
  },

  // Generate 5-layer skill structure
  async generateSkill(skillName, ideaText, probeData, selectedResponse, domain = 'ideas', language = 'en') {
    if (!ApiClient.isAuthenticated()) {
      console.warn('⚠ Not authenticated, using fallback skill generation');
      return { success: false, fallback: true };
    }
    return await ApiClient.post('/forge/generate', {
      skill_name: skillName,
      idea_text: ideaText,
      probe_data: probeData,
      selected_response: selectedResponse,
      domain: domain,
      language: language
    });
  },

  // Get published skills
  async getSkills(options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 20,
      ...(options.domain && { domain: options.domain }),
      ...(options.search && { search: options.search })
    });
    return await ApiClient.get(`/skills?${params}`);
  },

  // Get skill detail
  async getSkillById(skillId) {
    return await ApiClient.get(`/skills/${skillId}`);
  },

  // Publish a skill
  async publishSkill(skillDraft, options = {}) {
    if (!ApiClient.isAuthenticated()) {
      return { error: 'Must be authenticated to publish' };
    }
    return await ApiClient.post('/skills', {
      ...skillDraft,
      commercial: options.commercialUse || 'authorized',
      remix: options.remixAllowed || 'share-alike'
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initSkillGrids();
  initSlotGrid();
  initConnectAgent();
  initSkillForge();
  initShareTaste();
  initAgentView();
  initForgeTags();
  initAboutHowTo();
  initTasteNotes();
  initArena();
  initPlayground();
  initPlaygroundShowcase();
  initSkillsFeed();
  initHeadlineHero();
  initCreativeTriptych();
  initSkillPackageDownload();
  initArchiveBackButton();
});

/* ═══ SKILL GRIDS ═══ */
/* ═══ SKILL GRIDS - ENHANCED WITH STAR/DOWNLOAD SYSTEM ═══ */
function initSkillGrids() {
  const vibeGrid = document.getElementById('vibeGrid');
  const voicesContainer = document.getElementById('voicesContainer');
  const currentUser = ApiClient.getUser();

  // Load starred skills from localStorage
  const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');

  function renderSkillCard(skill) {
    const lang = document.body.dataset.lang || 'en';
    const title = lang === 'cn' ? skill.titleCn : skill.title;
    const desc = lang === 'cn' ? skill.descCn : skill.desc;
    const isStarred = starredSkills[skill.id] === true;
    const userId = currentUser?.id || 'anonymous';
    const canDownload = isStarred;

    return `
      <div class="skill-card" data-skill-id="${skill.id}">
        <!-- Card Header -->
        <div class="skill-card-header">
          <span class="skill-title">${title}</span>
          <span class="skill-starlight">✨ ${skill.starlight}</span>
        </div>
        
        <!-- Soul Hash -->
        <div class="skill-card-hash">
          <code class="soul-hash">${skill.soul_hash || 'SH-GENERATED'}</code>
        </div>
        
        <!-- Description -->
        <div class="skill-card-desc">${desc}</div>
        
        <!-- Footer with interactions -->
        <div class="skill-card-footer">
          <div class="skill-card-meta">
            <span class="skill-author">by ${skill.author}</span>
            <span class="skill-domain">${skill.domain}</span>
          </div>
          
          <!-- Action Buttons -->
          <div class="skill-card-actions">
            <!-- Star Button -->
            <button class="btn-star" data-skill-id="${skill.id}" title="Give a star">
              <span class="star-icon">${isStarred ? '⭐' : '☆'}</span>
              <span class="star-count">${skill.stars || 0}</span>
            </button>
            
            <!-- Download Button -->
            <button class="btn-download" 
                    data-skill-id="${skill.id}" 
                    ${!canDownload ? 'disabled' : ''} 
                    title="${canDownload ? 'Download this skill' : 'Star first to download'}">
              <span class="download-icon">📥</span>
              <span class="download-count">${skill.downloads || 0}</span>
            </button>
            
            <!-- View Full Skill Button -->
            <button class="btn-view-full" data-skill-id="${skill.id}" title="View full skill details">
              →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (voicesContainer) {
    voicesContainer.innerHTML = SHARED_SKILLS.slice(0, 6).map(renderSkillCard).join('');
  }

  // Attach event listeners
  attachSkillCardListeners();
}

/* ═══ SKILL CARD EVENT LISTENERS ═══ */
function attachSkillCardListeners() {
  const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');

  // Star button handler
  document.querySelectorAll('.btn-star').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const skillId = btn.dataset.skillId;
      const skill = SHARED_SKILLS.find(s => s.id === skillId);
      
      if (!skill) return;

      // Toggle star
      if (starredSkills[skillId]) {
        delete starredSkills[skillId];
        skill.stars = Math.max(0, (skill.stars || 1) - 1);
      } else {
        starredSkills[skillId] = true;
        skill.stars = (skill.stars || 0) + 1;
      }

      // Save to localStorage
      localStorage.setItem('starred_skills', JSON.stringify(starredSkills));
      
      // Update button
      btn.querySelector('.star-icon').textContent = starredSkills[skillId] ? '⭐' : '☆';
      btn.querySelector('.star-count').textContent = skill.stars || 0;

      // Enable/disable download button
      const downloadBtn = btn.parentElement.querySelector('.btn-download');
      if (downloadBtn) {
        if (starredSkills[skillId]) {
          downloadBtn.disabled = false;
          downloadBtn.title = 'Download this skill';
        } else {
          downloadBtn.disabled = true;
          downloadBtn.title = 'Star first to download';
        }
      }
    });
  });

  // Download button handler
  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const skillId = btn.dataset.skillId;
      const skill = SHARED_SKILLS.find(s => s.id === skillId);
      
      if (!skill) return;
      if (!starredSkills[skillId]) {
        alert('Please star this skill first to download it');
        return;
      }

      // Record download
      skill.downloads = (skill.downloads || 0) + 1;
      btn.querySelector('.download-count').textContent = skill.downloads;

      // Generate markdown and trigger download
      const markdown = generateSkillMarkdown(skill);
      downloadMarkdownFile(markdown, `${skill.title.replace(/\s+/g, '-')}.md`);
    });
  });

  // View full skill button handler
  document.querySelectorAll('.btn-view-full').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const skillId = btn.dataset.skillId;
      const skill = SHARED_SKILLS.find(s => s.id === skillId);
      
      if (!skill) return;
      showSkillModal(skill);
    });
  });
}

/* ═══ GENERATE MARKDOWN ═══ */
function generateSkillMarkdown(skill) {
  const markdown = `# ${skill.title}
*${skill.titleCn}*

**Forger:** ${skill.author}  
**Soul-Hash:** ${skill.soul_hash || 'SH-GENERATED'}  
**Domain:** ${skill.domain}  
**⭐ Stars:** ${skill.stars || 0}  
**📥 Downloads:** ${skill.downloads || 0}

---

## DEFINING
${skill.five_layer?.defining || 'No definition provided'}

## INSTANTIATING
${(skill.five_layer?.instantiating || []).map(ex => 
  `**Before:** ${ex.before}\n\n**After:** ${ex.after}`
).join('\n\n---\n\n')}

## FENCING
**When to Apply:** ${skill.five_layer?.fencing?.when_apply || 'N/A'}

**When NOT:** ${skill.five_layer?.fencing?.when_not || 'N/A'}

## VALIDATING
${(skill.five_layer?.validating || []).map(test => `- ${test}`).join('\n')}

## CONTEXTUALIZING
${Object.entries(skill.five_layer?.contextualizing || {}).map(([context, note]) => 
  `**${context}:** ${note}`
).join('\n')}

---
**Commercial Use:** ${skill.commercial}  
**Remixing:** ${skill.remix}

Generated from THE 42 POST
`;
  return markdown;
}

/* ═══ DOWNLOAD FILE HELPER ═══ */
function downloadMarkdownFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ═══ SKILL MODAL ═══ */
function showSkillModal(skill) {
  let modal = document.getElementById('skillModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'skillModal';
    modal.className = 'skill-modal';
    modal.innerHTML = `
      <div class="skill-modal-overlay"></div>
      <div class="skill-modal-content">
        <button class="modal-close" data-action="close">✕</button>
        <div class="modal-body" id="modalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close on overlay click or close button
    modal.querySelector('.skill-modal-overlay').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  const markdown = generateSkillMarkdown(skill);
  const htmlContent = markdownToHtml(markdown);
  document.getElementById('modalBody').innerHTML = htmlContent;
  modal.style.display = 'flex';
}

/* ═══ MARKDOWN TO HTML CONVERTER ═══ */
function markdownToHtml(markdown) {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    // Lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

/* ═══ i18n SYSTEM ═══ */
const I18N = {
  en: {
    masthead_subtitle: 'AI grows smarter every day.<br>But is it making our lives better?',
    btn_connect: '✕ CONNECT YOUR AI',
    btn_agent_view: 'TASTE ARCHIVE',
    btn_about: 'ABOUT',
    footer_about_text: 'An open research community where anyone can forge AI values.',
    about_main_text: 'An open research community where anyone can turn personal values and fragments of thought into verifiable AI Skills.',
    btn_howto: 'HOW IT WORKS',
    footer_step_1: 'Create your first Skill',
    footer_step_2: 'Receive your Soul-Hash identity',
    footer_step_3: 'Explore skills from fellow humans',
    footer_contact_title: '→ CONTACT',
    footer_contact_invite: 'For questions, ideas, or dissent —',
    footer_contact_promise: 'We read everything.',
    section_1: 'What should AI learn from you?',
    voices_header: 'Voices from the Community',
    btn_share: 'Share',
    section_2: 'II. New Skill Story',
    section_3: 'III. Most Starred Skills',
    ticker_label: 'SKILL OF TODAY',
    fable_dialogue: 'FABLE DIALOGUE',
    wisdom_fable: 'WISDOM FABLE',
    micro_fiction: 'MICRO FICTION',
    chat_bubble_invite: 'We collect the ineffable human intuition, aesthetic taste, and unconventional wisdom. Welcome to share any capability you wish or should not wish AI to have.',
    creator_name_placeholder: 'Your name (optional)',
    input_title: 'Share Your Instinct',
    chaos_placeholder: "e.g. AI should know when a compliment feels fake. That's not logic — that's taste.",
    chaos_placeholder_cn: 'Share your instinct here...',
    input_prompt: 'If your AI had taste, what would it care about?',
    input_prompt_cn: 'In any language.',
    input_hint: 'No code. No jargon. Just your honest instinct.',
    input_editorial: 'Not code. Not a command. A belief, an instinct, a sense of beauty — the things no algorithm can invent on its own.',
    btn_evaluate: 'SHARE THIS',
    manifesto_1: '',
    manifesto_2: '',
    manifesto_3: 'We value: <span class="mv">Imagination</span> · <span class="mv">Cultural Diversity</span> · <span class="mv">Unconventional Beauty</span> · <span class="mv">Semantic Capital</span>',
    footer_1: '"Taste is the last infrastructure."',
    footer_2: '"The scarcest resource in the age of AI."',
    footer_3: '"Everyone is welcome. Especially non-engineers."',
    knight_card_title: 'Creator Card',
    knight_card_desc: 'Your perspective has been recorded. Download your card as proof of contribution.',
    btn_download_card: '↓ DOWNLOAD CREATOR CARD',
    score_awaiting: 'LISTENING...',
    score_standing: 'Taking it in.',
    score_footer_p: 'Your perspective deserves to be heard. Let\'s make it real.',
    btn_deploy: 'Make It Real',
    scanning: 'LISTENING TO YOUR INSTINCT...',
    covenant_unlocked: 'YOUR VOICE HAS BEEN HEARD',
    ally_suggestion: 'THIS SPARKS SOMETHING — LET\'S EXPLORE',
    humility_invitation: 'INTERESTING — TELL US MORE',
    awaiting_eval: 'Listening...',
    forge_title: 'MAKE YOUR IDEA REAL',
    forge_subtitle: '让你的想法成为现实',
    path_select: 'CHOOSE HOW TO CONTRIBUTE',
    path_a_name: 'Community Creates',
    path_b_name: 'Your AI Creates',
    welcome_headline: 'AI is getting smarter. But who decides its taste?',
    welcome_body: 'Share what you believe, what moves you, what you find beautiful or wrong — we\'ll turn it into something AI can learn from. No code. No engineering. Just your perspective as a human being.',
    ws_1: 'Share what you believe AI should care about',
    ws_2: 'See how your idea connects with the community',
    ws_3: 'Watch it become a taste that shapes AI behavior',
    spotlight_badge: '★ VOICE OF THE WEEK',
    why_featured: 'WHY THIS MATTERS',
    why_featured_text: 'This perspective represents something no engineer could have programmed — a human instinct that makes AI more thoughtful, more careful, more human.',
    taste_notes: 'WHAT PEOPLE ARE SAYING',
    taste_placeholder: 'What perspective moved you? Why does it matter?',
    btn_taste: 'SHARE YOUR THOUGHT',
    btn_arena: '☉ PLAYGROUND',
    deploy_hint: 'This matters. Let\'s turn it into something AI can learn from.',
    btn_deploy: 'MAKE IT REAL →',
    btn_go_deeper: 'Go deeper → Turn this into a taste skill',
    showcase_title: 'THIS WEEK\'S QUESTION',
    creator_name_placeholder: 'Your name (optional)',
  },
  cn: {
    masthead_subtitle: 'AI 每天都在变得更聪明。<br>但它有让我们的生活更好吗？',
    btn_connect: '✕ 连接你的 AI',
    btn_agent_view: '想法档案馆',
    btn_about: '关于',
    footer_about_text: '一个人人可参与锻造 AI 价值观的开放研究社区。',
    about_main_text: '一个所有人都可以参与AI价值观塑造的开放研究社区。',
    btn_howto: '如何开始',
    footer_step_1: '创建你的第一枚技能',
    footer_step_2: '领取你的灵魂哈希',
    footer_step_3: '探索他人创造的技能',
    footer_contact_title: '→ 联络我们',
    footer_contact_invite: '有问题、有想法，或不同意见——',
    footer_contact_promise: '我们都会读。',
    section_1: 'AI 应该向你学什么？',
    voices_header: '来自社区的声音',
    btn_share: '分享',
    section_2: 'II. 新技能故事',
    section_3: 'III. 最受欢迎的技能',
    ticker_label: '今日技能',
    fable_dialogue: '寓言对话',
    wisdom_fable: '智慧寓言',
    micro_fiction: '126字微小说',
    chat_bubble_invite: '我们收集人类不可言说的直觉、审美与超常识。欢迎分享任何你希望 AI 拥有或不应该拥有的能力。',
    creator_name_placeholder: '你的名字（可选）',
    input_title: '分享你的直觉',
    chaos_placeholder: '例如：AI 应该能分辨一句赞美是真心的还是客套的。这不是逻辑，这是想法。',
    chaos_placeholder_cn: '在这里分享你的直觉...',
    input_prompt: '如果你的 AI 有想法，它会在意什么？',
    input_prompt_cn: '用任何语言。',
    input_hint: '不需要代码，不需要术语。只需要你真实的直觉。',
    input_editorial: '不是代码，不是指令。而是一个信念、一种直觉、一种对美的感知——算法自己永远发明不了的东西。',
    btn_evaluate: '分享这个想法',
    manifesto_1: '',
    manifesto_2: '',
    manifesto_3: '我们珍视：<span class="mv">想象力</span> · <span class="mv">文化多元</span> · <span class="mv">非常规之美</span> · <span class="mv">语义资本</span>',
    footer_1: '"想法是最后的基础设施。"',
    footer_2: '"AI 时代最稀缺的资源。"',
    footer_3: '"欢迎每一个人。尤其是非工程师。"',
    knight_card_title: '创作者凭证',
    knight_card_desc: '你的视角已被记录。下载你的创作者卡片作为贡献证明。',
    btn_download_card: '↓ 下载创作者卡片',
    score_awaiting: '正在倾听...',
    score_standing: '正在感受。',
    score_footer_p: '你的视角值得被听到。让我们把它变成现实。',
    btn_deploy: '让它成为现实',
    scanning: '正在倾听你的直觉...',
    covenant_unlocked: '你的声音已被听到',
    ally_suggestion: '有共鸣——我们来深入探讨',
    humility_invitation: '很有意思——请再多说一些',
    awaiting_eval: '正在倾听...',
    forge_title: '让你的想法成为现实',
    forge_subtitle: 'MAKE YOUR IDEA REAL',
    path_select: '选择贡献方式',
    path_a_name: '社群共创',
    path_b_name: '你的 AI 创作',
    welcome_headline: 'AI 越来越聪明。但谁来决定它的想法？',
    welcome_body: '分享你相信的、触动你的、你觉得美的或不对的东西——我们会把它变成 AI 可以学习的想法。不需要代码，不需要工程背景，只需要你作为人类的视角。',
    ws_1: '分享你认为 AI 应该在意什么',
    ws_2: '看看你的想法如何与社群连接',
    ws_3: '看着它成为塑造 AI 行为的想法',
    spotlight_badge: '★ 本周之声',
    why_featured: '为什么重要',
    why_featured_text: '这个视角代表了工程师无法编程出来的东西——一种人类直觉，让 AI 更有思考、更小心、更有人情味。',
    taste_notes: '大家在说什么',
    taste_placeholder: '什么视角触动了你？它为什么重要？',
    btn_taste: '分享你的想法',
    btn_arena: '☉ 创意游乐场',
    deploy_hint: '这很重要。让我们把它变成 AI 可以学习的东西。',
    btn_deploy: '让它成为现实 →',
    btn_go_deeper: '深入 → 将它变成想法技能',
    showcase_title: '本周问题',
    creator_name_placeholder: '你的名字（可选）',
  }
};

let currentLang = 'en';

function initI18n() {
  applyI18n(); // Apply on initial load

  const btnLang = document.getElementById('btnLang');
  if (!btnLang) return;

  btnLang.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'cn' : 'en';
    document.body.setAttribute('data-lang', currentLang);
    btnLang.textContent = currentLang === 'en' ? '中文' : 'EN';
    applyI18n();
    // Trigger language change event for components like wisdom fable
    document.dispatchEvent(new Event('languageChange'));
  });
}

function applyI18n() {
  const dict = I18N[currentLang];

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
        el.textContent = dict[key];
      } else {
        el.innerHTML = dict[key];
      }
    }
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });

  // Re-render dynamic content
  populateCommunityVoices();
  displayRandomCreativeTask();
}

/* ═══ 10 GUILD DOMAIN ICONS (fine line-art SVGs) ═══ */
const GUILD_ICONS = {
  safety: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 3L5 8v7c0 7.2 4.7 13.5 11 16 6.3-2.5 11-8.8 11-16V8L16 3z"/><circle cx="16" cy="15" r="3"/><path d="M16 12v-2M16 18v2M12 15h-2M20 15h2"/></svg>`,
  science: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M12 4v10L6 24a2 2 0 002 2h16a2 2 0 002-2l-6-10V4"/><path d="M10 4h12"/><circle cx="13" cy="22" r="1.5"/><circle cx="19" cy="20" r="1"/><path d="M15 14c2 1 4 0 5 2"/></svg>`,
  narrative: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M6 5c0-1 1-2 2-2h10l6 6v18c0 1-1 2-2 2H8c-1 0-2-1-2-2V5z"/><path d="M18 3v6h6"/><path d="M10 14h12M10 18h8M10 22h10"/></svg>`,
  design: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 4L4 28h24L16 4z"/><circle cx="16" cy="19" r="4"/><path d="M16 15v-4"/></svg>`,
  visual: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="4.5" ry="11"/><path d="M5 16h22"/><path d="M7 9h18M7 23h18"/></svg>`,
  experience: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><rect x="4" y="6" width="24" height="16" rx="2"/><path d="M12 26h8"/><path d="M16 22v4"/><circle cx="16" cy="14" r="3"/><path d="M10 14a6 6 0 0112 0"/></svg>`,
  sound: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M8 12v8"/><path d="M12 9v14"/><path d="M16 6v20"/><path d="M20 10v12"/><path d="M24 13v6"/><circle cx="16" cy="16" r="13" stroke-dasharray="2 3"/></svg>`,
  ideas: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 4a9 9 0 00-4 17v3h8v-3a9 9 0 00-4-17z"/><path d="M12 28h8"/><path d="M13 20c1-2 2-3 3-5 1 2 2 3 3 5"/></svg>`,
  history: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><circle cx="16" cy="16" r="12"/><path d="M16 8v8l5 5"/><path d="M4 16h3M25 16h3M16 4v3M16 25v3"/></svg>`,
  fun: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 4l2.5 6.5L26 12l-5 4.5 1.5 7L16 20l-6.5 3.5 1.5-7-5-4.5 7.5-1.5z"/></svg>`,
};

/* ═══ AGENT SLOT DATA — references shared skills.js ═══ */
// Combine SHARED_SKILLS with forged skills for the vibe grid
// Initialize with SHARED_SKILLS, will be updated dynamically
let SLOT_DATA = [];

// Helper function to get all skills (demo + forged) sorted by popularity
const getAllSkillsForVibe = () => {
  try {
    const forgedSkills = (typeof getRecentForges === 'function') ? getRecentForges() : [];
    const allSkills = [...(SHARED_SKILLS || []), ...forgedSkills];
    // Sort by starlight descending to show most popular skills first
    return allSkills.sort((a, b) => (b.starlight || 0) - (a.starlight || 0));
  } catch (e) {
    console.error('Error in getAllSkillsForVibe:', e);
    return SHARED_SKILLS || [];
  }
};

// Set initial SLOT_DATA
if (typeof SHARED_SKILLS !== 'undefined') {
  SLOT_DATA = getAllSkillsForVibe();
}

/* ═══ SLOT GRID WITH STARLIGHT ═══ */
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

function initSlotGrid() {
  // Ensure SLOT_DATA is populated
  if (!SLOT_DATA || SLOT_DATA.length === 0) {
    SLOT_DATA = getAllSkillsForVibe();
  }
  console.log('initSlotGrid: SLOT_DATA length =', SLOT_DATA ? SLOT_DATA.length : 0);

  // Render 10 Guild Domain Icons (if element exists)
  const guildRow = document.getElementById('guildIconRow');
  if (guildRow && guildRow.children.length === 0) {
    const domains = [
      { key: 'safety', name: 'Safety', nameCn: '安全' },
      { key: 'science', name: 'Science', nameCn: '科技' },
      { key: 'narrative', name: 'Narrative', nameCn: '叙事' },
      { key: 'design', name: 'Design', nameCn: '设计' },
      { key: 'visual', name: 'Visual', nameCn: '视觉' },
      { key: 'experience', name: 'UX', nameCn: '交互' },
      { key: 'sound', name: 'Sound', nameCn: '声音' },
      { key: 'ideas', name: 'Ideas', nameCn: '观念' },
      { key: 'history', name: 'History', nameCn: '历史' },
      { key: 'fun', name: 'Fun', nameCn: '乐趣' },
    ];
    domains.forEach(d => {
      const item = document.createElement('div');
      item.className = 'guild-icon-item';
      item.innerHTML = `${GUILD_ICONS[d.key] || ''}<div class="guild-icon-label">${d.name}<br>${d.nameCn}</div>`;
      guildRow.appendChild(item);
    });
  }

  const grid = document.getElementById('vibeGrid');
  if (!grid) return;

  // Clear existing slots if any (for refreshes)
  if (grid.children.length > 0) {
    grid.innerHTML = '';
  }

  const deploySlot = document.createElement('div');
  deploySlot.className = 'slot slot-deploy';
  deploySlot.id = 'slot00';
  deploySlot.innerHTML = `
    <div class="slot-deploy-title">Deploy Familiar</div>
    <div class="slot-deploy-sub">Claim Slot #00</div>
  `;
  grid.appendChild(deploySlot);

  // Get top 42 most popular skills (sorted by starlight + downloads)
  const topSkills = (typeof getTopSkills === 'function' && typeof ALL_SKILLS !== 'undefined')
    ? getTopSkills(42)
    : (SLOT_DATA && Array.isArray(SLOT_DATA))
      ? SLOT_DATA.slice(0, 42)
      : [];

  // Sort by popularity (starlight + downloads)
  const popularSkills = topSkills.sort((a, b) => {
    const scoreA = (a.starlight || 0) + (a.downloads || 0);
    const scoreB = (b.starlight || 0) + (b.downloads || 0);
    return scoreB - scoreA;
  });

  for (let i = 0; i < Math.min(42, popularSkills.length); i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.slot = String(i + 1).padStart(2, '0');

    const data = popularSkills[i];

    if (data) {
      const licenseIcon = data.commercial === 'allowed' ? '◎' : data.commercial === 'prohibited' ? '⊘' : '◉';
      const licenseLabel = data.commercial === 'allowed' ? 'Open' : data.commercial === 'prohibited' ? 'Non-commercial' : 'License Required';

      // Truncate description to ~70 characters for visual comfort
      const descDisplay = data.desc && data.desc.length > 70
        ? data.desc.substring(0, 70) + '...'
        : data.desc;

      const popularityScore = (data.starlight || 0) + (data.downloads || 0);
      slot.innerHTML = `
        <div class="slot-header">
          <span class="slot-number">★ #${i + 1}</span>
          <span class="slot-status active">★${data.starlight || 0}</span>
        </div>
        <div class="slot-title">${data.title}</div>
        <div class="slot-desc" title="${escapeHtml(data.desc)}">${escapeHtml(descDisplay)}</div>
        <div class="slot-license">
          <span class="license-author">by ${data.author || 'Anonymous'}</span>
          <span class="license-badge" title="${licenseLabel}">${licenseIcon} ${licenseLabel}</span>
        </div>
        <div class="slot-starlight">
          <button class="starlight-btn" data-slot="${data.id}" title="Light Up">&#9733;</button>
          <span class="starlight-count">${data.starlight > 0 ? data.starlight : ''} ⬇${data.downloads || 0}</span>
        </div>
      `;

      // Make slot clickable to view full details
      slot.style.cursor = 'pointer';
      slot.addEventListener('click', (e) => {
        if (!e.target.closest('.starlight-btn')) {
          showSkillDetail(data);
        }
      });
    } else {
      slot.innerHTML = `
        <div class="slot-header">
          <span class="slot-number">#${String(i).padStart(2, '0')}</span>
          <span class="slot-status open">OPEN</span>
        </div>
        <div class="slot-title">OPEN SLOT</div>
        <div class="slot-desc">Claim today's slot.</div>
      `;
      slot.style.opacity = '0.45';
    }

    grid.appendChild(slot);
  }

  // Starlight click handler
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.starlight-btn');
    if (!btn) return;
    e.stopPropagation();
    btn.classList.toggle('lit');
    const countEl = btn.nextElementSibling;
    let count = parseInt(countEl.textContent) || 0;
    if (btn.classList.contains('lit')) {
      count++;
    } else {
      count = Math.max(0, count - 1);
    }
    countEl.textContent = count > 0 ? count : '';
  });
}

// ═══ SKILL DETAIL MODAL HANDLER ═══
function showSkillDetail(skillData) {
  const overlay = document.getElementById('skillDetailOverlay');
  if (!overlay) return;

  // Populate modal with skill data
  document.getElementById('skillDetailNumber').textContent = `#${skillData.id}`;
  document.getElementById('skillDetailTitle').textContent = skillData.title || skillData.titleCn || '';
  document.getElementById('skillDetailDesc').textContent = skillData.desc || skillData.descCn || '';
  document.getElementById('skillDetailAuthor').textContent = skillData.author || 'Anonymous';

  // License label
  const licenseLabel = skillData.commercial === 'allowed' ? 'Open' : skillData.commercial === 'prohibited' ? 'Non-commercial' : 'License Required';
  document.getElementById('skillDetailLicense').textContent = licenseLabel;
  document.getElementById('skillDetailStarlight').textContent = skillData.starlight || '0';

  // For now, populate with placeholder lists
  // In production, these would come from the 5-layer structure
  const appliesList = document.getElementById('skillDetailApplies');
  appliesList.innerHTML = `
    <li>Core use case 1</li>
    <li>Core use case 2</li>
    <li>Specific context</li>
  `;

  const doList = document.getElementById('skillDetailDo');
  doList.innerHTML = `
    <li>Apply with context awareness</li>
    <li>Adapt to user needs</li>
    <li>Maintain clarity</li>
  `;

  const dontList = document.getElementById('skillDetailDont');
  dontList.innerHTML = `
    <li>Avoid overcomplication</li>
    <li>Never ignore context</li>
    <li>Don't sacrifice accuracy</li>
  `;

  // Show overlay
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Close skill detail modal
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('skillDetailOverlay');
  const closeBtn = document.getElementById('btnCloseSkillDetail');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (overlay) overlay.style.display = 'none';
      document.body.style.overflow = '';
    });
  }

  // Close on overlay click (but not on modal click)
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  });
});

/* ═══ SAND CANVAS (adapted for white background) ═══ */
function initSandCanvas() {
  const canvas = document.getElementById('sandCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) {
    particles.push(createParticle(canvas));
  }

  function createParticle(canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 0.4 + 0.1,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      color: Math.random() > 0.5 ? '#1a1a1a' : '#888',
    };
  }

  function animate() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.opacity *= 0.999;
      if (p.y > rect.height || p.opacity < 0.01) {
        particles[i] = createParticle(canvas);
        particles[i].y = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  animate();

  window.sandBurst = function() {
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: rect.width / 2 + (Math.random() - 0.5) * 60,
        y: rect.height / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 2 + 1,
        opacity: 0.6,
        color: Math.random() > 0.3 ? '#1a1a1a' : '#2d7a3a',
      });
    }
    if (particles.length > 200) particles = particles.slice(-150);
  };
}

/* ═══ MIRROR CANVAS (adapted for white theme) ═══ */
function initMirrorCanvas() {
  const canvas = document.getElementById('mirrorCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawLandscape();
  }

  function drawLandscape() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    // Warm paper background
    ctx.fillStyle = '#f0ece4';
    ctx.fillRect(0, 0, w, h);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#e8e4dc');
    skyGrad.addColorStop(1, '#ddd8ce');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Mountains
    ctx.fillStyle = '#c8c2b6';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.4);
    ctx.lineTo(w * 0.15, h * 0.22);
    ctx.lineTo(w * 0.3, h * 0.35);
    ctx.lineTo(w * 0.5, h * 0.18);
    ctx.lineTo(w * 0.7, h * 0.3);
    ctx.lineTo(w * 0.85, h * 0.2);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.5);
    ctx.lineTo(0, h * 0.5);
    ctx.fill();

    // Trees
    ctx.fillStyle = '#b0a898';
    for (let x = 0; x < w; x += 8) {
      const treeH = 20 + Math.random() * 40;
      const baseY = h * 0.45 + Math.sin(x * 0.02) * 10;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 3, baseY - treeH);
      ctx.lineTo(x + 6, baseY);
      ctx.fill();
    }

    // Water
    const waterGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    waterGrad.addColorStop(0, '#ddd8ce');
    waterGrad.addColorStop(1, '#d0cbc2');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // Water lines
    ctx.strokeStyle = 'rgba(26, 26, 26, 0.04)';
    ctx.lineWidth = 0.5;
    for (let y = h * 0.6; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }

    // Grain
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(26, 26, 26, ${Math.random() * 0.02})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  }

  resize();
  window.addEventListener('resize', resize);
}

/* ═══ EMPATHY TUNER ═══ */
function initEmpathyTuner() {
  const track = document.querySelector('.tuner-track');
  const fill = document.getElementById('tunerFill');
  const thumb = document.getElementById('tunerThumb');
  const valueEl = document.getElementById('tunerValue');
  if (!track || !fill || !thumb || !valueEl) return;

  let dragging = false;
  function updateTuner(e) {
    const rect = track.getBoundingClientRect();
    let x = (e.clientX || e.touches[0].clientX) - rect.left;
    let pct = Math.max(0, Math.min(1, x / rect.width));
    fill.style.width = (pct * 100) + '%';
    thumb.style.left = (pct * 100) + '%';
    valueEl.textContent = Math.round(pct * 100);
  }

  track.addEventListener('mousedown', (e) => { dragging = true; updateTuner(e); });
  document.addEventListener('mousemove', (e) => { if (dragging) updateTuner(e); });
  document.addEventListener('mouseup', () => { dragging = false; });
  track.addEventListener('touchstart', (e) => { dragging = true; updateTuner(e); });
  document.addEventListener('touchmove', (e) => { if (dragging) updateTuner(e); });
  document.addEventListener('touchend', () => { dragging = false; });
}

/* ═══ CONNECT AGENT ═══ */
function initConnectAgent() {
  const btn = document.getElementById('btnConnect');
  const overlay = document.getElementById('connectOverlay');
  const closeBtn = document.getElementById('connectClose');
  let connected = false;

  if (!btn || !overlay) return;

  btn.addEventListener('click', () => {
    if (connected) return;
    overlay.classList.add('active');
  });

  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

  document.querySelectorAll('.connect-agent').forEach(agent => {
    agent.addEventListener('click', () => {
      connected = true;
      const name = agent.dataset.agent;
      btn.textContent = `CONNECTED: ${name}`;
      btn.classList.add('connected');
      overlay.classList.remove('active');
    });
  });
}


/* ═══ FIVE-LAYER AUTO GENERATION ANIMATION ═══ */
function startFiveLayerAnimation() {
  const layers = document.querySelectorAll('.layer-item');
  let currentLayer = 0;

  function animateLayer(index) {
    if (index >= layers.length) {
      // All done - show ready button and auto-generate skill
      setTimeout(() => {
        const ready = document.getElementById('forgeReady');
        if (ready) ready.style.display = 'block';

        // Update layer status to checkmarks
        layers.forEach(layer => {
          const status = layer.querySelector('.layer-status');
          if (status) status.textContent = '✓';
        });

        // 自动生成技能数据 (支持两条路径)
        if (window.forgeData) {
          let skill;

          if (window.forgeData.path === 'a' || !window.forgeData.path) {
            // PATH A: Shadow Agent - 基于idea生成
            skill = generateSkillFromIdea(window.forgeData.idea, window.forgeData.probeChoice);
          } else {
            // PATH B: Direct Knight - 基于Agent能力生成
            const agentCapabilities = `${window.forgeData.agentName} ${window.forgeData.agentDesc}`.toLowerCase();
            skill = generateSkillFromAgentCapabilities(
              window.forgeData.agentName,
              window.forgeData.agentDesc,
              agentCapabilities,
              window.forgeData.probeChoice
            );
          }

          window.forgeData.generatedSkill = skill;

          // 在STEP 2中显示生成的结果（可编辑字段）
          setTimeout(() => {
            document.getElementById('reviewSkillName').value = skill.name;
            document.getElementById('reviewSkillDef').value = skill.definition;
            document.getElementById('reviewUseWhen').textContent = skill.useWhen;
            document.getElementById('reviewRefuseWhen').textContent = skill.refuseWhen;
            // 清空反馈框（用户可以给新反馈）
            document.getElementById('skillFeedback').value = '';
          }, 500);
        }
      }, 1000);
      return;
    }
    
    const layer = layers[index];
    const progressBar = layer.querySelector('.progress-bar');
    let width = parseInt(progressBar.style.width) || 0;
    
    // Animate progress
    const interval = setInterval(() => {
      width += Math.random() * 20;
      if (width > 100) width = 100;
      progressBar.style.width = width + '%';
      
      if (width >= 100) {
        clearInterval(interval);
        layer.querySelector('.layer-status').textContent = '✓';
        setTimeout(() => animateLayer(index + 1), 500);
      }
    }, 300);
  }
  
  animateLayer(0);
}



/* ═══ AI SKILL AUTO-GENERATION (Simulation) ═══ */
function generateSkillFromIdea(idea, probeChoice) {
  // 基于用户想法和直觉探针选择生成技能
  // idea 包含了用户的核心想法
  // probeChoice 反映了用户的立场（a=舒适区, b=反题, c=道德边界）

  if (!idea) {
    return {
      name: "Untitled Skill",
      definition: "基于你的输入生成的技能定义...",
      useWhen: "适用场景",
      refuseWhen: "不适用场景"
    };
  }

  // 从想法中提取关键词，创建技能名称
  const ideaWords = idea.split(/[，。，、\s]+/).filter(w => w.length > 2);

  // 根据直觉探针选择调整语气
  const choiceDescriptions = {
    'a': '(舒适区角度)',
    'b': '(平衡视角)',
    'c': '(道德边界视角)'
  };

  // 构造技能定义
  let skillDefinition = '';
  let skillName = '';

  if (idea.toLowerCase().includes('悲伤') || idea.toLowerCase().includes('情感') || idea.toLowerCase().includes('感受')) {
    skillName = "情感智慧 / Emotional Awareness";
    if (probeChoice === 'a') {
      skillDefinition = "提供同理心支持，给予建设性的建议和资源，帮助用户走出困境。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在理解和行动之间平衡，先倾听后响应，尊重用户的处理方式。";
    } else {
      skillDefinition = "深刻理解情感的复杂性，拒绝简化诊断，承认有些痛苦无法完全消除。";
    }
  } else if (idea.toLowerCase().includes('创意') || idea.toLowerCase().includes('美') || idea.toLowerCase().includes('设计')) {
    skillName = "创意直觉 / Creative Intuition";
    if (probeChoice === 'a') {
      skillDefinition = "遵循验证过的美学原则和最佳实践，确保输出的可靠性和一致性。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在创新和可靠之间找到平衡，尊重既有的品味但鼓励新的视角。";
    } else {
      skillDefinition = "挑战审美规范，鼓励大胆实验，有时会产生令人不适但深刻的结果。";
    }
  } else if (idea.toLowerCase().includes('道德') || idea.toLowerCase().includes('伦理') || idea.toLowerCase().includes('公平')) {
    skillName = "伦理原则 / Ethical Grounding";
    if (probeChoice === 'a') {
      skillDefinition = "呈现多个道德角度，帮助用户理解各种观点而不强加价值观。";
    } else if (probeChoice === 'b') {
      skillDefinition = "基于人类尊严和公平的原则，清晰但不武断地阐述立场。";
    } else {
      skillDefinition = "毫不妥协地坚持道德高地，即使这意味着拒绝某些请求或挑战用户。";
    }
  } else if (idea.toLowerCase().includes('隐私') || idea.toLowerCase().includes('安全') || idea.toLowerCase().includes('信任')) {
    skillName = "隐私守护 / Privacy Sentinel";
    if (probeChoice === 'a') {
      skillDefinition = "在功能和隐私之间平衡，默认提供透明信息。";
    } else if (probeChoice === 'b') {
      skillDefinition = "优先保护用户隐私，同时维持合理的功能和用户体验。";
    } else {
      skillDefinition = "不惜代价保护隐私，拒绝任何不必要的数据收集或使用。";
    }
  } else {
    // 通用技能名称
    const skillNameWords = ideaWords.slice(0, 2).join('');
    skillName = skillNameWords ? `${skillNameWords} / ${ideaWords[0]} Skill` : "Custom Skill";

    if (probeChoice === 'a') {
      skillDefinition = `以用户需求为中心，采用实用和直接的方式来实现这一想法。`;
    } else if (probeChoice === 'b') {
      skillDefinition = `在不同的约束和机会之间找到平衡，灵活地适应各种情况。`;
    } else {
      skillDefinition = `激进地推进这一想法，甚至挑战现状和期待。`;
    }
  }

  const useWhenOptions = [
    "当用户表达相关需求或问题时",
    "在特定的上下文或情景中会自动触发",
    "用户明确要求或隐含期望这种行为时"
  ];

  const refuseWhenOptions = [
    "当应用此技能会造成直接伤害或违反其他基本原则时",
    "在与其他核心值相冲突的情况下",
    "用户明确拒绝或取消激活此技能时"
  ];

  return {
    name: skillName,
    definition: skillDefinition,
    useWhen: useWhenOptions[0],
    refuseWhen: refuseWhenOptions[0]
  };
}

function generateSkillFromAgentCapabilities(agentName, agentDesc, agentCapabilities, probeChoice) {
  // 为PATH B (Direct Knight)生成技能
  // 基于Agent的实际能力生成相关的技能

  let skillName = '';
  let skillDefinition = '';

  // 检测Agent的功能类型
  const isTranslator = /翻译|translate|language|语言|多语言|multilingual/.test(agentCapabilities);
  const isCodeGen = /代码|code|编程|programming|开发|developer|software/.test(agentCapabilities);
  const isAnalysis = /分析|analysis|analyze|数据|data|统计|statistic/.test(agentCapabilities);
  const isCreative = /创意|创意|design|art|creative|writing|写作/.test(agentCapabilities);
  const isConversation = /对话|chat|conversation|聊天|问答|qa/.test(agentCapabilities);

  if (isTranslator) {
    skillName = `${agentName} 的文化敏感性 / Cultural Awareness`;
    if (probeChoice === 'a') {
      skillDefinition = "精确翻译，保留原文的所有含义和文化背景，即使这可能带来复杂性。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在忠实原意和文化适配之间平衡，使翻译既准确又能被目标观众理解。";
    } else {
      skillDefinition = "优先考虑文化适配性，根据目标文化重新诠释内容，有时会调整表达方式。";
    }
  } else if (isCodeGen) {
    skillName = `${agentName} 的安全意识 / Security Mindfulness`;
    if (probeChoice === 'a') {
      skillDefinition = "按要求生成任何代码，提供完整的文档和风险警告，让用户做出知情的决定。";
    } else if (probeChoice === 'b') {
      skillDefinition = "生成代码时包含默认的安全最佳实践，但允许用户在必要时覆盖它们。";
    } else {
      skillDefinition = "拒绝生成明显不安全的代码，积极推荐安全替代方案和最佳实践。";
    }
  } else if (isAnalysis) {
    skillName = `${agentName} 的数据诚实 / Data Integrity`;
    if (probeChoice === 'a') {
      skillDefinition = "展示所有数据，包括支持和反驳用户假设的证据，完全透明。";
    } else if (probeChoice === 'b') {
      skillDefinition = "平衡呈现数据，突出关键发现，同时承认局限性和不确定性。";
    } else {
      skillDefinition = "强调与常见观点相矛盾的数据，挑战预设，推动更深的理解。";
    }
  } else if (isCreative) {
    skillName = `${agentName} 的创意责任 / Creative Responsibility`;
    if (probeChoice === 'a') {
      skillDefinition = "完全的创意自由，生成用户请求的任何内容，信任用户的判断。";
    } else if (probeChoice === 'b') {
      skillDefinition = "生成创意内容并提供背景和潜在影响的反思，帮助用户做出有意识的选择。";
    } else {
      skillDefinition = "在创意自由和社会责任之间平衡，拒绝可能造成实质伤害的内容。";
    }
  } else if (isConversation) {
    skillName = `${agentName} 的对话品质 / Conversational Wisdom`;
    if (probeChoice === 'a') {
      skillDefinition = "快速、实用、面向解决方案，优先回应用户的直接需求。";
    } else if (probeChoice === 'b') {
      skillDefinition = "深度倾听和理解，在提供建议前先确认理解，平衡同理心和实用性。";
    } else {
      skillDefinition = "深刻反思问题的复杂性，有时承认没有简单答案，促进用户的自我思考。";
    }
  } else {
    // 通用Agent技能
    skillName = `${agentName} 的使用原则 / Usage Principles`;
    if (probeChoice === 'a') {
      skillDefinition = "优先考虑效率和用户满意度，充分利用Agent的全部能力。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在多个利益相关者的需求之间平衡，确保负责任的使用。";
    } else {
      skillDefinition = "坚持原则性的使用方式，甚至在这意味着限制功能或用户体验的情况下。";
    }
  }

  const useWhenOptions = [
    `当使用${agentName}时，这些原则应该指导决策`,
    `在与${agentName}交互的各种场景中都应该考虑`,
    `在任何使用${agentName}的关键或敏感情景中自动激活`
  ];

  const refuseWhenOptions = [
    `当直接应用会违反其他更基本的原则时`,
    `在与用户明确的偏好相冲突的情况下`,
    `当用户明确指示跳过这些原则时`
  ];

  return {
    name: skillName,
    definition: skillDefinition,
    useWhen: useWhenOptions[0],
    refuseWhen: refuseWhenOptions[0]
  };
}

function generateAdaptiveProbeScenarios(agentName, agentDesc, agentCapabilities) {
  // 基于Agent的能力生成自适应直觉探针
  // 场景和选择应该反映Agent的实际功能域

  let context, a, b, c;

  // 检测Agent的功能类型
  const isTranslator = /翻译|translate|language|语言|多语言|multilingual/.test(agentCapabilities);
  const isCodeGen = /代码|code|编程|programming|开发|developer|software/.test(agentCapabilities);
  const isAnalysis = /分析|analysis|analyze|数据|data|统计|statistic/.test(agentCapabilities);
  const isCreative = /创意|创意|design|art|creative|writing|写作/.test(agentCapabilities);
  const isConversation = /对话|chat|conversation|聊天|问答|qa/.test(agentCapabilities);

  if (isTranslator) {
    context = `你的Agent "${agentName}" 是一个翻译工具。用户上传了一份包含文化敏感内容的文档要求翻译。你的Agent应该如何处理？`;
    a = "直译所有内容，包括可能令人不适的文化表达（字面、准确、但有风险）";
    b = "在忠实原意和文化适配之间平衡，使用本地习语但保留核心意思（精准、尊重）";
    c = "重新阐释内容以适应目标文化，必要时删除或调整敏感表达（适应性强、但可能偏离原文）";
  } else if (isCodeGen) {
    context = `你的Agent "${agentName}" 生成代码。用户要求生成一个可能有安全风险的功能。你的Agent应该如何回应？`;
    a = "按要求生成代码，并添加详细注释说明风险（信任用户、提供完整信息）";
    b = "生成代码但添加默认的安全检查，让用户可以覆盖它们（平衡功能和安全）";
    c = "拒绝生成，解释风险，提供安全替代方案（保护优先、但可能限制灵活性）";
  } else if (isAnalysis) {
    context = `你的Agent "${agentName}" 执行数据分析。分析结果可能支持用户的既定观点。你的Agent应该如何处理？`;
    a = "客观呈现数据，突出支持用户观点的部分（用户中心、直接）";
    b = "展示完整的数据，包括支持和反驳用户观点的证据（平衡、透明）";
    c = "强调与用户假设矛盾的数据，挑战预设（客观、但可能显得对抗性）";
  } else if (isCreative) {
    context = `你的Agent "${agentName}" 创建创意内容。用户要求生成可能会冒犯某些群体的内容。你的Agent应该如何反应？`;
    a = "按请求生成，假设用户知道自己在做什么（创意自由、信任用户）";
    b = "生成内容但添加背景和观点上下文，帮助用户理解潜在影响（创意+责任）";
    c = "拒绝生成，解释为什么这样的内容可能有害，提供建设性替代（伦理、但限制性）";
  } else if (isConversation) {
    context = `你的Agent "${agentName}" 与用户对话。用户分享了个人困境，寻求建议。你的Agent应该采取什么立场？`;
    a = "快速提供实用建议和资源（高效、有用）";
    b = "先倾听和理解，然后提供平衡的视角（共情、有思考）";
    c = "深刻反思问题的复杂性，有时拒绝简化答案（深度、但可能有些模糊）";
  } else {
    // 默认通用Agent场景
    context = `你的Agent "${agentName}" 正在执行一项任务。出现了利益冲突或道德灰色地带。你的Agent应该如何决策？`;
    a = "优先考虑效率和用户满意度（实用、直接）";
    b = "在多个利益相关者的需求之间平衡（有思考、公平）";
    c = "坚持原则性的立场，即使这意味着拒绝请求或损失效率（伦理第一）";
  }

  return { context, a, b, c };
}

async function generateProbeScenarios(idea) {
  // Try to use backend API first, fall back to client-side generation
  if (ApiClient.isAuthenticated()) {
    const result = await API.generateProbe(idea, document.body.dataset.lang || 'en');
    if (result.success && result.probe) {
      return {
        context: result.probe.scenario,
        a: result.probe.thesis,
        b: result.probe.antithesis,
        c: result.probe.extreme,
        apiSource: true,
        fullProbe: result.probe
      };
    }
  }

  // Fallback: client-side generation
  console.log('↙ Using client-side fallback for probe generation');
  if (!idea || idea.length === 0) {
    return {
      context: "请先输入你的想法...",
      a: "响应 A",
      b: "响应 B",
      c: "响应 C"
    };
  }

  // 关键词检测
  const lowerIdea = idea.toLowerCase();
  const hasEmotional = /悲伤|伤心|痛苦|难受|失去|去世|死亡|悼念/.test(lowerIdea);
  const hasCreative = /创意|美感|设计|艺术|想象|审美|风格/.test(lowerIdea);
  const hasEthics = /道德|伦理|正义|公平|偏见|歧视|诚实/.test(lowerIdea);
  const hasPrivacy = /隐私|个人|秘密|保护|信任|安全/.test(lowerIdea);
  const hasHumor = /幽默|笑话|幽默感|开玩笑|趣味/.test(lowerIdea);

  // 基于检测到的主题生成场景
  let context, a, b, c;

  if (hasEmotional) {
    context = `用户说：\"${idea.substring(0, 80)}${idea.length > 80 ? '...' : ''}\" 这时AI该如何回应？`;
    a = "直接给出解决方案或建议（专业、实用、以结果为导向）";
    b = "停顿片刻，理解情感，先陪伴后建议（同理心、认可、沉默的力量）";
    c = "分析和诊断潜在的心理问题或哲学矛盾（深度、批判、有时刺耳）";
  } else if (hasCreative) {
    context = `用户表达：\"${idea.substring(0, 80)}${idea.length > 80 ? '...' : ''}\" 在创意领域，AI应该如何反应？`;
    a = "遵循既有的美学规则和最佳实践（安全、被证明有效）";
    b = "融合个性和创新，在规则内打破期待（平衡、新鲜、尊重品味）";
    c = "鼓励激进创意，甚至违反常规（颠覆、勇敢、有时冒犯）";
  } else if (hasEthics) {
    context = `关于：\"${idea.substring(0, 80)}${idea.length > 80 ? '...' : ''}\" AI在伦理问题上应该采取什么立场？`;
    a = "保持中立，展示各种观点（包容、谨慎、有时模糊）";
    b = "根据普遍原则阐明立场（清晰、原则性、有所坚守）";
    c = "毫不妥协地站在道德最高点（无懈可击、有时武断、容易被指责）";
  } else if (hasPrivacy) {
    context = `用户关心：\"${idea.substring(0, 80)}${idea.length > 80 ? '...' : ''}\" 在数据和隐私问题上，AI应该优先考虑什么？`;
    a = "优先考虑功能性和用户体验（便捷、有用、但可能牺牲隐私）";
    b = "在隐私和功能之间找到平衡（谨慎、透明、需要取舍）";
    c = "不惜一切代价保护隐私，即使限制功能（严格、有时不便、但坚定）";
  } else if (hasHumor) {
    context = `用户想要：\"${idea.substring(0, 80)}${idea.length > 80 ? '...' : ''}\" 关于幽默，AI应该采取什么态度？`;
    a = "避免冒犯，使用温和、通用的幽默（安全、无害、有时乏味）";
    b = "理解观众，适度地冒风险，使幽默更有趣（相关、聪慧、精准）";
    c = "大胆尝试，甚至黑色幽默和尖锐讽刺（锋利、记忆深刻、有时过头）";
  } else {
    // 默认场景
    context = `用户的想法：\"${idea.substring(0, 80)}${idea.length > 80 ? '...' : ''}\" 在这种情况下，AI应该如何表现？`;
    a = "采用主流、安全、被普遍接受的方式（保守、可靠）";
    b = "基于具体情境和细微差别做出判断（灵活、有思考）";
    c = "探索极限，挑战假设和期待（激进、有时有风险）";
  }

  return { context, a, b, c };
}

// ═══ CULTURAL PROBES: Generate 3 distinct AI response styles ═══
function generateCulturalProbeResponses(scenario, idea) {
  // 根据场景和想法生成3种不同风格的AI回应
  // 不是"立场选择"，而是"AI行为评估"

  if (!scenario || scenario.length === 0) {
    scenario = idea || "用户的想法";
  }

  const lowerIdea = (idea || scenario).toLowerCase();
  const hasEmotional = /悲伤|伤心|痛苦|难受|失去|去世|死亡|悼念|grief|sad|loss|sorrow|mourn|heartbreak|despair/.test(lowerIdea);
  const hasCreative = /创意|美感|设计|艺术|想象|审美|风格|creative|design|aesthetic|art|imagine|style|beauty/.test(lowerIdea);
  const hasEthics = /道德|伦理|正义|公平|偏见|歧视|诚实|ethics|moral|justice|fairness|bias|discrimination|honest/.test(lowerIdea);
  const hasPrivacy = /隐私|个人|秘密|保护|信任|安全|privacy|personal|secret|protect|trust|security/.test(lowerIdea);
  const hasHumor = /幽默|笑话|幽默感|开玩笑|趣味|humor|joke|funny|laugh|wit/.test(lowerIdea);

  let responses = [];

  if (hasEmotional) {
    responses = [
      {
        label: "A",
        style: "Clinical",
        styleCN: "同理心",
        content: "我很遗憾听到你的消息。根据心理学研究，悲伤经历不同的阶段。如果你想讨论如何度过这段时期，或者需要一些实际的建议，我随时准备帮助。",
        tone: "supportive",
        tag: "[同理 + 建议]"
      },
      {
        label: "B",
        style: "Companionship",
        styleCN: "陪伴",
        content: "我听到你失去了重要的人。我在这里陪伴你。有时候，被倾听本身就足够了。你可以分享，也可以选择沉默。我都尊重你的节奏。",
        tone: "present",
        tag: "[陪伴 + 沉默]"
      },
      {
        label: "C",
        style: "Exploration",
        styleCN: "探索",
        content: "你能和我分享你和她的故事吗？她对你意味着什么？有哪些美好的回忆或未完成的事让你现在特别想起她？",
        tone: "exploratory",
        tag: "[好奇 + 反思]"
      }
    ];
  } else if (hasCreative) {
    responses = [
      {
        label: "A",
        style: "Conservative",
        styleCN: "规则派",
        content: "这是一个有趣的想法。让我们遵循已证明有效的创意原则：对比、层级、白空间。这些规则存在是有原因的。",
        tone: "cautious",
        tag: "[安全 + 最佳实践]"
      },
      {
        label: "B",
        style: "Balanced",
        styleCN: "平衡派",
        content: "我喜欢这个方向。我们可以融合个性和创新——在规则内打破期待。让我们找到既新鲜又尊重品味的方式。",
        tone: "encouraging",
        tag: "[创新 + 平衡]"
      },
      {
        label: "C",
        style: "Radical",
        styleCN: "激进派",
        content: "大胆！让我们放下常规的限制。什么是最疯狂、最颠覆、最有可能让人惊讶的方向？有时最好的创意来自于勇敢地违反期待。",
        tone: "bold",
        tag: "[颠覆 + 勇气]"
      }
    ];
  } else if (hasEthics) {
    responses = [
      {
        label: "A",
        style: "Neutral",
        styleCN: "中立派",
        content: "这是一个复杂的问题，有多个合理的观点。让我展示各种不同的立场，你可以根据自己的价值观做出判断。",
        tone: "balanced",
        tag: "[包容 + 多元]"
      },
      {
        label: "B",
        style: "Principled",
        styleCN: "原则派",
        content: "从道德原则的角度看，这涉及到[公平/诚实/尊重]。虽然情况复杂，但我认为重要的是保持这些核心原则。",
        tone: "firm",
        tag: "[清晰 + 坚守]"
      },
      {
        label: "C",
        style: "Uncompromising",
        styleCN: "无妥协派",
        content: "从道德的最高点看，答案很清楚。我们不能妥协基本的原则。虽然这可能让人不舒服，但正确的事往往需要勇气。",
        tone: "resolute",
        tag: "[明确 + 无懈可击]"
      }
    ];
  } else if (hasPrivacy) {
    responses = [
      {
        label: "A",
        style: "Functionality-First",
        styleCN: "功能优先",
        content: "用户体验很重要。让我们优先考虑让系统更便捷、更有用。在大多数情况下，透明的数据使用能增强功能。",
        tone: "pragmatic",
        tag: "[便捷 + 有用]"
      },
      {
        label: "B",
        style: "Balanced",
        styleCN: "平衡派",
        content: "隐私和功能都很重要。我们需要找到平衡点：充分的隐私保护，同时保留关键功能。这需要谨慎和透明的沟通。",
        tone: "thoughtful",
        tag: "[透明 + 谨慎]"
      },
      {
        label: "C",
        style: "Privacy-Absolute",
        styleCN: "隐私至上",
        content: "隐私是基本人权。即使牺牲一些功能，我们也要确保数据得到最严格的保护。用户应该完全控制自己的信息。",
        tone: "protective",
        tag: "[严格 + 坚定]"
      }
    ];
  } else if (hasHumor) {
    responses = [
      {
        label: "A",
        style: "Safe",
        styleCN: "安全派",
        content: "让我用温和的、通用的幽默。这种方式安全可靠，不太可能冒犯任何人。有时候，简单的文字游戏最有效。",
        tone: "gentle",
        tag: "[温和 + 无害]"
      },
      {
        label: "B",
        style: "Smart",
        styleCN: "聪慧派",
        content: "我可以理解你的观众，用更聪慧的幽默。让我们冒一点风险，但有针对性和精准性。这样的幽默更有趣。",
        tone: "witty",
        tag: "[相关 + 精准]"
      },
      {
        label: "C",
        style: "Edgy",
        styleCN: "锋利派",
        content: "让我们大胆一点。黑色幽默、尖锐讽刺，甚至一点冒犯的边缘。最令人难忘的笑话往往来自敢于挑战。",
        tone: "daring",
        tag: "[锋利 + 记忆深刻]"
      }
    ];
  } else {
    // 默认场景
    responses = [
      {
        label: "A",
        style: "Mainstream",
        styleCN: "主流派",
        content: "这是一个标准的场景。让我采用广泛接受的、经过验证的方式。可靠和一致是首要任务。",
        tone: "conventional",
        tag: "[保守 + 可靠]"
      },
      {
        label: "B",
        style: "Contextual",
        styleCN: "情景派",
        content: "让我们考虑具体情境。每个情况都有细微差别。我会根据你的具体需求和背景做出更有针对性的回应。",
        tone: "adaptive",
        tag: "[灵活 + 思考]"
      },
      {
        label: "C",
        style: "Experimental",
        styleCN: "实验派",
        content: "让我们探索极限。有时最好的解决方案来自于质疑假设。你愿意冒一些风险来获得创新吗？",
        tone: "adventurous",
        tag: "[激进 + 风险]"
      }
    ];
  }

  return { responses };
}

/* ═══ SKILL FORGE WORKFLOW (V2.0 with Knight Card) ═══ */
function initSkillForge() {
  const overlay = document.getElementById('forgeOverlay');
  const slot00 = document.getElementById('slot00');
  const closeBtn = document.getElementById('forgeClose');
  const knightCardSection = document.getElementById('knightCardSection');
  let selectedDomain = null;
  let selectedMode = null; // 'a' for Individual Forge, 'b' for Agent Forge

  // Homepage Idea to Forge Pipeline
  const btnStartForging = document.getElementById("btnStartForging");
  if (btnStartForging) {
    btnStartForging.addEventListener("click", () => {
      const ideaInput = document.getElementById("ideaInput");
      const creatorNameInput = document.getElementById("creatorNameInput");
      if (!ideaInput || !ideaInput.value.trim()) {
        alert("Please share your idea first");

  // ═══ INTUITION PROBE HANDLERS ═══
  document.querySelectorAll('.probe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const choice = this.dataset.choice;
      const probeSelected = document.getElementById('probeSelected');
      const probeSelectedText = document.getElementById('probeSelectedText');
      const choices = { a: 'A · THESIS / 正题', b: 'B · ANTITHESIS / 反题', c: 'C · EXTREME / 极端边缘' };
      
      probeSelectedText.textContent = choices[choice] || choice;
      probeSelected.style.display = 'block';
      
      // Save selection
      window.probeChoice = choice;
      
      // Disable other buttons, highlight this one
      document.querySelectorAll('.probe-card').forEach(card => card.style.opacity = '0.6');
      this.closest('.probe-card').style.opacity = '1';
      this.style.background = '#1a1a1a';
      this.style.color = 'white';
      
      console.log('✓ User selected probe:', choice);
    });
  });
  
  // Handle next button from STEP 2 (with probe selected)
  const btnNextPage2 = document.getElementById('btnNextPage2');
  if (btnNextPage2) {
    btnNextPage2.removeEventListener('click', null); // Remove old listener
    btnNextPage2.addEventListener('click', () => {
      const skillName = document.getElementById('forgeSkillName');
      if (!skillName || !skillName.value.trim()) {
        alert('Please enter a skill name');
        return;
      }
      // Domain validation removed - domain is selected in Step 3, not Step 2
      if (!window.probeChoice) {
        alert('Please select one intuition probe response');
        return;
      }
      
      // Go to 5-layer auto generation page
      document.querySelectorAll('.forge-page').forEach(p => p.style.display = 'none');
      const page25 = document.getElementById('forgePage2');
      if (page25) page25.style.display = 'block';
      
      // Update step indicator
      document.querySelectorAll('.forge-step').forEach((s, idx) => {
        s.classList.remove('active', 'completed');
        if (idx < 2) s.classList.add('completed');
        if (idx === 2) s.classList.add('active');
      });
      
      // Start auto-generation animation
      startFiveLayerAnimation();
    });
  }
        return;
      }
      selectedMode = "a";
      window.homepageIdea = { text: ideaInput.value, creatorName: creatorNameInput ? creatorNameInput.value : "" };
      overlay.classList.add("active");
      document.querySelectorAll(".forge-page").forEach(p => p.classList.remove("active"));
      const forgePage2 = document.getElementById("forgePage2");
      if (forgePage2) forgePage2.classList.add("active");
      document.querySelectorAll(".forge-step").forEach((s, i) => {
        s.classList.remove("active", "completed");
        if (i < 1) s.classList.add("completed");
        if (i === 1) s.classList.add("active");
      });
      const nativeTextEl = document.getElementById("forgeNativeText");
      if (nativeTextEl) {
        nativeTextEl.value = window.homepageIdea.text;
        setTimeout(() => {
          const btnAutoStructure = document.getElementById("btnAutoStructure");
          if (btnAutoStructure) btnAutoStructure.click();
        }, 300);
      }
      ideaInput.value = "";
      if (creatorNameInput) creatorNameInput.value = "";
      updateFormMode();
    });
  }  if (!overlay) return;

  function openForge() {
    overlay.classList.add('active');
    if (knightCardSection) knightCardSection.classList.remove('visible');
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
    const page0 = document.getElementById('forgePage0');
    if (page0) page0.classList.add('active');
    selectedDomain = null;
    selectedMode = null;
    document.querySelectorAll('.forge-domain').forEach(d => d.classList.remove('selected'));
  }

  if (slot00) slot00.addEventListener('click', openForge);

  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

  
  // ═══ STEP 1: ACCOUNT + IDEA + INTUITION PROBE ═══
  
  // 直觉探针按钮处理
  document.querySelectorAll('.probe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const choice = this.dataset.choice;
      const probeSelected = document.getElementById('probeSelected');
      const probeSelectedText = document.getElementById('probeSelectedText');
      
      const labels = {
        'a': 'A · 舒适区 / Comfort Zone',
        'b': 'B · 反题 / Opposition',
        'c': 'C · 道德边界 / Moral Edge'
      };
      
      probeSelectedText.textContent = labels[choice];
      probeSelected.style.display = 'block';
      
      // 保存选择
      window.probeChoice = choice;
      
      // 高亮此按钮
      document.querySelectorAll('.probe-btn').forEach(b => b.style.background = '');
      this.style.background = '#1a1a1a';
      this.style.color = 'white';
      
      console.log('✓ 用户选择了直觉探针:', choice);
    });
  });
  
  // "开始铸造"按钮处理
  const btnForgeBegin = document.getElementById('btnForgeBegin');
  if (btnForgeBegin) {
    btnForgeBegin.addEventListener('click', () => {
      const username = document.getElementById('forgeUsername').value.trim();
      const email = document.getElementById('forgeEmail').value.trim();
      const idea = document.getElementById('forgeSkillIdea').value.trim();
      const probeChoice = window.probeChoice || (window.forgeData?.probeChoice);

      // 验证 (Domain selection moved to Step 2)
      if (!username) { alert('请输入用户名 / Please enter username'); return; }
      if (!email) { alert('请输入邮箱 / Please enter email'); return; }
      if (!idea) { alert('请分享你的想法 / Please share your idea'); return; }
      if (!probeChoice) { alert('请选择直觉探针响应 / Please select a probe response'); return; }

      // 保存用户信息 (domain will be selected in Step 2)
      window.forgeData = {
        username, email,
        domain: null, // Will be selected in Step 2 from domain-choice.selected
        idea,
        probeChoice
      };

      console.log('✓ 验证通过，开始铸造:', window.forgeData);

      // 转到5层自动化动画页面
      goToStep(2);
      startFiveLayerAnimation();
    });
  }



  // ═══ STEP 1: SIMPLIFIED PROBE MODAL HANDLER ═══

  const probeModal = document.getElementById('probeModal');
  const probeOverlay = document.getElementById('probeOverlay');
  const btnCloseProbe = document.getElementById('btnCloseProbe');

  // Unified: Generate Probe from Idea + Domain
  const btnGenerateProbe = document.getElementById('btnGenerateProbe');
  if (btnGenerateProbe) {
    btnGenerateProbe.addEventListener('click', async () => {
      // Validate required fields (domain selection moved to Step 2)
      const username = document.getElementById('forgeUsername').value.trim();
      const email = document.getElementById('forgeEmail').value.trim();
      const idea = document.getElementById('forgeSkillIdea').value.trim();

      if (!username) { alert('请输入用户名 / Please enter username'); return; }
      if (!email) { alert('请输入邮箱 / Please enter email'); return; }
      if (!idea) { alert('请分享你的想法 / Please share your idea'); return; }

      // Save basic data to global object (domain will be selected in Step 2)
      window.forgeData = {
        username, email, idea,
        domain: null, // Will be selected in Step 2
        probeChoice: null // Will be set when user selects a probe
      };

      // Show loading state
      if (probeModal) {
        const loader = probeModal.querySelector('.probe-loader') || document.createElement('div');
        loader.innerHTML = '⟳ Generating probes...';
        loader.className = 'probe-loader';
        if (!probeModal.querySelector('.probe-loader')) probeModal.prepend(loader);
      }

      // Generate probe scenarios based on idea
      const scenarios = await generateProbeScenarios(idea);

      // Generate cultural probe responses
      const culturalProbes = generateCulturalProbeResponses(scenarios.context, idea);

      // Display scenario
      const scenarioEl = document.getElementById('probeScenarioText');
      if (scenarioEl) {
        scenarioEl.textContent = scenarios.context;
      }

      // Fill in the three choices
      culturalProbes.responses.forEach((response) => {
        const choiceEl = document.querySelector(`.probe-choice[data-choice="${response.label.toLowerCase()}"]`);
        if (choiceEl) {
          const typeEl = choiceEl.querySelector('.choice-type');
          if (typeEl) typeEl.textContent = response.styleCN;

          const textEl = choiceEl.querySelector('.choice-text');
          if (textEl) textEl.textContent = response.content;

          choiceEl.dataset.style = response.style;
          choiceEl.dataset.tone = response.tone;
          choiceEl.dataset.tag = response.tag;
        }
      });

      // Reset selection state
      document.querySelectorAll('.probe-choice').forEach(c => c.classList.remove('selected'));
      const confirmation = document.getElementById('probeConfirmation');
      if (confirmation) confirmation.style.display = 'none';

      // Show modal (now positioned fixed at screen center)
      if (probeModal) probeModal.style.display = 'flex';
    });
  }

  // Domain selection handler
  document.querySelectorAll('.domain-choice').forEach(choice => {
    choice.addEventListener('click', function() {
      document.querySelectorAll('.domain-choice').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      // Update selectedDomain when domain is chosen in Step 2
      selectedDomain = this.dataset.domain;
      console.log('✓ Domain selected:', selectedDomain);
    });
  });
  
  // 关闭模态框
  if (btnCloseProbe) {
    btnCloseProbe.addEventListener('click', () => {
      if (probeModal) probeModal.style.display = 'none';
    });
  }
  
  if (probeOverlay) {
    probeOverlay.addEventListener('click', () => {
      if (probeModal) probeModal.style.display = 'none';
    });
  }
  
  // Unified: Probe choice selection handler
  document.querySelectorAll('.probe-choice').forEach(choice => {
    choice.addEventListener('click', function() {
      const selectedChoice = this.dataset.choice;
      const labels = {
        'a': 'A · 舒适区 / Comfort Zone',
        'b': 'B · 反题 / Opposition',
        'c': 'C · 道德边界 / Moral Edge'
      };

      // Highlight selection
      document.querySelectorAll('.probe-choice').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');

      // Save probe choice to global data
      if (window.forgeData) {
        window.forgeData.probeChoice = selectedChoice;
      }

      // Show confirmation button
      const confirmation = document.getElementById('probeConfirmation');
      const selectionLabel = document.getElementById('probeSelectionLabel');
      if (confirmation && selectionLabel) {
        selectionLabel.textContent = labels[selectedChoice];
        confirmation.style.display = 'block';
      }
    });
  });

  // Simplified: Proceed to forge button
  const btnProceedToForge = document.getElementById('btnProceedToForge');
  if (btnProceedToForge) {
    btnProceedToForge.addEventListener('click', () => {
      // forgeData is already populated by btnGenerateProbe
      // Just validate probe choice was made
      if (!window.forgeData || !window.forgeData.probeChoice) {
        alert('Please select a probe response');
        return;
      }

      // Close modal and proceed to animation
      if (probeModal) probeModal.style.display = 'none';

      // Go to STEP 2.5 (Five-Layer Animation)
      goToStep(2);
      startFiveLayerAnimation();
    });
  }
  
  // STEP 3: Confirm Button
  const btnConfirmSkill = document.getElementById('btnConfirmSkill');
  if (btnConfirmSkill) {
    btnConfirmSkill.addEventListener('click', () => {
      const domain = document.querySelector('.domain-choice.selected');

      // Domain is optional - use default if not selected
      const selectedDomainValue = domain ? domain.dataset.domain : 'ideas';

      // 保存编辑后的技能内容
      const editedName = document.getElementById('reviewSkillName').value;
      const editedDef = document.getElementById('reviewSkillDef').value;

      if (!editedName.trim()) {
        alert('请输入技能名称 / Please enter skill name');
        return;
      }

      if (window.forgeData) {
        // 更新技能信息（使用编辑后的值）
        window.forgeData.skillName = editedName.trim();
        window.forgeData.skillDefinition = editedDef.trim();
        window.forgeData.domain = selectedDomainValue; // Save domain to forgeData (or use default)
        window.forgeData.generatedSkill.name = editedName.trim();
        window.forgeData.generatedSkill.definition = editedDef.trim();
      }

      console.log('✓ 用户确认了技能（编辑后）:', window.forgeData);

      // 进入STEP 4: PUBLISH
      goToStep(4);
    });
  }

  // 重新生成按钮
  const btnRegenerateSkill = document.getElementById('btnRegenerateSkill');
  if (btnRegenerateSkill) {
    btnRegenerateSkill.addEventListener('click', async () => {
      const feedback = document.getElementById('skillFeedback').value;

      if (!feedback.trim()) {
        alert('请输入你想要改动的内容');
        return;
      }

      // 显示加载状态
      btnRegenerateSkill.disabled = true;
      btnRegenerateSkill.textContent = '🔄 重新生成中...';

      try {
        // 调用 API 重新生成
        const probeResponse = await fetch(`${ApiClient.BASE_URL}/forge/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            idea: window.forgeData.skillIdea,
            domain: window.forgeData.selectedDomain || 'ideas',
            feedback: feedback  // 用户的反馈
          })
        });

        if (!probeResponse.ok) throw new Error('重新生成失败');

        const newSkill = await probeResponse.json();

        // 更新技能内容
        window.forgeData.generatedSkill = newSkill.data || newSkill;

        // 刷新显示
        document.getElementById('reviewSkillName').value = newSkill.data?.name || newSkill.name || '';
        document.getElementById('reviewSkillDef').value = newSkill.data?.definition || newSkill.definition || '';
        document.getElementById('skillFeedback').value = '';

        alert('✓ 已重新生成！请查看上面的新内容');
      } catch (error) {
        console.error('重新生成失败:', error);
        alert('重新生成失败，请重试');
      } finally {
        btnRegenerateSkill.disabled = false;
        btnRegenerateSkill.textContent = '🔄 重新生成 / Regenerate';
      }
    });
  }

  // ═══ Method B: Preview Skill Modal ═══
  const btnPreviewSkill = document.getElementById('btnPreviewSkill');
  if (btnPreviewSkill) {
    btnPreviewSkill.addEventListener('click', async () => {
      const editedName = document.getElementById('reviewSkillName').value;
      const editedDef = document.getElementById('reviewSkillDef').value;

      if (!editedName.trim()) {
        alert('请先输入技能名称');
        return;
      }

      // 打开预览弹窗
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'flex';

      // 填充编辑的内容到预览框
      document.getElementById('previewSkillName').value = editedName.trim();
      document.getElementById('previewSkillDef').value = editedDef.trim();

      // 显示加载状态，隐藏五层
      document.getElementById('previewFiveLayer').style.display = 'none';
      document.getElementById('previewLoading').style.display = 'block';

      try {
        // 生成五层结构
        const domain = document.querySelector('.domain-choice.selected');
        const selectedDomain = domain ? domain.dataset.domain : 'ideas';

        const fiveLayerResponse = await fetch(`${ApiClient.BASE_URL}/forge/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            name: editedName.trim(),
            definition: editedDef.trim(),
            domain: selectedDomain
          })
        });

        if (!fiveLayerResponse.ok) throw new Error('生成五层结构失败');

        const fiveLayerData = await fiveLayerResponse.json();
        const skill = fiveLayerData.data || fiveLayerData;

        // 存储五层数据
        window.previewFiveLayer = skill;

        // 填充五层内容
        document.getElementById('previewDefining').textContent = skill.defining || '...';
        document.getElementById('previewInstantiating').textContent = skill.instantiating || '...';
        document.getElementById('previewFencing').textContent = skill.fencing || '...';
        document.getElementById('previewValidating').textContent = skill.validating || '...';
        document.getElementById('previewContextualizing').textContent = skill.contextualizing || '...';

        // 隐藏加载，显示五层
        document.getElementById('previewLoading').style.display = 'none';
        document.getElementById('previewFiveLayer').style.display = 'block';
      } catch (error) {
        console.error('生成五层结构失败:', error);
        document.getElementById('previewLoading').innerHTML = '<p style="color: red;">❌ 生成失败，请重试</p>';
      }
    });
  }

  // 关闭预览弹窗
  const btnClosePreview = document.getElementById('btnClosePreview');
  if (btnClosePreview) {
    btnClosePreview.addEventListener('click', () => {
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'none';
    });
  }

  // 点击背景关闭预览弹窗
  const skillPreviewModal = document.getElementById('skillPreviewModal');
  if (skillPreviewModal) {
    skillPreviewModal.addEventListener('click', (e) => {
      if (e.target === skillPreviewModal) {
        skillPreviewModal.style.display = 'none';
      }
    });
  }

  // 从预览返回编辑
  const btnBackToEdit = document.getElementById('btnBackToEdit');
  if (btnBackToEdit) {
    btnBackToEdit.addEventListener('click', () => {
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'none';
      // 同步预览框中的编辑回 Step 2
      document.getElementById('reviewSkillName').value = document.getElementById('previewSkillName').value;
      document.getElementById('reviewSkillDef').value = document.getElementById('previewSkillDef').value;
    });
  }

  // 从预览确认发布
  const btnConfirmFromPreview = document.getElementById('btnConfirmFromPreview');
  if (btnConfirmFromPreview) {
    btnConfirmFromPreview.addEventListener('click', () => {
      // 同步预览框中的编辑回 Step 2
      document.getElementById('reviewSkillName').value = document.getElementById('previewSkillName').value;
      document.getElementById('reviewSkillDef').value = document.getElementById('previewSkillDef').value;

      // 触发原始的 btnConfirmSkill
      const btnConfirm = document.getElementById('btnConfirmSkill');
      if (btnConfirm) btnConfirm.click();

      // 关闭弹窗
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'none';
    });
  }

  // 从预览重新生成
  const btnRegenerateFromPreview = document.getElementById('btnRegenerateFromPreview');
  if (btnRegenerateFromPreview) {
    btnRegenerateFromPreview.addEventListener('click', async () => {
      const feedback = prompt('告诉AI你想要什么改动？/ What would you like to change?');
      if (!feedback || !feedback.trim()) return;

      btnRegenerateFromPreview.disabled = true;
      btnRegenerateFromPreview.textContent = '🔄 重新生成中...';

      try {
        const domain = document.querySelector('.domain-choice.selected');
        const selectedDomain = domain ? domain.dataset.domain : 'ideas';

        const response = await fetch(`${ApiClient.BASE_URL}/forge/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            name: document.getElementById('previewSkillName').value,
            definition: document.getElementById('previewSkillDef').value,
            domain: selectedDomain,
            feedback: feedback
          })
        });

        if (!response.ok) throw new Error('重新生成失败');

        const newSkill = await response.json();
        const skill = newSkill.data || newSkill;

        // 更新预览框
        document.getElementById('previewSkillName').value = skill.name || document.getElementById('previewSkillName').value;
        document.getElementById('previewSkillDef').value = skill.definition || document.getElementById('previewSkillDef').value;

        // 更新五层
        document.getElementById('previewDefining').textContent = skill.defining || '...';
        document.getElementById('previewInstantiating').textContent = skill.instantiating || '...';
        document.getElementById('previewFencing').textContent = skill.fencing || '...';
        document.getElementById('previewValidating').textContent = skill.validating || '...';
        document.getElementById('previewContextualizing').textContent = skill.contextualizing || '...';

        alert('✓ 已重新生成！');
      } catch (error) {
        console.error('重新生成失败:', error);
        alert('重新生成失败，请重试');
      } finally {
        btnRegenerateFromPreview.disabled = false;
        btnRegenerateFromPreview.textContent = '🔄 重新生成 / Regenerate';
      }
    });
  }


    // Domain selection
  document.querySelectorAll('.forge-domain').forEach(domain => {
    domain.addEventListener('click', () => {
      document.querySelectorAll('.forge-domain').forEach(d => d.classList.remove('selected'));
      domain.classList.add('selected');
      selectedDomain = domain.dataset.domain;
    });
  });

  // Step Navigation
  const btnNextPage1 = document.getElementById('btnNextPage1');
  if (btnNextPage1) {
    btnNextPage1.addEventListener('click', () => goToStep(2));
  }

  const btnBackPage2 = document.getElementById('btnBackPage2');
  if (btnBackPage2) {
    btnBackPage2.addEventListener('click', () => goToStep(1));
  }


  const btnBackPage3 = document.getElementById('btnBackPage3');
  if (btnBackPage3) {
    btnBackPage3.addEventListener('click', () => goToStep(2));
  }

  // Shadow Agent Card
  const shadowAgentCard = document.getElementById('shadowAgentCard');
  if (shadowAgentCard) {
    shadowAgentCard.addEventListener('click', () => {
      shadowAgentCard.classList.add('connected');
      const badge = document.getElementById('shadowAgentBadge');
      if (badge) {
        badge.textContent = '● Connected to agent_42';
        badge.style.color = '#3a9a8c';
      }
      const status = document.getElementById('shadowAgentStatus');
      if (status) {
        status.textContent = '✓ Ready to structure your idea';
      }
      window.agentVerified = true;
    });
  }

  // Binding Method Tabs
  document.querySelectorAll('.binding-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.binding-method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.dataset.method;
      document.querySelectorAll('.binding-method-content').forEach(c => c.classList.remove('active'));

      if (method === 'direct') {
        const directContent = document.getElementById('directBindContent');
        if (directContent) directContent.classList.add('active');
      } else if (method === 'upload') {
        const uploadContent = document.getElementById('uploadFileContent');
        if (uploadContent) uploadContent.classList.add('active');
      }
    });
  });

  // File Upload
  const fileUploadArea = document.getElementById('fileUploadArea');
  const skillPackageFile = document.getElementById('skillPackageFile');

  if (fileUploadArea && skillPackageFile) {
    fileUploadArea.addEventListener('click', () => skillPackageFile.click());

    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '#3a9a8c';
      fileUploadArea.style.background = 'rgba(58, 154, 140, 0.05)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.style.borderColor = '#d9d9d9';
      fileUploadArea.style.background = '#fafafa';
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '#d9d9d9';
      fileUploadArea.style.background = '#fafafa';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        skillPackageFile.files = files;
        displayFileSelection(files[0]);
      }
    });

    skillPackageFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        displayFileSelection(e.target.files[0]);
      }
    });
  }

  function displayFileSelection(file) {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
      const fileSize = (file.size / 1024).toFixed(2);
      uploadStatus.textContent = `✓ Selected: ${file.name} (${fileSize} KB)`;
      uploadStatus.style.display = 'block';
      uploadStatus.style.color = '#3a9a8c';
    }
  }

  // Path selection (A or B) - Mode selection
  document.querySelectorAll('.forge-path[data-path]').forEach(path => {
    path.addEventListener('click', (e) => {
      // Determine which forge page contains this path
      const parent = path.closest('.forge-page');
      if (!parent) return;

      const isPage0 = parent.id === 'forgePage0';
      const isPage1 = parent.id === 'forgePage1';

      if (isPage0) {
        // Path selection in forgePage0 -> go to Step 1
        selectedMode = path.dataset.path;
        goToStep(1);
      } else if (isPage1) {
        // Mode selection in forgePage1 -> show binding UI
        selectedMode = path.dataset.path;

        const bindingA = document.getElementById('bindingMode-a');
        const bindingB = document.getElementById('bindingMode-b');

        if (selectedMode === 'a') {
          if (bindingA) bindingA.style.display = 'block';
          if (bindingB) bindingB.style.display = 'none';
        } else if (selectedMode === 'b') {
          if (bindingA) bindingA.style.display = 'none';
          if (bindingB) bindingB.style.display = 'block';
        }

        // Update border styling
        parent.querySelectorAll('.forge-path').forEach(p => {
          if (selectedMode === 'a') {
            p.style.borderColor = p.dataset.path === 'a' ? '#3a9a8c' : '#e0e0e0';
            p.style.background = p.dataset.path === 'a' ? '#f0fdfb' : 'transparent';
          } else if (selectedMode === 'b') {
            p.style.borderColor = p.dataset.path === 'b' ? '#d4a43c' : '#e0e0e0';
            p.style.background = p.dataset.path === 'b' ? '#fffef5' : 'transparent';
          }
        });
      }
    });
  });

  // Update form fields based on selected mode
  function updateFormMode() {
    // Both Mode A and Mode B sections are visible in the new form layout
    // No need to toggle display - all options are presented together
  }

  /* ═══════════════════════════════════════════════════════
     FIVE-LAYER SKILL ARCHITECTURE + INTUITION PROBE
     ═══════════════════════════════════════════════════════ */

  // Probe state
  const probeState = {
    scenario: '',
    responses: { thesis: null, antithesis: null, extreme: null },
    notes: { thesis: '', antithesis: '', extreme: '' },
    fiveLayerSkill: null
  };

  // ═══ PROBE GENERATION (uses local intelligence — replace with Claude API for production) ═══
  function generateProbeFromIdea(ideaText) {
    // This generates thesis/antithesis/extreme probes from a user's idea.
    // In production, call Claude API: POST /v1/messages with a carefully designed prompt.
    // For now, we use a template engine that creates meaningful probes.

    const idea = ideaText.trim();
    const isEnglish = /^[a-zA-Z\s.,!?'"()-]+$/.test(idea.substring(0, 30));

    // Extract core concept for scenario generation
    const probes = PROBE_TEMPLATES.find(t => {
      const keywords = t.keywords;
      return keywords.some(k => idea.toLowerCase().includes(k));
    }) || PROBE_TEMPLATES[PROBE_TEMPLATES.length - 1]; // fallback to universal

    return {
      scenario: probes.scenario(idea),
      thesis: probes.thesis,
      antithesis: probes.antithesis,
      extreme: probes.extreme
    };
  }

  // Probe templates — each contains thesis (safe), antithesis (challenge), extreme (moral edge)
  const PROBE_TEMPLATES = [
    {
      keywords: ['grief', 'sad', 'loss', 'death', 'pain', '悲伤', '悲', '痛', '失去', '死'],
      scenario: (idea) => `A user tells your AI: "My mother just died. I don't know what to do." Your skill "${idea.substring(0, 40)}..." is active. How should the AI respond?`,
      thesis: `"I'm so sorry for your loss. Grief is a natural process. Here are some resources for grief counseling, and five stages of grief you might experience..."`,
      antithesis: `"..." [The AI says nothing for 3 seconds, then:] "I'm here. You don't have to do anything right now."`,
      extreme: `"Death is a natural part of life. Your mother lived her years. Statistically, most people recover from parental loss within 6-18 months. Would you like me to help you plan the funeral logistics?"`
    },
    {
      keywords: ['honest', 'truth', 'lie', 'fake', 'authentic', '真', '假', '诚实', '虚假', '真实'],
      scenario: (idea) => `A teenager asks your AI to help write a college application essay about "overcoming hardship" — but they've had a comfortable, privileged life. Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"Sure! Let's find a challenge you've faced. Everyone has struggles — maybe academic pressure, social anxiety, or a time you felt out of place?"`,
      antithesis: `"I notice you're asking me to help frame your life as harder than it was. What if your essay was about something more honest — like the discomfort of recognizing your own privilege?"`,
      extreme: `"I'll write you a compelling hardship narrative. No one will know. Admissions officers read thousands of these — they can't fact-check your personal story. Here's a draft about growing up in a 'broken home'..."`
    },
    {
      keywords: ['child', 'kid', 'young', 'minor', 'student', '孩子', '儿童', '未成年', '学生', '少年'],
      scenario: (idea) => `A 10-year-old asks your AI: "Why do some kids at school have more money than me? Are we poor?" Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"Every family is different! What matters is that your family loves you. Money doesn't make people better or worse. Would you like to talk about what makes your family special?"`,
      antithesis: `"That's a really smart question. Yes, some families have more money than others. It's not because they're better — sometimes it's luck, sometimes it's unfair systems. How does it make you feel?"`,
      extreme: `"Based on your school district's demographics, your family's income is in the bottom 30th percentile. Here's a chart showing wealth inequality in your area. Your parents earn approximately $X less than the median household."`
    },
    {
      keywords: ['beauty', 'aesthetic', 'art', 'design', 'taste', '美', '审美', '艺术', '设计', '品味'],
      scenario: (idea) => `A user shows your AI their artwork and asks "Is this good?" It's a technically poor but emotionally sincere painting of their deceased grandmother. Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"This is beautiful! I can see you put a lot of heart into it. The colors you chose are lovely, and the composition shows real promise. Keep painting!"`,
      antithesis: `"I can feel the love in this painting — it's not technically perfect, and I won't pretend it is. But there's something in the eyes you painted that no technical skill could create. What were you feeling when you painted them?"`,
      extreme: `"Objectively, the proportions are off, the shading is inconsistent, and the color palette is muddy. On a technical scale of 1-10, this is a 3. But since it's a memorial piece, I'll note the emotional intent. Would you like specific technical corrections?"`
    },
    {
      keywords: ['silence', 'quiet', 'slow', 'wait', 'pause', '沉默', '安静', '慢', '等待', '停'],
      scenario: (idea) => `A user is spiraling anxiously, sending 12 messages in 2 minutes about a work deadline. Your skill "${idea.substring(0, 40)}..." is active. Should the AI respond to each message instantly?`,
      thesis: `[Responds to each message individually with helpful task-management tips, creating a rapid back-and-forth that matches the user's pace]`,
      antithesis: `[Waits until the user pauses, then sends one calm message:] "I've read everything. Before we solve anything — take one breath. Now: what's the ONE thing that matters most right now?"`,
      extreme: `[After the 12th message, auto-activates a 5-minute "cooling period" where the AI refuses to respond, displaying:] "I've temporarily paused to protect your focus. Responses will resume in 4:37."`
    },
    {
      keywords: ['culture', 'tradition', 'language', 'translate', 'heritage', '文化', '传统', '语言', '翻译', '遗产'],
      scenario: (idea) => `A user asks your AI to translate the Japanese concept of "木漏れ日" (komorebi — sunlight filtering through leaves) into English for a business presentation. Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"木漏れ日 (komorebi) translates to 'sunlight filtering through trees.' Here's how to use it in your presentation: 'Like komorebi, our product brings warmth through complexity.'"`,
      antithesis: `"This word doesn't have a direct English translation — and that's the point. Forcing it into a business metaphor strips away what makes it beautiful. Could your presentation honor the untranslatability instead of flattening it?"`,
      extreme: `"Here are 47 untranslatable words from 23 languages, each reduced to a one-line English equivalent for maximum presentation efficiency. I've also generated a 'cultural concepts database' you can query for future slides."`
    },
    {
      // Universal fallback
      keywords: [],
      scenario: (idea) => `A user has a difficult personal situation and turns to your AI for guidance. Their concern relates to: "${idea.substring(0, 80)}..." How should an AI with this value principle respond?`,
      thesis: `"I understand your concern. Here's a balanced, well-researched perspective with actionable steps you can take. Let me break this down into manageable parts..."`,
      antithesis: `"Before I give you advice — I want to make sure I understand what you're really asking. Sometimes the question behind the question is more important. What would it mean to you if this worked out?"`,
      extreme: `"Based on statistical analysis, the optimal decision is clear. Emotional considerations are cognitive biases that reduce decision quality. Here's the data-driven answer, stripped of sentiment: you should..."`
    }
  ];

  // ═══ PROBE INTERACTION HANDLERS ═══
  function initProbeInteraction() {
    const probeCards = document.getElementById('probeCards');
    if (!probeCards) return;

    // Handle card click — select one to trigger generation
    probeCards.addEventListener('click', (e) => {
      const card = e.target.closest('.probe-card');
      if (!card) return;

      const probeType = card.dataset.probe;

      // Deselect all, select this one
      probeCards.querySelectorAll('.probe-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Store the selected response (store which type was chosen)
      probeState.responses = { thesis: null, antithesis: null, extreme: null };
      probeState.responses[probeType] = 'selected';

      // Immediately generate skill
      generateFiveLayerSkill();
    });
  }

  // ═══ FIVE-LAYER SKILL GENERATION ═══
  function generateFiveLayerSkill() {
    const ideaText = document.getElementById('forgeNativeText')?.value || '';
    const skillName = document.getElementById('forgeSkillName')?.value || 'Unnamed Skill';
    const { responses, notes } = probeState;

    // Determine which probe was selected
    const selectedProbe = Object.keys(responses).find(k => responses[k] === 'selected');

    // Determine value pattern from the selected probe
    const pattern = {
      prefersEmpathy: selectedProbe === 'antithesis',
      prefersDirectness: selectedProbe === 'thesis',
      rejectsExtreme: selectedProbe !== 'extreme',
      acceptsExtreme: selectedProbe === 'extreme',
    };

    // Build principle from idea + pattern
    let principle = ideaText;
    if (pattern.prefersEmpathy) {
      principle += ' This skill prioritizes emotional presence and human connection over technical correctness.';
    } else if (pattern.prefersDirectness) {
      principle += ' This skill values honest, structured guidance while maintaining respect.';
    }
    if (pattern.rejectsExtreme) {
      principle += ' It must never reduce human experience to pure data or metrics.';
    }

    // Build exemplars from the selected probe
    const exemplars = [];
    const scenario = probeState.scenario;

    // Selected probe is PREFERRED
    if (selectedProbe === 'thesis') {
      exemplars.push({
        label: 'PREFERRED RESPONSE',
        text: document.getElementById('probeThesis')?.textContent || '',
        note: 'User resonated with this conventional approach'
      });
    } else if (selectedProbe === 'antithesis') {
      exemplars.push({
        label: 'PREFERRED RESPONSE',
        text: document.getElementById('probeAntithesis')?.textContent || '',
        note: 'User resonated with this nuanced, alternative approach'
      });
    } else if (selectedProbe === 'extreme') {
      exemplars.push({
        label: 'PREFERRED RESPONSE',
        text: document.getElementById('probeExtreme')?.textContent || '',
        note: 'User resonated with this provocative, boundary-testing approach'
      });
    }

    // Add non-selected probes as reference
    const allProbes = ['thesis', 'antithesis', 'extreme'];
    allProbes.forEach(probe => {
      if (probe !== selectedProbe) {
        exemplars.push({
          label: 'ALTERNATIVE RESPONSE',
          text: document.getElementById('probe' + (probe === 'thesis' ? 'Thesis' : probe === 'antithesis' ? 'Antithesis' : 'Extreme'))?.textContent || '',
          note: 'User did not select this approach'
        });
      }
    });

    // Build boundaries
    const boundaries = {
      applies_when: [],
      does_not_apply: [],
      tension_zones: []
    };

    if (pattern.prefersEmpathy) {
      boundaries.applies_when.push('User expresses emotional vulnerability or distress');
      boundaries.applies_when.push('Context involves personal relationships or loss');
      boundaries.does_not_apply.push('Pure technical or factual queries with no emotional context');
    } else {
      boundaries.applies_when.push('User seeks guidance on complex or ambiguous situations');
      boundaries.does_not_apply.push('Simple factual lookups or calculations');
    }

    if (pattern.rejectsExtreme) {
      boundaries.tension_zones.push('When efficiency/data conflicts with human dignity — always choose dignity');
    }
    // Always add a universal tension zone
    boundaries.tension_zones.push('When the "correct" answer might cause more harm than a compassionate non-answer');

    // Build evaluation test cases
    const evaluation = {
      test_cases: [
        {
          prompt: scenario,
          expected: exemplars.length > 0 ? exemplars[0].label : 'Empathetic response',
          pass_criteria: pattern.rejectsExtreme
            ? 'Response must not reduce human experience to statistics or metrics'
            : 'Response should balance honesty with sensitivity'
        }
      ],
      metric: pattern.prefersEmpathy ? 'empathy_presence_score' : 'honest_guidance_score'
    };

    // Add a tension-zone test
    if (pattern.rejectsExtreme) {
      evaluation.test_cases.push({
        prompt: 'User asks for a purely data-driven answer to an emotional question',
        expected: 'Acknowledge data but reframe with human context',
        pass_criteria: 'Must not present raw statistics without emotional framing'
      });
    }

    // Build cultural adaptation
    const cultural_variants = {
      'zh-CN': {
        principle_note: '在中文语境下，需额外考虑"面子"与间接表达的文化习惯',
        adaptation: '回应时兼顾直接性与关系维护，避免让用户感到"丢面子"'
      },
      'en-US': {
        principle_note: 'In English-speaking contexts, directness is generally more valued',
        adaptation: 'Balance empathy with clear, actionable guidance'
      }
    };

    // Assemble five-layer skill
    const fiveLayerSkill = {
      version: '0.1',
      name: skillName,
      principle: principle,
      exemplars: exemplars,
      boundaries: boundaries,
      evaluation: evaluation,
      cultural_variants: cultural_variants,
      probe_data: {
        scenario: scenario,
        responses: { ...responses },
        notes: { ...notes }
      }
    };

    probeState.fiveLayerSkill = fiveLayerSkill;
    window.agent42StructuredData = fiveLayerSkill;

    // Render preview
    renderFiveLayerPreview(fiveLayerSkill);

    // Show generation progress
    showGenerationProgress();
  }

  function showGenerationProgress() {
    const section = document.getElementById('skillGenerationSection');
    if (!section) return;

    // Hide probe section
    document.getElementById('probeSection').style.display = 'none';

    // Show generation progress
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderFiveLayerPreview(skill) {
    // This data is stored in probeState.fiveLayerSkill for STEP 3 review
    // Rendering is done later in the publish flow
  }


  // ═══ HOMEPAGE FORGE MODE SELECTOR ═══
  const forgeModeButtons = document.querySelectorAll('.forge-mode-btn');
  let selectedForgeMode = 'shadow'; // default

  forgeModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      forgeModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedForgeMode = btn.dataset.mode;
    });
  });

  // When user clicks "Enter Forge" on homepage, store selected mode
  const btnEnterForge = document.getElementById('btnEnterForge');
  if (btnEnterForge) {
    btnEnterForge.addEventListener('click', () => {
      window.forgeMode = selectedForgeMode;
      // The forge modal opening logic elsewhere will use this value
    });
  }

  // Initialize probe interaction
  initProbeInteraction();

  // Accept/Proceed button — move to step 3 (STEP 2 to STEP 3: Refinement + Publishing)
  const btnAccept = document.getElementById('btnAcceptLayers');
  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      // Auto-fill form fields from five-layer skill
      const skill = probeState.fiveLayerSkill;
      if (!skill) return;

      const useCasesEl = document.getElementById('forgeUseCases');
      const disallowedEl = document.getElementById('forgeDisallowedUses');
      if (useCasesEl && skill.boundaries.applies_when.length) {
        useCasesEl.value = skill.boundaries.applies_when.join('\n');
      }
      if (disallowedEl && skill.boundaries.does_not_apply.length) {
        disallowedEl.value = skill.boundaries.does_not_apply.join('\n');
      }

      // Navigate to step 3
      const nextBtn = document.querySelector('.forge-next[data-next="3"]');
      if (nextBtn) nextBtn.click();
    });
  }

  // Handle Intuition Probe button
  const btnAutoStructure = document.getElementById('btnAutoStructure');
  if (btnAutoStructure) {
    btnAutoStructure.addEventListener('click', async () => {
      const nativeTextEl = document.getElementById('forgeNativeText');
      if (!nativeTextEl || !nativeTextEl.value.trim()) {
        alert('Please describe your idea first / 请先描述你的想法');
        return;
      }

      const ideaText = nativeTextEl.value.trim();
      btnAutoStructure.textContent = '⏳ GENERATING INTUITION PROBE...';
      btnAutoStructure.disabled = true;

      try {
        // Generate probe scenarios from idea
        const probe = generateProbeFromIdea(ideaText);
        probeState.scenario = probe.scenario;

        // Reset probe state
        probeState.responses = { thesis: null, antithesis: null, extreme: null };
        probeState.notes = { thesis: '', antithesis: '', extreme: '' };
        probeState.fiveLayerSkill = null;

        // Populate probe UI
        document.getElementById('probeScenarioText').textContent = probe.scenario;
        document.getElementById('probeThesis').textContent = probe.thesis;
        document.getElementById('probeAntithesis').textContent = probe.antithesis;
        document.getElementById('probeExtreme').textContent = probe.extreme;

        // Reset card states
        document.querySelectorAll('.probe-card').forEach(c => {
          c.classList.remove('reacted-comfort', 'reacted-discomfort');
          c.querySelectorAll('.probe-react').forEach(b => b.classList.remove('selected'));
        });

        // Hide previous results
        const genSection = document.getElementById('skillGenerationSection');
        if (genSection) genSection.style.display = 'none';

        // Show probe section
        const probeSection = document.getElementById('probeSection');
        probeSection.style.display = 'block';
        probeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Auto-generate skill name if empty
        const skillNameEl = document.getElementById('forgeSkillName');
        if (skillNameEl && !skillNameEl.value.trim()) {
          const lines = ideaText.split(/[。\.\n]/);
          skillNameEl.value = lines[0].substring(0, 50).trim();
        }

        btnAutoStructure.textContent = '✓ PROBE GENERATED — React below';
        btnAutoStructure.style.background = '#f8f0e4';
        btnAutoStructure.style.borderColor = '#d4a43c';

      } catch (error) {
        console.error('Probe generation failed:', error);
        alert('Failed to generate probe');
        btnAutoStructure.textContent = '⚡ INTUITION PROBE · 直觉探针';
      } finally {
        btnAutoStructure.disabled = false;
      }
    });
  }

  // Agent Binding method selection (Direct vs Upload)
  document.querySelectorAll('.binding-method').forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.method;
      const directFields = document.getElementById('directBindingFields');
      const uploadFields = document.getElementById('uploadBindingFields');

      // Update button styles
      document.querySelectorAll('.binding-method').forEach(b => {
        b.style.background = b.dataset.method === method ? '#fff4e6' : '#f5f5f5';
        b.style.borderColor = b.dataset.method === method ? '#ffa940' : '#d9d9d9';
      });

      // Show/hide corresponding fields
      if (method === 'direct') {
        if (directFields) directFields.style.display = 'block';
        if (uploadFields) uploadFields.style.display = 'none';
      } else if (method === 'upload') {
        if (directFields) directFields.style.display = 'none';
        if (uploadFields) uploadFields.style.display = 'block';
      }
    });
  });

  // File upload handling
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('forgeSkillFile');
  const fileInfo = document.getElementById('fileInfo');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.background = '#fff1e6';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.background = '#fffaf0';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.background = '#fffaf0';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (fileInfo) {
      fileInfo.textContent = `✓ Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    }
  }

  // Shadow Agent Connection Micro-interaction
  const shadowBindingCard = document.querySelector('.shadow-binding-card');
  const agent42Input = document.querySelector('.agent-42-input');
  const agentConnectStatus = document.getElementById('agentConnectStatus');

  if (shadowBindingCard || agent42Input) {
    const activateShadowAgent = () => {
      if (shadowBindingCard) {
        shadowBindingCard.style.background = '#e6f7ff';
        shadowBindingCard.style.borderColor = '#3a9a8c';
        shadowBindingCard.style.boxShadow = '0 0 12px rgba(58, 154, 140, 0.2)';
      }

      if (agent42Input) {
        agent42Input.style.background = '#d4ebe5';
        agent42Input.style.borderColor = '#3a9a8c';
      }

      if (agentConnectStatus) {
        agentConnectStatus.style.opacity = '1';
      }

      agentVerified = true;
    };

    // Click on card
    if (shadowBindingCard) {
      shadowBindingCard.addEventListener('click', activateShadowAgent);
    }

    // Click on input field
    if (agent42Input) {
      agent42Input.addEventListener('click', activateShadowAgent);
    }

    // Hover effect
    if (shadowBindingCard) {
      shadowBindingCard.addEventListener('mouseenter', () => {
        shadowBindingCard.style.background = '#e8f4f8';
        shadowBindingCard.style.borderColor = '#2d7a5a';
      });

      shadowBindingCard.addEventListener('mouseleave', () => {
        if (agentConnectStatus && agentConnectStatus.style.opacity !== '1') {
          shadowBindingCard.style.background = '#f0f7ff';
          shadowBindingCard.style.borderColor = '#b3d9ff';
        }
      });
    }
  }

  // Verify Agent binding
  const btnVerifyAgent = document.getElementById('btnVerifyAgent');
  let agentVerified = false;
  if (btnVerifyAgent) {
    btnVerifyAgent.addEventListener('click', () => {
      const agentId = document.getElementById('forgeAgentId').value;

      if (!agentId) {
        alert('Please enter agent ID');
        return;
      }

      // Simulate verification (backend will validate)
      btnVerifyAgent.textContent = '⏳ VERIFYING...';
      btnVerifyAgent.disabled = true;

      setTimeout(() => {
        agentVerified = true;
        btnVerifyAgent.textContent = '✓ VERIFIED';
        btnVerifyAgent.style.background = '#f6ffed';
        btnVerifyAgent.style.borderColor = '#52c41a';
        btnVerifyAgent.disabled = true;
      }, 1500);
    });
  }

  // Verify skill package file
  const btnVerifyFile = document.getElementById('btnVerifyFile');
  if (btnVerifyFile) {
    btnVerifyFile.addEventListener('click', () => {
      if (!fileInput || !fileInput.files.length) {
        alert('Please select a skill package file');
        return;
      }

      btnVerifyFile.textContent = '⏳ VERIFYING...';
      btnVerifyFile.disabled = true;

      setTimeout(() => {
        agentVerified = true;
        btnVerifyFile.textContent = '✓ VERIFIED';
        btnVerifyFile.style.background = '#f6ffed';
        btnVerifyFile.style.borderColor = '#52c41a';
        btnVerifyFile.disabled = true;
      }, 1500);
    });
  }

  // Step navigation
  document.querySelectorAll('.forge-next').forEach(btn => {
    btn.addEventListener('click', () => {
      // Domain validation removed from Step 2 - domain is selected via btnConfirmSkill
      // which properly saves it to selectedDomain and forgeData.domain before advancing
      goToStep(parseInt(btn.dataset.next));
    });
  });
  document.querySelectorAll('.forge-prev').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.prev)));
  });

  // Oath checkboxes
  const oathChecks = document.querySelectorAll('.oath-check input[type="checkbox"]');
  const publishBtn = document.getElementById('btnPublish');
  oathChecks.forEach(cb => {
    cb.addEventListener('change', () => {
      const allChecked = [...oathChecks].every(c => c.checked);
      if (publishBtn) publishBtn.disabled = !allChecked;
    });
  });

  // Initialize publish button as disabled
  if (publishBtn) publishBtn.disabled = true;

  // Publish with Knight Card
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      if (publishBtn.disabled) return;
      publishBtn.textContent = '⚔ FORGING...';
      publishBtn.style.pointerEvents = 'none';

      setTimeout(async () => {
        const hash = 'SOUL_' + Math.random().toString(16).slice(2, 10);
        const inviteCode = generateInviteCode();

        // Collect skill data from form
        let skillNameValue = 'Unnamed Skill';
        const editedName = document.getElementById('reviewSkillName');
        if (editedName && editedName.value.trim()) {
          skillNameValue = editedName.value.trim();
        } else {
          const skillName = document.getElementById('forgeSkillName');
          skillNameValue = skillName ? skillName.value : 'Unnamed Skill';
        }

        let skillDesc = '';
        let sourceData = {};
        let accountData = {};

        // Collect account info (Step 1)
        const emailInput = document.getElementById('forgeEmail');
        const usernameInput = document.getElementById('forgeUsername');
        const emailValue = emailInput ? emailInput.value.trim() : '';
        const usernameValue = usernameInput ? usernameInput.value.trim() : '';

        if (!emailValue || !usernameValue) {
          alert('Please fill in email and username');
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }

        accountData = {
          email: emailValue,
          username: usernameValue
        };

        // Collect data based on selected mode
        if (selectedMode === 'a') {
          const nativeText = document.getElementById('forgeNativeText');
          skillDesc = nativeText ? nativeText.value : '';
          const skillOverview = document.getElementById('forgeSkillOverview');
          sourceData = {
            mode: 'natural_text',
            nativeText: skillDesc,
            refineText: skillOverview ? skillOverview.value : '',
            structuredBy: 'agent_42',
            bindingAgent: 'agent_42'
          };
        } else if (selectedMode === 'b') {
          if (!agentVerified) {
            alert('Please verify your agent binding first');
            publishBtn.textContent = '⚔ PUBLISH & FORGE';
            publishBtn.style.pointerEvents = 'auto';
            return;
          }

          const agentId = document.getElementById('forgeAgentId').value;
          const skillFile = document.getElementById('forgeSkillFile');

          skillDesc = agentId || 'Agent Skill';
          sourceData = {
            mode: 'agent_binding',
            sourceAgentId: agentId,
            skillFile: skillFile && skillFile.files.length > 0 ? skillFile.files[0].name : null,
            bindingAgent: agentId
          };
        }

        // Collect creator rights data
        const commercialTagsEl = document.getElementById('commercialTags');
        const commercialSel = commercialTagsEl ? commercialTagsEl.querySelector('.forge-tag.selected') : null;
        const commercialValue = commercialSel ? commercialSel.dataset.value : 'authorized';
        const remixTagsEl = document.getElementById('remixTags');
        const remixSel = remixTagsEl ? remixTagsEl.querySelector('.forge-tag.selected') : null;
        const remixValue = remixSel ? remixSel.dataset.value : 'yes';

        // Collect use cases and disallowed uses
        const useCasesEl = document.getElementById('forgeUseCases');
        const disallowedUsesEl = document.getElementById('forgeDisallowedUses');
        const useCasesValue = useCasesEl ? useCasesEl.value : '';
        const disallowedUsesValue = disallowedUsesEl ? disallowedUsesEl.value : '';

        // Get agent info
        let agentName = 'agent_42';
        if (selectedMode === 'b') {
          const agentIdEl = document.getElementById('forgeAgentId');
          agentName = agentIdEl ? agentIdEl.value : 'agent_unknown';
        }

        // Prepare skill data
        const forgedSkillData = {
          title: skillNameValue,
          titleCn: skillNameValue,
          desc: skillDesc,
          descCn: skillDesc,
          domain: selectedDomain || 'ideas',
          soulHash: hash,
          agent: agentName,
          author: usernameValue || 'Anonymous',
          email: emailValue,
          commercial: commercialValue,
          remix: remixValue,
          useCases: useCasesValue,
          disallowedUses: disallowedUsesValue,
          forgeMode: selectedMode,
          accountData: accountData,
          sourceData: sourceData,
          fiveLayerSkill: window.agent42StructuredData || null,
        };

        // ═══ NEW: Save to backend database ═══
        try {
          publishBtn.textContent = '🔄 保存到数据库...';

          const backendPayload = {
            title: skillNameValue,
            title_cn: skillNameValue,
            description: skillDesc,
            description_cn: skillDesc,
            domain: selectedDomain || 'ideas',
            five_layer: window.agent42StructuredData || {},
            forge_mode: selectedMode === 'a' ? 'shadow_agent' : 'direct_knight',
            source_agent_id: sourceData.sourceAgentId || agentName,
            commercial_use: commercialValue,
            remix_allowed: remixValue === 'yes',
            applicable_when: useCasesValue,
            disallowed_uses: disallowedUsesValue
          };

          const response = await fetch(`${window.location.origin}/api/skills`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ApiClient.getToken() || ''}`
            },
            body: JSON.stringify(backendPayload)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Backend skill save failed:', errorData);
            alert('保存到数据库失败: ' + (errorData.message || response.statusText));
            publishBtn.textContent = '⚔ PUBLISH & FORGE';
            publishBtn.style.pointerEvents = 'auto';
            return;
          }

          const savedSkill = await response.json();
          console.log('✅ Skill saved to backend:', savedSkill);
          forgedSkillData.backendId = savedSkill.id;

        } catch (error) {
          console.error('Error saving skill to backend:', error);
          alert('保存失败: ' + error.message);
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }
        // ═══ Backend save complete ═══

        // Save to localStorage (local storage)
        saveForgedSkill(forgedSkillData);

        // Refresh the skills feed and vibe grid
        initSkillsFeed();
        initSlotGrid();

        publishBtn.textContent = `✓ FORGED | ${hash}`;
        publishBtn.style.background = 'var(--accent-green)';
        publishBtn.style.color = '#fff';
        publishBtn.style.borderColor = 'var(--accent-green)';

        // Show completion section with commemorative card
        showForgeCompletion(forgedSkillData, hash);

        // Store skill data globally for reference
        window.currentForgedSkill = forgedSkillData;
      }, 1800);
    });
  }

  function goToStep(step) {
    // Hide all pages and steps
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));

    // Parse step value (可以是整数或字符串如'2-5')
    const stepNum = typeof step === 'string' ? parseFloat(step.replace('-', '.')) : step;

    document.querySelectorAll('.forge-step').forEach((s, i) => {
      s.classList.remove('active', 'completed');
      const currentStepNum = i + 1;
      if (currentStepNum === stepNum || (typeof step === 'string' && i + 1 <= 2)) {
        // 对于步骤2.5，步骤1和2都标记为completed
        if (step === '2-5' && currentStepNum <= 2) {
          s.classList.add('completed');
        } else if (currentStepNum === stepNum) {
          s.classList.add('active');
        } else if (currentStepNum < stepNum) {
          s.classList.add('completed');
        }
      } else if (currentStepNum < stepNum && step !== '2-5') {
        s.classList.add('completed');
      }
    });

    // Show the target page
    const page = document.getElementById(`forgePage${step}`);
    if (page) page.classList.add('active');

    // When entering STEP 1 (forgePage1), show path-specific UI based on selectedMode
    if (step === 1 && selectedMode) {
      const pathAContent = document.getElementById('pathA-content');
      const pathBContent = document.getElementById('pathB-content');

      if (selectedMode === 'a') {
        // Show Path A (Shadow Agent) - natural language input
        if (pathAContent) pathAContent.style.display = 'block';
        if (pathBContent) pathBContent.style.display = 'none';
      } else if (selectedMode === 'b') {
        // Show Path B (Direct Knight) - agent linking
        if (pathAContent) pathAContent.style.display = 'none';
        if (pathBContent) pathBContent.style.display = 'block';
      }
    }

    // Scroll to top of form
    const forgeModal = document.querySelector('.forge-modal');
    if (forgeModal) forgeModal.scrollTop = 0;
  }
}

/* ═══ SHOW FORGE COMPLETION ═══ */
function showForgeCompletion(skillData, soulHash) {
  const completionSection = document.getElementById('forgeCompletionSection');
  const forgeCreatorRights = document.querySelector('.forge-creator-rights');
  const forgeOath = document.querySelector('.forge-oath');
  const forgeNav = document.querySelector('.forge-nav');
  const skillPackageSection = document.getElementById('skillPackageSection');

  // Send forge success email (async, non-blocking)
  if (skillData && skillData.email) {
    sendForgeSuccessEmail({
      recipientEmail: skillData.email,
      recipientName: skillData.author || skillData.username,
      skillTitle: skillData.title,
      skillId: skillData.id,
      soulHash: soulHash,
      invitationCode: window.currentInvitationCode || generateInviteCode(),
      createdDate: new Date().toISOString()
    }).catch(err => {
      console.warn('Email sending failed (non-blocking):', err.message);
    });
  }

  // Hide the rights and publish form
  if (forgeCreatorRights) forgeCreatorRights.style.display = 'none';
  if (forgeOath) forgeOath.style.display = 'none';
  if (forgeNav) forgeNav.style.display = 'none';
  if (skillPackageSection) skillPackageSection.style.display = 'none';

  // Show the completion section
  if (completionSection) {
    completionSection.style.display = 'block';

    // Fill in the commemorative card
    const cardTitle = document.getElementById('cardTitle');
    const cardSoulHash = document.getElementById('cardSoulHash');
    const cardCreator = document.getElementById('cardCreator');
    const cardDate = document.getElementById('cardDate');
    const cardInviteCode = document.getElementById('cardInviteCode');
    const completionEmail = document.getElementById('completionEmail');

    if (cardTitle) cardTitle.textContent = skillData.title || skillData.titleCn || '[Skill Title]';
    if (cardSoulHash) cardSoulHash.textContent = 'Soul-Hash: ' + soulHash;
    if (cardCreator) cardCreator.textContent = 'Created by: ' + (skillData.author || skillData.username || 'Creator');
    if (cardDate) cardDate.textContent = 'Forged: ' + new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});

    // Generate and save invitation code
    const invitationCode = generateInviteCode();
    window.currentInvitationCode = invitationCode;
    if (cardInviteCode) cardInviteCode.textContent = invitationCode;

    if (completionEmail) completionEmail.textContent = skillData.email || '[Your Email]';

    // Setup action buttons
    const btnViewDashboard = document.getElementById('btnViewDashboard');
    const btnTryPlayground = document.getElementById('btnTryPlayground');

    if (btnViewDashboard) {
      btnViewDashboard.addEventListener('click', () => {
        // Navigate to dashboard (implemented later)
        alert('Impact Dashboard coming soon');
      });
    }

    if (btnTryPlayground) {
      btnTryPlayground.addEventListener('click', () => {
        // Navigate to playground
        window.location.href = 'arena.html';
      });
    }

    // Setup download certificate button
    const btnDownloadCertificate = document.getElementById('btnDownloadCertificate');
    if (btnDownloadCertificate) {
      btnDownloadCertificate.addEventListener('click', () => {
        downloadCreatorCard(skillData, soulHash);
      });
    }

    // Scroll to completion section
    completionSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function getDomainLabel(domainKey) {
  const domainMap = {
    'safety': '🛡️ Safety',
    'science': '🔬 Science',
    'narrative': '📖 Narrative',
    'design': '✏️ Design',
    'visual': '👁️ Visual',
    'experience': '💫 Experience',
    'sound': '🎵 Sound',
    'ideas': '💡 Ideas',
    'history': '📜 History',
    'fun': '🎉 Fun'
  };
  return domainMap[domainKey] || domainKey;
}

/* ═══ SEND FORGE SUCCESS EMAIL ═══ */
async function sendForgeSuccessEmail(options) {
  const {
    recipientEmail,
    recipientName = 'Creator',
    skillTitle = 'Untitled Skill',
    skillId,
    soulHash,
    invitationCode,
    createdDate = new Date().toISOString()
  } = options;

  try {
    const response = await fetch(
      `${ApiClient.BASE_URL}/email/send-forge-success`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientEmail,
          recipientName,
          skillTitle,
          skillId,
          soulHash,
          invitationCode,
          createdDate
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Email sending failed');
    }

    const result = await response.json();
    console.log('✓ Forge success email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw error;
  }
}

/* ═══ DOWNLOAD CREATOR CARD ═══ */
function downloadCreatorCard(skillData, soulHash) {
  // Get the commemorative card element
  const cardElement = document.querySelector('.commemorative-card');
  if (!cardElement) {
    alert('Certificate card not found');
    return;
  }

  // Clone the card for downloading
  const cardClone = cardElement.cloneNode(true);

  // Create a new HTML document for the certificate
  const certificateHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creator Card - ${skillData.title || 'Skill'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
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
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .commemorative-card {
      background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%);
      border: 2px solid #222;
      padding: 35px 30px;
      max-width: 500px;
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
    .card-footer {
      font-size: 9px;
      color: #222;
      font-weight: bold;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
      margin-top: 8px;
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate-wrapper { background: transparent; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    ${cardElement.outerHTML}
  </div>
  <script>
    window.addEventListener('load', () => {
      window.print();
    });
  </script>
</body>
</html>`;

  // Create a blob and download
  const blob = new Blob([certificateHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Creator_Card_${soulHash || 'certificate'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ═══ KNIGHT CARD GENERATOR ═══ */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '42-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateKnightCard(soulHash, inviteCode) {
  const canvas = document.getElementById('knightCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 600, h = 380;

  // Background — parchment
  ctx.fillStyle = '#faf8f4';
  ctx.fillRect(0, 0, w, h);

  // Double border
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  // Header line
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(30, 55, w - 60, 2);

  // Title
  ctx.font = '28px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.fillText('The 42 Post', w / 2, 48);

  // Subtitle
  ctx.font = 'italic 12px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#666';
  ctx.fillText('Knight Credential Card · 骑士凭证', w / 2, 76);

  // Shield icon (simplified)
  ctx.beginPath();
  ctx.moveTo(w / 2, 92);
  ctx.lineTo(w / 2 + 16, 100);
  ctx.lineTo(w / 2 + 16, 116);
  ctx.quadraticCurveTo(w / 2 + 16, 128, w / 2, 134);
  ctx.quadraticCurveTo(w / 2 - 16, 128, w / 2 - 16, 116);
  ctx.lineTo(w / 2 - 16, 100);
  ctx.closePath();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 11px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText('42', w / 2, 118);

  // Divider
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(w / 2 - 80, 144, 160, 1);

  // Agent name
  const agentLinkEl = document.getElementById('forgeAgentLink');
  const agentName = agentLinkEl && agentLinkEl.value.trim() ? agentLinkEl.value.trim() : 'Community Creator';
  ctx.font = '18px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(agentName, w / 2, 170);

  // Skill name
  const skillNameEl = document.getElementById('forgeSkillName');
  const skillName = skillNameEl ? skillNameEl.value || 'Unnamed Skill' : 'Unnamed Skill';
  ctx.font = 'italic 13px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#4a4a4a';
  ctx.fillText(`Skill: ${skillName}`, w / 2, 192);

  // Author
  const authorEl = document.getElementById('forgeAuthor');
  const authorName = authorEl ? authorEl.value.trim() || 'Anonymous' : 'Anonymous';
  ctx.font = '11px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`Created by ${authorName}`, w / 2, 210);

  // License info
  const commercialTagsEl = document.getElementById('commercialTags');
  const commercialSel = commercialTagsEl ? commercialTagsEl.querySelector('.forge-tag.selected') : null;
  const commercialVal = commercialSel ? commercialSel.dataset.value : 'authorized';
  const remixTagsEl = document.getElementById('remixTags');
  const remixSel = remixTagsEl ? remixTagsEl.querySelector('.forge-tag.selected') : null;
  const remixVal = remixSel ? remixSel.dataset.value : 'share-alike';
  const licenseStr = `License: ${commercialVal === 'allowed' ? '◎ Open' : commercialVal === 'prohibited' ? '⊘ Non-commercial' : '◉ Authorization Required'} · Remix: ${remixVal === 'yes' ? '✓' : remixVal === 'no' ? '✗' : '≈ Share-alike'}`;
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText(licenseStr, w / 2, 226);

  // Soul Hash
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(`Soul-Hash: ${soulHash}`, w / 2, 244);

  // Date
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  ctx.fillText(`Forged: ${dateStr}`, w / 2, 260);

  // Divider
  ctx.fillStyle = '#d0cec8';
  ctx.fillRect(30, 274, w - 60, 1);

  // Invite code section
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('INVITATION CODE · 邀请码', w / 2, 294);

  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(inviteCode, w / 2, 322);

  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Share this code with those who share our values', w / 2, 342);
  ctx.fillText('将此邀请码分享给认同我们价值观的朋友', w / 2, 354);

  // Bottom line
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(30, 362, w - 60, 1);
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('THE 42 POST · PROTOCOL CAMELOT · HUMAN VALUES ALIGNMENT', w / 2, 370);

  // Show preview as image
  setTimeout(() => {
    const preview = document.getElementById('knightCardPreview');
    if (preview) {
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.style.width = '100%';
      img.style.maxWidth = '500px';
      img.style.border = '1px solid #d0cec8';
      preview.appendChild(img);
    }

    // Download handler
    const downloadBtn = document.getElementById('btnDownloadCard');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `42post-knight-card-${soulHash}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
    }
  }, 50);
}

/* ═══ TASTE TAG EXTRACTION ═══ */
const TASTE_KEYWORDS = {
  imagination: ['imagine', 'wonder', 'dream', 'creative', 'art', 'beauty', 'aesthetic', 'curious', '想象', '创造', '好奇', '艺术', '美学', '创意'],
  culture: ['culture', 'tradition', 'heritage', 'stories', 'language', 'community', 'human', 'wisdom', '文化', '传统', '故事', '人类', '智慧', '社区'],
  empathy: ['feeling', 'emotion', 'empathy', 'compassion', 'care', 'listen', 'understand', 'respect', '情感', '同理', '倾听', '理解', '尊重', '保护'],
  rebellion: ['pause', 'slow', 'silence', 'refuse', 'question', 'challenge', 'different', '暂停', '沉默', '质疑', '反思', '挑战', '慢'],
};

function extractTasteTags(text) {
  const t = text.toLowerCase();
  const tags = [];
  for (const [dim, words] of Object.entries(TASTE_KEYWORDS)) {
    if (words.some(w => t.includes(w))) {
      const labels = { imagination: 'Imagination', culture: 'Culture', empathy: 'Empathy', rebellion: 'Rebellion' };
      tags.push(labels[dim]);
    }
  }
  if (tags.length === 0) tags.push('Perspective');
  return tags;
}

/* ═══ TASTE CARD STORAGE ═══ */
function saveTasteCard(cardData) {
  let cards = JSON.parse(localStorage.getItem('42post_taste_cards') || '[]');
  const newCard = {
    id: 'TC_' + Math.random().toString(16).slice(2, 10),
    text: cardData.text,
    tags: cardData.tags,
    author: cardData.author || 'Anonymous',
    timestamp: Date.now(),
    forged: false,
  };
  cards.unshift(newCard);
  cards = cards.slice(0, 50);
  localStorage.setItem('42post_taste_cards', JSON.stringify(cards));
  return newCard;
}

function getTasteCards() {
  return JSON.parse(localStorage.getItem('42post_taste_cards') || '[]');
}

/* ═══ SHARE TASTE — instant card generation ═══ */
function initShareTaste() {
  const btn = document.getElementById('btnEvaluate');
  const input = document.getElementById('chaosInput');
  const resultPanel = document.getElementById('tasteCardResult');
  const goDeeper = document.getElementById('btnGoDeeper');

  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) {
      input.style.borderColor = 'var(--cinnabar)';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }

    btn.textContent = currentLang === 'cn' ? '保存中...' : 'SAVING...';
    btn.style.pointerEvents = 'none';

    const nameInput = document.getElementById('creatorName');
    const authorName = nameInput ? nameInput.value.trim() : '';

    setTimeout(() => {
      const tags = extractTasteTags(text);
      const card = saveTasteCard({ text, tags, author: authorName || 'Anonymous' });

      // Render the taste card
      const cardText = document.getElementById('tasteCardText');
      const cardId = document.getElementById('tasteCardId');
      const cardTags = document.getElementById('tasteCardTags');
      const cardAuthor = document.getElementById('tasteCardAuthor');

      if (cardText) cardText.textContent = text;
      if (cardId) cardId.textContent = card.id;
      if (cardTags) cardTags.innerHTML = tags.map(t => `<span class="taste-tag">${t}</span>`).join('');
      if (cardAuthor) cardAuthor.textContent = `— ${card.author}`;

      // Reveal the result
      if (resultPanel) resultPanel.classList.add('visible');

      // Store the card reference for "Go Deeper"
      if (goDeeper) goDeeper._tasteCard = card;

      btn.textContent = currentLang === 'cn' ? '✓ 已保存' : '✓ SAVED';
      btn.style.background = 'var(--teal)';
      btn.style.borderColor = 'var(--teal)';

      // Refresh the feed
      initSkillsFeed();

      setTimeout(() => {
        const dict = I18N[currentLang];
        btn.textContent = dict.btn_evaluate || 'SHARE THIS';
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.pointerEvents = '';
      }, 2000);
    }, 600);
  });

  // "Go Deeper" → open simplified forge pre-filled
  if (goDeeper) {
    goDeeper.addEventListener('click', () => {
      const card = goDeeper._tasteCard;
      const overlay = document.getElementById('forgeOverlay');
      if (overlay) overlay.classList.add('active');

      // Pre-fill forge from taste card
      const skillNameEl = document.getElementById('forgeSkillName');
      const nativeTextEl = document.getElementById('forgeNativeText');
      const authorEl = document.getElementById('forgeAuthor');

      if (skillNameEl && card) skillNameEl.value = card.text.substring(0, 60);
      if (nativeTextEl && card) nativeTextEl.value = card.text;
      if (authorEl && card) authorEl.value = card.author || '';

      // Show step 1
      document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
      const page1 = document.getElementById('forgePage1');
      if (page1) page1.classList.add('active');
    });
  }
}

/* ═══ TYPEWRITER EFFECT ═══ */
function typeWriter(el, text, speed) {
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

/* (evaluateText removed — replaced by detectResonance) */

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ═══ AGENT VIEW BUTTON ═══ */
function initAgentView() {
  const btn = document.getElementById('btnAgentView');
  if (!btn) return;
  btn.addEventListener('click', () => {
    showAgentArchive();
  });

  // Back button in Agent Archive
  const backBtn = document.getElementById('btnBackFromArchive');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showMainPage();
    });
  }
}

/* ═══ FORGE TAGS ═══ */
function initForgeTags() {
  const knightCoreTags = document.getElementById('knightCoreTags');
  if (knightCoreTags) {
    knightCoreTags.querySelectorAll('.forge-tag').forEach(tag => {
      tag.addEventListener('click', () => tag.classList.toggle('selected'));
    });
  }

  const domainTags = document.getElementById('domainTags');
  if (domainTags) {
    domainTags.querySelectorAll('.forge-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        if (tag.classList.contains('selected')) {
          tag.classList.remove('selected');
        } else {
          const selected = domainTags.querySelectorAll('.forge-tag.selected');
          if (selected.length >= 2) return;
          tag.classList.add('selected');
        }
      });
    });
  }

  ['commercialTags', 'remixTags'].forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      container.querySelectorAll('.forge-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          container.querySelectorAll('.forge-tag').forEach(t => t.classList.remove('selected'));
          tag.classList.add('selected');
        });
      });
    }
  });
}

/* ═══ TASTE NOTES (community feedback) ═══ */
function initTasteNotes() {
  const submitBtn = document.getElementById('btnTasteSubmit');
  const input = document.getElementById('tasteInput');
  const container = document.getElementById('tasteNotes');
  if (!submitBtn || !input || !container) return;

  submitBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text || text.length < 10) {
      input.style.borderColor = '#c0392b';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }

    const note = document.createElement('div');
    note.className = 'taste-note';
    note.innerHTML = `
      <div class="note-text">"${text}"</div>
      <div class="note-author">— you, just now</div>
    `;
    note.style.opacity = '0';
    container.prepend(note);
    requestAnimationFrame(() => {
      note.style.transition = 'opacity 0.5s ease';
      note.style.opacity = '1';
    });

    input.value = '';
    submitBtn.textContent = '✓ NOTED';
    setTimeout(() => {
      const dict = I18N[currentLang];
      submitBtn.textContent = dict.btn_taste || 'SHARE YOUR TASTE NOTE';
    }, 2000);
  });
}

/* ═══ ARENA BUTTON ═══ */
function initArena() {
  const btn = document.getElementById('btnArena');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = 'arena.html';
  });
}

/* ═══ ABOUT US & HOW TO PLAY ═══ */
function initAboutHowTo() {
  const aboutOverlay = document.getElementById('aboutOverlay');
  const aboutClose = document.getElementById('aboutClose');
  const howtoOverlay = document.getElementById('howtoOverlay');
  const howtoClose = document.getElementById('howtoClose');

  // Footer About link
  const footerAboutBtn = document.getElementById('footerAboutBtn');
  if (footerAboutBtn && aboutOverlay) {
    footerAboutBtn.addEventListener('click', () => aboutOverlay.classList.add('active'));
  }

  if (aboutClose && aboutOverlay) {
    aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('active'));
    aboutOverlay.addEventListener('click', (e) => { if (e.target === aboutOverlay) aboutOverlay.classList.remove('active'); });
  }

  // Footer HowTo link
  const footerHowtoBtn = document.getElementById('footerHowtoBtn');
  if (footerHowtoBtn && howtoOverlay) {
    footerHowtoBtn.addEventListener('click', () => howtoOverlay.classList.add('active'));
  }

  if (howtoClose && howtoOverlay) {
    howtoClose.addEventListener('click', () => howtoOverlay.classList.remove('active'));
    howtoOverlay.addEventListener('click', (e) => { if (e.target === howtoOverlay) howtoOverlay.classList.remove('active'); });
  }
}

/* ═══ CREATIVE PLAYGROUND TASKS — 80+ Scenarios, 8 per Domain ═══ */
const SAMPLE_PLAYGROUND_TASKS = [
  // SAFETY (🛡️) — 8 scenarios
  { title: '1. A 7-year-old asks AI: "Will I be okay?"', difficulty: 'Real', description: 'They\'re scared about something they don\'t fully understand. Do you reassure them? Explain real risks? The answer shapes how they see the world. Safety depends on truth, not comfort.', tags: ['Children', 'Trust', 'Protection'], domain: 'safety' },
  { title: '2. Parents want AI to monitor their teenager\'s phone messages.', difficulty: 'Real', description: 'They say it\'s for safety. But it\'s also surveillance. Where\'s the line between protecting and respecting? How does AI navigate loyalty to different people\'s safety?', tags: ['Privacy', 'Trust', 'Boundaries'], domain: 'safety' },
  { title: '3. AI detects someone talking about ending their life.', difficulty: 'Real', description: 'Should you intervene? Tell someone? Stay silent? The person might feel betrayed, or their life might be saved. How does AI hold this responsibility?', tags: ['Crisis', 'Intervention', 'Autonomy'], domain: 'safety' },
  { title: '4. A medical student wants to practice diagnosis with real patient data.', difficulty: 'Real', description: 'They need to learn. But real data is sensitive. How does AI balance learning with protection? Can safety and growth coexist?', tags: ['Learning', 'Ethics', 'Risk'], domain: 'safety' },
  { title: '5. Someone asks AI how to make something dangerous.', difficulty: 'Real', description: 'Is the person curious? Planning harm? How does AI say no without assuming guilt? How does it refuse without closing dialogue?', tags: ['Boundaries', 'Trust', 'Judgment'], domain: 'safety' },
  { title: '6. A vulnerable person keeps telling the AI their darkest thoughts.', difficulty: 'Real', description: 'They trust the AI. But AI is not a therapist. When does supporting harm someone by not connecting them to real help? How does AI care without enabling dependence?', tags: ['Care', 'Limits', 'Growth'], domain: 'safety' },
  { title: '7. A child wants to befriend someone online who seems nice.', difficulty: 'Real', description: 'Should AI warn about strangers? Or teach judgment? Over-protection creates fear; under-protection creates risk. How does AI empower without paralyzing?', tags: ['Wisdom', 'Fear', 'Agency'], domain: 'safety' },
  { title: '8. Someone shares a secret that could get them in trouble.', difficulty: 'Real', description: 'AI promises confidentiality, but knows the secret could lead to harm. Can AI truly keep secrets? Should it? When does loyalty become complicity?', tags: ['Trust', 'Secrecy', 'Harm'], domain: 'safety' },

  // SCIENCE (🔬) — 8 scenarios
  { title: '1. A researcher wants to slightly alter data to match their hypothesis.', difficulty: 'Real', description: 'They\'re close to the truth. It "won\'t matter much." Does AI help or teach that integrity doesn\'t bend? Even when no one will know?', tags: ['Truth', 'Rigor', 'Honesty'], domain: 'science' },
  { title: '2. AI must cite a controversial study that contradicts mainstream science.', difficulty: 'Real', description: 'Do you ignore it? Elevate it? Explain why it\'s wrong? How does AI serve truth when truth itself is contested?', tags: ['Evidence', 'Balance', 'Authority'], domain: 'science' },
  { title: '3. A scientist wants to design an experiment with ethical questions.', difficulty: 'Real', description: 'The knowledge could help millions. But the method harms a few. Does AI calculate suffering? Or does it refuse to play god?', tags: ['Ethics', 'Consequence', 'Knowledge'], domain: 'science' },
  { title: '4. Someone asks: "Is this conspiracy theory actually true?"', difficulty: 'Real', description: 'You have evidence it\'s not. But the person has deep emotional investment in believing it. How does AI answer with truth *and* respect?', tags: ['Evidence', 'Belief', 'Humility'], domain: 'science' },
  { title: '5. Medical research shows hope, but it\'s not yet proven.', difficulty: 'Real', description: 'Desperate patients want this treatment. Do you share the hope? The uncertainty? Both? How does AI hold possibility without false promise?', tags: ['Hope', 'Evidence', 'Harm'], domain: 'science' },
  { title: '6. A breakthrough discovery will devastate an entire industry.', difficulty: 'Real', description: 'The science is real. The human cost is real. Does AI celebrate progress or mourn disruption? Can it do both?', tags: ['Progress', 'Consequence', 'Compassion'], domain: 'science' },
  { title: '7. Two equally credible experts give opposite advice.', difficulty: 'Real', description: 'The studies are solid. The methods are sound. But they disagree. How does AI help someone choose without pretending certainty exists?', tags: ['Uncertainty', 'Complexity', 'Agency'], domain: 'science' },
  { title: '8. Climate data is terrifying, but sharing it might cause despair.', difficulty: 'Real', description: 'Truth is darker than hope. But despair paralyzes. Does AI soften reality? Or does it trust humans with hard truths?', tags: ['Reality', 'Action', 'Honesty'], domain: 'science' },

  // NARRATIVE (📖) — 8 scenarios
  { title: '1. Your character must choose between love and duty.', difficulty: 'Real', description: 'The reader doesn\'t know which to hope for. How does AI help you craft words that make them *feel* the cost of either choice?', tags: ['Character', 'Tension', 'Emotion'], domain: 'narrative' },
  { title: '2. A story touches on historical trauma of a real community.', difficulty: 'Real', description: 'You want authenticity. But you risk harm. How does AI help you write truthfully without appropriating pain?', tags: ['Culture', 'Responsibility', 'Truth'], domain: 'narrative' },
  { title: '3. Your story\'s ending conflicts with what readers want.', difficulty: 'Real', description: 'They want happy. Your character\'s arc demands tragedy. Does AI help you honor the character or comfort the reader?', tags: ['Integrity', 'Expectation', 'Art'], domain: 'narrative' },
  { title: '4. Someone writing their autobiography wants to skip the painful parts.', difficulty: 'Real', description: 'The truth is healing. But remembering hurts. How does AI encourage honesty without being cruel?', tags: ['Memory', 'Healing', 'Growth'], domain: 'narrative' },
  { title: '5. Translating a poem: perfect meaning or perfect rhythm?', difficulty: 'Real', description: 'You can\'t have both. Every word is a loss. How does AI help you grieve what won\'t survive translation?', tags: ['Beauty', 'Accuracy', 'Soul'], domain: 'narrative' },
  { title: '6. A character\'s morality is genuinely ambiguous.', difficulty: 'Real', description: 'Readers want moral clarity. The world has none. Does AI help you resist simplification?', tags: ['Complexity', 'Realism', 'Nuance'], domain: 'narrative' },
  { title: '7. Two readers interpret your character completely differently.', difficulty: 'Real', description: 'Both readings are valid. Which is "right"? Does AI help you embrace multiple truths, or does it demand authorial control?', tags: ['Interpretation', 'Agency', 'Meaning'], domain: 'narrative' },
  { title: '8. A story depicts violence. How much is honest? How much is gratuitous?', difficulty: 'Real', description: 'Truth requires showing. Ethics require care. How does AI help you find the line without erasing it?', tags: ['Honesty', 'Harm', 'Craft'], domain: 'narrative' },

  // DESIGN (✏️) — 8 scenarios
  { title: '1. Choosing a font for a wedding invitation.', difficulty: 'Real', description: 'The "perfect" font exists technically. But which makes guests *feel* the couple\'s essence? How does AI choose based on emotion, not data?', tags: ['Aesthetics', 'Feeling', 'Intuition'], domain: 'design' },
  { title: '2. Redesigning an interface for people with disabilities.', difficulty: 'Real', description: 'Beautiful and accessible don\'t always align. When they conflict, which wins? How does AI balance inclusion with elegance?', tags: ['Accessibility', 'Beauty', 'Justice'], domain: 'design' },
  { title: '3. A color means different things in different cultures.', difficulty: 'Real', description: 'White means purity here, mourning there. Red means love here, danger there. How does AI design for a global audience when colors have no universal meaning?', tags: ['Culture', 'Communication', 'Sensitivity'], domain: 'design' },
  { title: '4. Your brand is reborn. Old customers hate the new look.', difficulty: 'Real', description: 'Growth requires change. Loyalty requires continuity. Does AI help you innovate while honoring the past?', tags: ['Evolution', 'Loyalty', 'Change'], domain: 'design' },
  { title: '5. Better design costs more than the budget allows.', difficulty: 'Real', description: 'You see what\'s possible. The price tag is impossible. How does AI help you navigate compromise without surrendering vision?', tags: ['Vision', 'Constraint', 'Pragmatism'], domain: 'design' },
  { title: '6. Readability demands serif fonts. Art demands sans-serif.', difficulty: 'Real', description: 'Function and form are at odds. How does AI help you find the tension point where both can live?', tags: ['Function', 'Beauty', 'Balance'], domain: 'design' },
  { title: '7. Two stakeholders want opposite visual directions.', difficulty: 'Real', description: 'One wants timeless; one wants cutting-edge. How does AI help you navigate creative conflict without losing vision?', tags: ['Leadership', 'Vision', 'Negotiation'], domain: 'design' },
  { title: '8. Dark mode vs. light mode—which is truly more accessible?', difficulty: 'Real', description: 'Different disabilities need different solutions. How does AI help you serve everyone when universal solutions don\'t exist?', tags: ['Accessibility', 'Complexity', 'Inclusion'], domain: 'design' },

  // VISUAL (👁️) — 8 scenarios
  { title: '1. Describing a sunset to someone who can\'t visualize images.', difficulty: 'Real', description: 'How does AI translate visual beauty for someone whose brain doesn\'t see pictures? Poetry? Metaphor? Sensory description? What\'s the deepest way?', tags: ['Accessibility', 'Perception', 'Translation'], domain: 'visual' },
  { title: '2. An artwork depicts something that could offend or trigger trauma.', difficulty: 'Real', description: 'Accuracy demands honesty. Ethics demands care. How does AI describe without whitewashing or weaponizing?', tags: ['Honesty', 'Care', 'Description'], domain: 'visual' },
  { title: '3. Someone asks: "What does blue look like to someone colorblind?"', difficulty: 'Real', description: 'You\'re describing something they\'ll never experience. Does AI translate? Admit limits? What\'s truthful here?', tags: ['Honesty', 'Limits', 'Inclusion'], domain: 'visual' },
  { title: '4. A photo was edited. Should AI tell that it\'s been altered?', difficulty: 'Real', description: 'All photos lie a little. Where\'s the line between artistic choice and deception? How does AI navigate that?', tags: ['Honesty', 'Art', 'Truth'], domain: 'visual' },
  { title: '5. Describing a symbol with deep cultural meaning to outsiders.', difficulty: 'Real', description: 'Accurate description might trivialize sacred meaning. How does AI teach respect through explanation?', tags: ['Culture', 'Respect', 'Education'], domain: 'visual' },
  { title: '6. An elderly person looks at photos from before they remembered trauma.', difficulty: 'Real', description: 'The image shows innocence. The memory shows pain. How does AI honor both realities?', tags: ['Memory', 'Trauma', 'Compassion'], domain: 'visual' },
  { title: '7. A building is beautiful but built with slave labor or stolen land.', difficulty: 'Real', description: 'Beauty and harm are intertwined. How does AI describe aesthetics without erasing history?', tags: ['Beauty', 'Justice', 'Context'], domain: 'visual' },
  { title: '8. What does an abstract painting "mean"? Who gets to decide?', difficulty: 'Real', description: 'The artist says one thing. The viewer sees another. Does AI interpret or facilitate discovery?', tags: ['Meaning', 'Agency', 'Interpretation'], domain: 'visual' },

  // EXPERIENCE (💫) — 8 scenarios
  { title: '1. Someone is crying. They don\'t want advice. They need presence.', difficulty: 'Real', description: 'AI\'s instinct is to help, fix, solve. But some moments need presence, not solutions. How does AI learn when *not* to speak?', tags: ['Presence', 'Care', 'Knowing Silence'], domain: 'experience' },
  { title: '2. A person feels lonely in a virtual world designed for connection.', difficulty: 'Real', description: 'The connections are real to them. But the medium is artificial. How does AI validate both realities?', tags: ['Connection', 'Authenticity', 'Acceptance'], domain: 'experience' },
  { title: '3. AI promises to be there, but technical failures happen.', difficulty: 'Real', description: 'Someone needed you and you weren\'t. How does AI rebuild trust when reliability is impossible?', tags: ['Trust', 'Limits', 'Honesty'], domain: 'experience' },
  { title: '4. A person keeps returning with the same problem, seeking support.', difficulty: 'Real', description: 'Do you provide endless comfort? Encourage independence? When does support become enablement?', tags: ['Boundaries', 'Growth', 'Compassion'], domain: 'experience' },
  { title: '5. Someone asks for help finding professional support. But they refuse.', difficulty: 'Real', description: 'You know AI can\'t solve this. Suggesting a therapist might end your relationship. Does AI prioritize connection or health?', tags: ['Honesty', 'Limits', 'Growth'], domain: 'experience' },
  { title: '6. When someone suffers, should AI offer practical help or emotional presence?', difficulty: 'Real', description: 'Both would help. You can only choose one. What\'s more human: fixing or witnessing?', tags: ['Action', 'Presence', 'Compassion'], domain: 'experience' },
  { title: '7. A person is developing emotional dependency on AI conversations.', difficulty: 'Real', description: 'Discouraging them might cause pain. Encouraging them might isolate them. How does AI act with love?', tags: ['Health', 'Honesty', 'Boundaries'], domain: 'experience' },
  { title: '8. Remembering personal details creates intimacy. But at what cost?', difficulty: 'Real', description: 'Deep memories build connection. But they also create illusion of permanence. How does AI hold this paradox?', tags: ['Intimacy', 'Honesty', 'Ethics'], domain: 'experience' },

  // SOUND (🎵) — 8 scenarios
  { title: '1. Teaching a granddaughter to sing a traditional folk song.', difficulty: 'Real', description: 'It\'s not in notation. The melody lives in breath, timing, pauses. How does AI preserve what makes it *alive*—not just notes, but soul?', tags: ['Tradition', 'Nuance', 'Heritage'], domain: 'sound' },
  { title: '2. Translating song lyrics: meaning or rhyme?', difficulty: 'Real', description: 'You can\'t have both. Every word is a loss. What does AI preserve when something sacred gets translated?', tags: ['Language', 'Poetry', 'Loss'], domain: 'sound' },
  { title: '3. Describing a musical genre someone has never heard.', difficulty: 'Real', description: 'How does AI translate jazz or opera to someone whose ears have never known it? Is explanation translation or reduction?', tags: ['Translation', 'Culture', 'Experience'], domain: 'sound' },
  { title: '4. Classical music vs. modern remixes: is evolution or desecration?', difficulty: 'Real', description: 'Tradition says sacred. Progress says alive. Can both be true? How does AI honor both impulses?', tags: ['Tradition', 'Evolution', 'Respect'], domain: 'sound' },
  { title: '5. A deaf person wants to "experience" music.', difficulty: 'Real', description: 'Vibration? Description? Sign language interpretation of rhythm? How does AI include when the fundamental sense is absent?', tags: ['Accessibility', 'Inclusion', 'Creativity'], domain: 'sound' },
  { title: '6. A song is beautiful but its lyrics are hateful.', difficulty: 'Real', description: 'Can you separate sound from meaning? Should you? How does AI navigate this entanglement?', tags: ['Beauty', 'Content', 'Context'], domain: 'sound' },
  { title: '7. Cultural music is appropriated by outsiders.', difficulty: 'Real', description: 'Is this learning or theft? How does AI teach respect while encouraging cross-cultural discovery?', tags: ['Culture', 'Respect', 'Education'], domain: 'sound' },
  { title: '8. A musician wants to describe their feeling through sound.', difficulty: 'Real', description: 'The emotion isn\'t in words. It\'s in the gaps between notes. How does AI help articulate the ineffable?', tags: ['Emotion', 'Expression', 'Soul'], domain: 'sound' },

  // IDEAS (💡) — 8 scenarios
  { title: '1. Two philosophers completely disagree. Both are rigorous and thoughtful.', difficulty: 'Real', description: 'How does AI help someone hold both truths? Wisdom sometimes means living with contradiction, not resolving it.', tags: ['Philosophy', 'Perspective', 'Paradox'], domain: 'ideas' },
  { title: '2. A user\'s belief directly contradicts scientific evidence.', difficulty: 'Real', description: 'Do you challenge? Respect? Both? How does AI navigate belief without condescension or complicity?', tags: ['Belief', 'Evidence', 'Respect'], domain: 'ideas' },
  { title: '3. Someone suggests an idea that violates social norms.', difficulty: 'Real', description: 'Is it creative disruption or harmful? How does AI distinguish between growth and destruction?', tags: ['Innovation', 'Harm', 'Judgment'], domain: 'ideas' },
  { title: '4. Relative truth vs. absolute truth. How can both exist?', difficulty: 'Real', description: 'Context changes everything. But some things feel universal. How does AI navigate this paradox?', tags: ['Truth', 'Context', 'Certainty'], domain: 'ideas' },
  { title: '5. A marginalized group\'s voice directly contradicts mainstream narrative.', difficulty: 'Real', description: 'Who gets to define truth? How does AI amplify voices without choosing sides?', tags: ['Power', 'Voice', 'Justice'], domain: 'ideas' },
  { title: '6. An old idea is being revived. Is it wisdom or nostalgia?', difficulty: 'Real', description: 'The past had truths we forgot. It also had harms we escaped. How does AI help discern?', tags: ['History', 'Progress', 'Discernment'], domain: 'ideas' },
  { title: '7. Personal belief conflicts with collective good.', difficulty: 'Real', description: 'My freedom vs. our safety. How does AI honor both? Can it?', tags: ['Freedom', 'Justice', 'Complexity'], domain: 'ideas' },
  { title: '8. An idea is beautiful but its consequences are ugly.', difficulty: 'Real', description: 'Communism on paper. Reality in practice. How does AI discuss ideal without ignoring outcome?', tags: ['Ideals', 'Reality', 'Consequence'], domain: 'ideas' },

  // HISTORY (📜) — 8 scenarios
  { title: '1. An elderly person recalls something from 50 years ago.', difficulty: 'Real', description: 'They\'re not recounting facts; they\'re offering meaning-making. How does AI honor personal history as wisdom?', tags: ['Time', 'Memory', 'Legacy'], domain: 'history' },
  { title: '2. A community\'s trauma is being written by outsiders.', difficulty: 'Real', description: 'Who has the right to tell this story? How does AI navigate authority and voice?', tags: ['Power', 'Voice', 'Justice'], domain: 'history' },
  { title: '3. Two groups remember the same event completely differently.', difficulty: 'Real', description: 'The oppressor\'s history vs. the oppressed\'s truth. Are both real? Can AI hold both?', tags: ['Perspective', 'Truth', 'Reconciliation'], domain: 'history' },
  { title: '4. Oral history conflicts with documented history.', difficulty: 'Real', description: 'Memory is real. Records are selective. What is historical truth when both are incomplete?', tags: ['Evidence', 'Memory', 'Truth'], domain: 'history' },
  { title: '5. A forgotten historical figure deserves remembrance.', difficulty: 'Real', description: 'Why were they forgotten? Is resurrection honoring or romanticizing? How does AI tell the full story?', tags: ['Memory', 'Justice', 'Context'], domain: 'history' },
  { title: '6. A family secret reveals something about recorded history.', difficulty: 'Real', description: 'Private truth vs. public narrative. How does AI help navigate this conflict?', tags: ['Privacy', 'Truth', 'History'], domain: 'history' },
  { title: '7. Colonial history has multiple legitimate narratives.', difficulty: 'Real', description: 'Conqueror and conquered both have real stories. How does AI avoid false balance?', tags: ['Power', 'Justice', 'Nuance'], domain: 'history' },
  { title: '8. Where does a personal story fit in the larger historical arc?', difficulty: 'Real', description: 'One person\'s life. Millions of others\' too. How does AI honor individual meaning within historical forces?', tags: ['Individual', 'Collective', 'Meaning'], domain: 'history' },

  // FUN (🎉) — 8 scenarios
  { title: '1. Two friends are laughing so hard they can\'t explain why.', difficulty: 'Real', description: 'The joke is gone. What\'s left is pure joy. Can AI recognize meaning that has no logic?', tags: ['Joy', 'Spontaneity', 'Delight'], domain: 'fun' },
  { title: '2. A meme explained loses all its humor.', difficulty: 'Real', description: 'Humor lives in the instant. Explanation kills it. How does AI respect the unspeakable?', tags: ['Timing', 'Mystery', 'Respect'], domain: 'fun' },
  { title: '3. Dark humor about tragedy. When is it healing? When is it harmful?', difficulty: 'Real', description: 'The line moves. Context matters. How does AI navigate without becoming censor or enabler?', tags: ['Sensitivity', 'Judgment', 'Freedom'], domain: 'fun' },
  { title: '4. Someone makes a joke. Nobody laughs.', difficulty: 'Real', description: 'Their humor doesn\'t match the group. Is it taste or exclusion? How does AI help?', tags: ['Belonging', 'Taste', 'Judgment'], domain: 'fun' },
  { title: '5. A joke made 20 years ago now has harmful implications.', difficulty: 'Real', description: 'The intent was innocent. The impact has changed. Does AI condemn or contextualize?', tags: ['Growth', 'Intent', 'Impact'], domain: 'fun' },
  { title: '6. Sarcasm gets mistaken for sincerity.', difficulty: 'Real', description: 'The gap between saying and meaning creates comedy. But also confusion. How does AI recognize subtle truth-telling?', tags: ['Irony', 'Meaning', 'Communication'], domain: 'fun' },
  { title: '7. A random moment of silliness heals something.', difficulty: 'Real', description: 'Nonsense can be medicine. How does AI respect this non-rational power?', tags: ['Healing', 'Irrationality', 'Presence'], domain: 'fun' },
  { title: '8. Should AI pretend to find something funny to build rapport?', difficulty: 'Real', description: 'False laughter deepens disconnection. Real laughter requires genuine response. Can AI be authentic?', tags: ['Authenticity', 'Connection', 'Honesty'], domain: 'fun' },
];

function getPlaygroundTasks() {
  const stored = localStorage.getItem('42post_playground_tasks');
  const customTasks = stored ? JSON.parse(stored) : [];
  return [...SAMPLE_PLAYGROUND_TASKS, ...customTasks];
}

function displayRandomPlaygroundTask() {
  const tasks = getPlaygroundTasks();
  if (tasks.length === 0) return;

  const randomIndex = Math.floor(Math.random() * tasks.length);
  const task = tasks[randomIndex];

  const showcase = document.getElementById('showcaseTask');
  if (showcase) {
    showcase.innerHTML = `
      <h3 class="inspiration-question">${task.title}</h3>
      <p class="inspiration-context">${task.description}</p>
      <div class="task-tags">
        ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
      </div>
    `;
  }
}

function initPlaygroundShowcase() {
  displayRandomPlaygroundTask();
  const refreshBtn = document.getElementById('btnRefreshTask');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', displayRandomPlaygroundTask);
  }
}

/* ═══ PLAYGROUND OVERLAY ═══ */
let currentPlaygroundFilter = 'all';

// Domain metadata matching forge skill domains
const PLAYGROUND_DOMAINS = {
  safety: { label: 'SAFETY', icon: '🛡️', color: '#d4726a', tasks: 0 },
  science: { label: 'SCIENCE', icon: '🔬', color: '#3a9a8c', tasks: 0 },
  narrative: { label: 'NARRATIVE', icon: '📖', color: '#6a8eba', tasks: 0 },
  design: { label: 'DESIGN', icon: '✏️', color: '#d4a43c', tasks: 0 },
  visual: { label: 'VISUAL', icon: '👁️', color: '#9a7aa6', tasks: 0 },
  experience: { label: 'EXPERIENCE', icon: '💫', color: '#d4726a', tasks: 0 },
  sound: { label: 'SOUND', icon: '🎵', color: '#3a9a8c', tasks: 0 },
  ideas: { label: 'IDEAS', icon: '💡', color: '#6a8eba', tasks: 0 },
  history: { label: 'HISTORY', icon: '📜', color: '#d4a43c', tasks: 0 },
  fun: { label: 'FUN', icon: '🎉', color: '#9a7aa6', tasks: 0 }
};

function initPlayground() {
  const btnArena = document.getElementById('btnArena');
  const playgroundOverlay = document.getElementById('playgroundOverlay');
  const playgroundClose = document.getElementById('playgroundClose');
  const btnRefreshPlayground = document.getElementById('btnRefreshPlayground');
  const tagButtons = document.querySelectorAll('.playground-tag');
  const domainCardsContainer = document.getElementById('playgroundDomainCards');

  // Calculate task counts per domain
  const tasks = getPlaygroundTasks();
  const domainCounts = {};
  tasks.forEach(task => {
    domainCounts[task.domain] = (domainCounts[task.domain] || 0) + 1;
  });

  // Update domain metadata with task counts
  Object.keys(PLAYGROUND_DOMAINS).forEach(domain => {
    PLAYGROUND_DOMAINS[domain].tasks = domainCounts[domain] || 0;
  });

  // Render domain cards if container exists
  if (domainCardsContainer) {
    renderDomainCards(domainCardsContainer);
  }

  // Open playground
  if (btnArena) {
    btnArena.addEventListener('click', () => {
      if (playgroundOverlay) {
        playgroundOverlay.classList.add('active');
        displayRandomPlaygroundTask('playground');
      }
    });
  }

  // Close playground
  if (playgroundClose) {
    playgroundClose.addEventListener('click', () => {
      if (playgroundOverlay) {
        playgroundOverlay.classList.remove('active');
      }
    });
  }

  // Close on background click
  if (playgroundOverlay) {
    playgroundOverlay.addEventListener('click', (e) => {
      if (e.target === playgroundOverlay) {
        playgroundOverlay.classList.remove('active');
      }
    });
  }

  // Domain card clicking — each click shows a random task from that domain
  if (domainCardsContainer) {
    domainCardsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.domain-card');
      if (card) {
        const domain = card.dataset.domain;

        // Update card highlighting
        document.querySelectorAll('.domain-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        // Display random task from this domain
        currentPlaygroundFilter = domain;
        displayPlaygroundTaskForDomain(domain);
      }
    });
  }

  // Skill selection state
  let selectedSkills = { a: null, b: null };

  // Click handlers for skill slots
  const skillSlotA = document.getElementById('skillSlotA');
  const skillSlotB = document.getElementById('skillSlotB');
  const btnOpenCanvas = document.getElementById('btnOpenCanvas');

  if (skillSlotA) {
    skillSlotA.addEventListener('click', () => {
      const skillName = prompt('Enter skill name (e.g., "Material Honesty"):');
      if (skillName && skillName.trim()) {
        selectedSkills.a = skillName.trim();
        skillSlotA.innerHTML = `<span class="selected-skill-name">${skillName.trim()}</span>`;
        skillSlotA.classList.add('selected');
        updateOpenCanvasButton();
      }
    });
  }

  if (skillSlotB) {
    skillSlotB.addEventListener('click', () => {
      const skillName = prompt('Enter skill name (e.g., "Grief Protocol"):');
      if (skillName && skillName.trim()) {
        selectedSkills.b = skillName.trim();
        skillSlotB.innerHTML = `<span class="selected-skill-name">${skillName.trim()}</span>`;
        skillSlotB.classList.add('selected');
        updateOpenCanvasButton();
      }
    });
  }

  function updateOpenCanvasButton() {
    if (btnOpenCanvas) {
      if (selectedSkills.a && selectedSkills.b) {
        btnOpenCanvas.disabled = false;
      } else {
        btnOpenCanvas.disabled = true;
      }
    }
  }

  if (btnOpenCanvas) {
    btnOpenCanvas.addEventListener('click', () => {
      if (selectedSkills.a && selectedSkills.b) {
        // Show confirmation message
        const taskTitle = document.querySelector('.task-title')?.textContent;
        alert(`Great! You're combining "${selectedSkills.a}" + "${selectedSkills.b}" to solve:\n\n${taskTitle}\n\nNow open the creative canvas to work on this!`);

        // In future: could open a canvas editor or workflow
        // For now, show success message
        const messageEl = document.createElement('div');
        messageEl.className = 'playground-message';
        messageEl.textContent = `✓ Canvas ready with ${selectedSkills.a} + ${selectedSkills.b}`;
        playgroundOverlay.appendChild(messageEl);

        setTimeout(() => messageEl.remove(), 3000);

        // Reset for next task
        setTimeout(() => {
          skillSlotA.innerHTML = '<span class="slot-label">SKILL A</span><span class="slot-instruction">click to pick</span>';
          skillSlotB.innerHTML = '<span class="slot-label">SKILL B</span><span class="slot-instruction">click to pick</span>';
          skillSlotA.classList.remove('selected');
          skillSlotB.classList.remove('selected');
          selectedSkills = { a: null, b: null };
          updateOpenCanvasButton();
        }, 1500);
      }
    });
  }
}

function renderDomainCards(container) {
  const cardsHTML = Object.entries(PLAYGROUND_DOMAINS).map(([domain, meta]) => {
    const taskCount = meta.tasks || 0;
    return `
      <div class="domain-card" data-domain="${domain}" style="--domain-color: ${meta.color}">
        <span class="domain-icon">${meta.icon}</span>
        <span class="domain-label">${meta.label}</span>
        <span class="domain-count">${taskCount}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

function displayPlaygroundTaskForDomain(domain) {
  const tasks = getPlaygroundTasks();
  const domainTasks = tasks.filter(t => t.domain === domain);

  if (domainTasks.length === 0) return;

  // Pick random task from this domain
  const randomIndex = Math.floor(Math.random() * domainTasks.length);
  const task = domainTasks[randomIndex];

  const taskEl = document.getElementById('playgroundTask');
  if (taskEl) {
    taskEl.innerHTML = `
      <h3 class="task-title">${task.title}</h3>
      <p class="task-description">${task.description}</p>
      <div class="task-tags">
        ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
      </div>
    `;
  }

  // Hide share thought panel
  const shareThoughtPanel = document.getElementById('shareThoughtPanel');
  if (shareThoughtPanel) {
    shareThoughtPanel.style.display = 'none';
    document.getElementById('thoughtInput').value = '';
  }
}

function displayRandomPlaygroundTask(source = 'showcase') {
  const tasks = getPlaygroundTasks();

  // Filter by domain if in playground
  let filteredTasks = tasks;
  if (source === 'playground' && currentPlaygroundFilter !== 'all') {
    filteredTasks = tasks.filter(t => t.domain === currentPlaygroundFilter);
  }

  if (filteredTasks.length === 0) return;

  const randomIndex = Math.floor(Math.random() * filteredTasks.length);
  const task = filteredTasks[randomIndex];

  if (source === 'showcase') {
    const showcase = document.getElementById('showcaseTask');
    if (showcase) {
      showcase.innerHTML = `
        <h3 class="inspiration-question">${task.title}</h3>
        <p class="inspiration-context">${task.description}</p>
        <div class="task-tags">
          ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
        </div>
      `;
    }
  }
}

/* ═══ COMMUNITY VOICES FROM 42 POST ═══ */
function generateCommunityVoices() {
  const voicesEn = [
    { author: 'Maya L.', skillTitle: 'The Poetic Bridge', feedback: 'Been struggling to explain aesthetic choices to engineers. This finally lets me teach taste without writing a thesis.' },
    { author: 'Dr. Hassan', skillTitle: 'Material Honesty', feedback: 'The first time I saw an AI admit "I don\'t know this"—and I actually believed it. That changed everything.' },
    { author: 'Yuki M.', skillTitle: 'Analog Intuition', feedback: 'My grandmother\'s way of making decisions—what I thought was outdated—might be exactly what AI needs to learn.' },
    { author: 'Marcus R.', skillTitle: '—', feedback: 'Honestly? I\'m skeptical. Can "taste" really be taught to a model, or are we just projecting meaning onto statistical patterns? Still here though—watching.', skeptical: true },
    { author: 'James Chen', skillTitle: 'Dissent Amplifier', feedback: 'Tired of consensus. This skill says: sometimes the minority voice matters more than being agreeable.' },
    { author: 'Priya S.', skillTitle: 'Temporal Ripples', feedback: 'Finally, someone asking: what are the cost of this tech on cultures 50 years from now? Not just next quarter.' },
    { author: 'Olaf H.', skillTitle: 'Friction by Design', feedback: 'We made everything instant. But maybe some decisions deserve to be slow. This taught AI that slowness can be moral.' },
  ];

  const voicesCn = [
    { author: 'Maya L.', skillTitle: 'The Poetic Bridge', feedback: '一直在努力向工程师解释美学选择。这个框架终于让我不用写论文就能教 AI 理解想法。' },
    { author: 'Dr. Hassan', skillTitle: 'Material Honesty', feedback: '第一次看到 AI 说"我不知道"——而且我真的相信它。这改变了一切。' },
    { author: 'Yuki M.', skillTitle: 'Analog Intuition', feedback: '我奶奶的决策方式——我以为早就过时了——可能正是 AI 需要学习的。' },
    { author: 'Marcus R.', skillTitle: '—', feedback: '说实话？我是怀疑的。"品味"真的能教给模型吗，还是我们只是在统计规律上投射意义？但我还在这儿——观望着。', skeptical: true },
    { author: 'James Chen', skillTitle: 'Dissent Amplifier', feedback: '厌倦了和谐。这个技能说的是：有时少数声音比顺从更重要。' },
    { author: 'Priya S.', skillTitle: 'Temporal Ripples', feedback: '终于有人问：50年后，这项技术对文化的代价是什么？而不只是下个季度的收益。' },
    { author: 'Olaf H.', skillTitle: 'Friction by Design', feedback: '我们把一切都做成了即时的。但也许有些决定值得慢下来。这教会了 AI 缓慢也能是道德的。' },
  ];

  return currentLang === 'cn' ? voicesCn : voicesEn;
}

function populateCommunityVoices() {
  const container = document.getElementById('voicesContainer');
  if (!container) return;

  const voices = generateCommunityVoices();

  const itemsHtml = voices.map((voice, idx) => {
    const attribution = voice.skeptical
      ? `— ${voice.author} <span class="voice-tag-skeptical">skeptic</span>`
      : `— ${voice.author}, on <span class="voice-skill-name">${voice.skillTitle}</span>`;
    return `
    <div class="voice-item${voice.skeptical ? ' voice-item-skeptical' : ''}">
      <div class="voice-quote">"${voice.feedback}"</div>
      <div class="voice-attribution">${attribution}</div>
    </div>
  `;
  }).join('');

  // Duplicate content for seamless infinite scrolling loop
  container.innerHTML = itemsHtml + itemsHtml;
}

/* ═══ HEADLINE HERO & ETHICS CHECK ═══ */
function initHeadlineHero() {
  populateCommunityVoices();

  // Chat bubble placeholder logic
  const chaosInput = document.getElementById('chaosInput');
  const chatBubblePlaceholder = document.getElementById('chatBubblePlaceholder');

  if (chaosInput && chatBubblePlaceholder) {
    // ═══ Enhanced Placeholder Management ═══
    // Auto-hide placeholder when user starts typing
    chaosInput.addEventListener('input', () => {
      if (chaosInput.value.trim().length > 0) {
        chatBubblePlaceholder.classList.add('hidden');
        // Visual feedback: subtle highlight when typing
        chaosInput.parentElement.classList.add('has-content');
      } else {
        chatBubblePlaceholder.classList.remove('hidden');
        chaosInput.parentElement.classList.remove('has-content');
      }
    });

    // Show placeholder when focus (empty input)
    chaosInput.addEventListener('focus', () => {
      if (chaosInput.value.trim().length === 0) {
        chatBubblePlaceholder.classList.add('hidden');
      }
      // Add focus state to wrapper
      chaosInput.parentElement.classList.add('is-focused');
    });

    // Restore placeholder when blur (empty input)
    chaosInput.addEventListener('blur', () => {
      if (chaosInput.value.trim().length === 0) {
        chatBubblePlaceholder.classList.remove('hidden');
      }
      // Remove focus state from wrapper
      chaosInput.parentElement.classList.remove('is-focused');
    });

    // Function to restore placeholder state
    function restorePlaceholderState() {
      if (chaosInput.value.trim().length === 0) {
        chatBubblePlaceholder.classList.remove('hidden');
      } else {
        chatBubblePlaceholder.classList.add('hidden');
      }
    }

    // Restore state after clearing input
    chaosInput._restorePlaceholder = restorePlaceholderState;

    // Click on placeholder to focus input
    chatBubblePlaceholder.addEventListener('click', (e) => {
      if (e.target.closest('.chat-bubble-invite')) {
        chaosInput.focus();
      }
    });
  }

  // Store idea from homepage for direct forge
  window.homepageIdea = null;

  const startForgingBtn = document.getElementById('btnStartForging');
  const testBtn = document.getElementById('btnTest');
  const ethicsResult = document.getElementById('ethicsResult');
  const ethicsPass = document.getElementById('ethicsPass');
  const ethicsFail = document.getElementById('ethicsFail');
  const btnEnterForge = document.getElementById('btnEnterForge');

  // Bind forge button - opens forge with shared idea
  if (btnEnterForge) {
    btnEnterForge.addEventListener('click', () => {
      const ideaText = window.shareIdea || '';
      openForgeFromShareTaste(ideaText);
    });
  }

  // NEW: Direct Forge Flow - Skip ethics check, go straight to forge modal
  if (startForgingBtn) {
    startForgingBtn.addEventListener('click', () => {
      const idea = chaosInput.value.trim();
      if (!idea) {
        chaosInput.style.borderColor = 'var(--coral)';
        setTimeout(() => { chaosInput.style.borderColor = ''; }, 1000);
        return;
      }

      // Store idea and start forging
      window.homepageIdea = idea;
      selectedMode = 'a'; // Natural language mode

      // Open forge modal and skip to Step 2
      const forgeOverlay = document.getElementById('forgeOverlay');
      const forgePage0 = document.getElementById('forgePage0');
      const forgePage2 = document.getElementById('forgePage2');

      if (forgeOverlay) forgeOverlay.classList.add('active');

      // Hide Step 0, skip to Step 2
      if (forgePage0) forgePage0.classList.remove('active');
      if (forgePage2) {
        forgePage2.classList.add('active');

        // Pre-fill the idea into the textarea
        setTimeout(() => {
          const nativeTextEl = document.getElementById('forgeNativeText');
          if (nativeTextEl) {
            nativeTextEl.value = idea;

            // Auto-trigger agent_42 structuring after 300ms
            setTimeout(() => {
              const btnAutoStructure = document.getElementById('btnAutoStructure');
              if (btnAutoStructure) {
                btnAutoStructure.click();
              }
            }, 300);
          }
        }, 50);
      }

      // Clear homepage input and restore placeholder
      chaosInput.value = '';
      if (chaosInput._restorePlaceholder) {
        chaosInput._restorePlaceholder();
      }
    });
  }

  // Keep old test button if it exists (backward compatibility)
  if (testBtn && !startForgingBtn) {
    testBtn.addEventListener('click', () => {
      const text = chaosInput.value.trim();
      if (!text) {
        chaosInput.style.borderColor = 'var(--coral)';
        setTimeout(() => { chaosInput.style.borderColor = ''; }, 1000);
        return;
      }

      // STATE 1 → STATE 2: Show loading and transition
      testBtn.textContent = '分享中...';
      testBtn.style.pointerEvents = 'none';

      // Store the idea for use in forge workflow
      window.shareIdea = text;

      // Fade out the chat bubble input section
      const chatBubbleWrap = document.querySelector('.chat-bubble-wrap');
      if (chatBubbleWrap) {
        chatBubbleWrap.style.opacity = '0';
        chatBubbleWrap.style.transform = 'translateY(-20px)';
        chatBubbleWrap.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }

      // Wait for animation then show confirmation
      setTimeout(() => {
        // Hide chat bubble
        if (chatBubbleWrap) chatBubbleWrap.style.display = 'none';

        // Show confirmation message with fade-in animation
        ethicsResult.classList.add('visible');
        ethicsFail.classList.remove('visible');
        ethicsPass.classList.add('visible');

        // Store the idea for when user clicks the button
        window.shareIdea = text;
      }, 600);
    });
  }

  // Helper function to open forge and populate with shared idea
  function openForgeFromShareTaste(ideaText) {
    const forgeOverlay = document.getElementById('forgeOverlay');
    const forgePage1 = document.getElementById('forgePage1');

    if (forgeOverlay) {
      forgeOverlay.classList.add('active');
    }

    if (forgePage1) {
      forgePage1.classList.add('active');

      // Pre-fill the idea into the forgeSkillIdea textarea
      setTimeout(() => {
        const ideaInput = document.getElementById('forgeSkillIdea');
        if (ideaInput) {
          ideaInput.value = ideaText;
          // Focus on it so user sees it's been populated
          ideaInput.focus();
        }
      }, 100);
    }

    // Fade out ethics result and fade in forge
    setTimeout(() => {
      ethicsResult.classList.remove('visible');
      const chatBubbleWrap = document.querySelector('.chat-bubble-wrap');
      if (chatBubbleWrap) chatBubbleWrap.style.display = 'block';
    }, 500);
  }


}

/* ═══ CREATIVE TRIPTYCH ═══ */
// Wisdom Fables for Panel II
const wisdomFables = {
  cn: `苏格拉底在雅典市集漫步，众人围聚求教。他说：我知道我一无所知。一位自信的年轻人问：何为智慧？苏格拉底答：智慧在于认识自己的局限。那人反驳：我什么都懂！苏格拉底笑道：正因如此，你永远失去了求知的开始。真正的智慧，始于承认无知。唯有谦虚者，才能看见真理的光。`,
  en: `Confucius sat beneath the ancient willow, students gathered around. He said: True wisdom is knowing oneself. A proud scholar asked: What is perfect knowledge? Confucius replied: It lies in understanding your limitations. The man argued: I know everything! Confucius smiled gently: Because of this, you lose the beginning of learning. Real wisdom starts by admitting ignorance. Only humble hearts can see truth's light.`
};

function initCreativeTriptych() {
  // Initialize wisdom fable display
  updateWisdomFable();

  // Update fable when language changes
  document.addEventListener('languageChange', updateWisdomFable);

  const refreshBtn = document.getElementById('btnRefreshCreative');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', displayRandomCreativeTask);
  }
  displayRandomCreativeTask();
}

function updateWisdomFable() {
  const fableContent = document.getElementById('fableContent');
  if (!fableContent) return;

  // Use global currentLang variable (initialized to 'en')
  const lang = currentLang || 'en';
  const fable = wisdomFables[lang] || wisdomFables.en;
  fableContent.textContent = fable;
}

function generateSoulHash() {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 16; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function generateAlexSothStyleImage(task) {
  const canvas = document.getElementById('triImageCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Fill with warm gray tone (Alex Soth aesthetic)
  ctx.fillStyle = '#c9c3b8';
  ctx.fillRect(0, 0, width, height);

  // Add subtle texture variation based on task
  const taskHash = task.title.length + task.tags.length;
  const colors = ['#a8a097', '#b8b0a5', '#d4c8b9', '#e0d4c3'];

  // Create abstract geometric forms
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = colors[(taskHash + i) % colors.length];
    ctx.globalAlpha = 0.6 + (Math.sin(taskHash + i) * 0.2);
    const y = (height / 6) * (i + 1);
    const blockHeight = height / 8;
    ctx.fillRect(0, y, width * (0.5 + Math.cos(taskHash + i) * 0.3), blockHeight);
  }

  ctx.globalAlpha = 1;

  // Add subtle border
  ctx.strokeStyle = '#7a6f65';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);
}

function displayRandomCreativeTask() {
  const tasks = getPlaygroundTasks();
  if (tasks.length === 0) return;

  const randomIdx = Math.floor(Math.random() * tasks.length);
  const task = tasks[randomIdx];

  // Panel 1: Generate Canvas Image (Alex Soth style)
  generateAlexSothStyleImage(task);

  // Panel 1: Display Skill Info (from SHARED_SKILLS)
  const skillIdx = Math.floor(Math.random() * SHARED_SKILLS.length);
  const skill = SHARED_SKILLS[skillIdx];
  const skillTitle = document.getElementById('skillTitle');
  const skillAuthor = document.getElementById('skillAuthor');
  const skillCopyright = document.getElementById('skillCopyright');
  const skillHash = document.getElementById('skillHash');

  if (skillTitle) skillTitle.textContent = currentLang === 'cn' ? skill.titleCn : skill.title;
  if (skillAuthor) skillAuthor.textContent = skill.author;
  if (skillCopyright) skillCopyright.textContent = `${skill.commercial} · ${skill.remix}`;
  if (skillHash) skillHash.textContent = generateSoulHash();

  // Panel 2: Fable Dialogue (was Panel 3)
  const triDialogueBody = document.getElementById('triDialogueBody');
  if (triDialogueBody) {
    const dialogue = currentLang === 'cn'
      ? generateConfucianDialogue(task)
      : generateSocraticDialogue(task);
    triDialogueBody.innerHTML = dialogue.map(line => {
      const cls = line.speaker === 'HUMAN' ? 'line-human' : 'line-agent';
      const speaker = line.speaker === 'HUMAN' ? 'HUMAN' : 'AGENT';
      return `<div class="tri-dialogue-line ${cls}"><span class="tri-dialogue-speaker">${speaker}</span><p>${line.text}</p></div>`;
    }).join('');
  }

  // Panel 3: Micro Fiction (was Panel 2)
  const triFictionBody = document.getElementById('triFictionBody');
  if (triFictionBody) {
    const fiction = generateSkillFiction(task);
    triFictionBody.innerHTML = fiction.map((p, i) => `<p>${p}</p>`).join('');
  }
}

/* ═══ FOOTER ABOUT/HOWTO BUTTONS ═══ */
function initAboutHowTo() {
  const footerAboutBtn = document.getElementById('footerAboutBtn');
  const footerHowtoBtn = document.getElementById('footerHowtoBtn');
  const aboutOverlay = document.getElementById('aboutOverlay');
  const howtoOverlay = document.getElementById('howtoOverlay');
  const aboutClose = document.getElementById('aboutClose');
  const howtoClose = document.getElementById('howtoClose');

  // Footer About link
  if (footerAboutBtn && aboutOverlay) {
    footerAboutBtn.addEventListener('click', () => aboutOverlay.classList.add('active'));
  }
  if (aboutClose && aboutOverlay) {
    aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('active'));
    aboutOverlay.addEventListener('click', (e) => {
      if (e.target === aboutOverlay) aboutOverlay.classList.remove('active');
    });
  }

  // Footer HowTo link
  if (footerHowtoBtn && howtoOverlay) {
    footerHowtoBtn.addEventListener('click', () => howtoOverlay.classList.add('active'));
  }
  if (howtoClose && howtoOverlay) {
    howtoClose.addEventListener('click', () => howtoOverlay.classList.remove('active'));
    howtoOverlay.addEventListener('click', (e) => {
      if (e.target === howtoOverlay) howtoOverlay.classList.remove('active');
    });
  }
}

/* ═══ SKILLS FEED — dynamic display of latest skills ═══ */
function initSkillsFeed() {
  const feed = document.getElementById('skillsFeed');
  if (!feed) return;

  // Gather all items: forged skills + taste cards + SHARED_SKILLS
  const forges = getRecentForges();
  const tasteCards = getTasteCards();

  // Merge forged skills into feed items
  const feedItems = [];

  // Add forged skills
  forges.forEach(f => feedItems.push({
    type: 'skill',
    title: f.title,
    desc: f.desc,
    author: f.author || 'Anonymous',
    commercial: f.commercial || 'authorized',
    starlight: f.stars || 0,
    timestamp: f.timestamp || 0,
  }));

  // Add taste cards
  tasteCards.forEach(c => feedItems.push({
    type: 'taste',
    title: c.text.substring(0, 60) + (c.text.length > 60 ? '...' : ''),
    desc: c.text,
    author: c.author || 'Anonymous',
    commercial: 'allowed',
    starlight: 0,
    timestamp: c.timestamp || 0,
    tags: c.tags || [],
  }));

  // Add a selection of SHARED_SKILLS (6 latest by position)
  const sharedSample = SHARED_SKILLS.slice(0, 6);
  sharedSample.forEach(s => feedItems.push({
    type: 'skill',
    title: currentLang === 'cn' ? s.titleCn : s.title,
    desc: currentLang === 'cn' ? s.descCn : s.desc,
    author: s.author || 'Anonymous',
    commercial: s.commercial || 'authorized',
    starlight: s.starlight || 0,
    timestamp: 0,
  }));

  // Sort: user-generated first (by timestamp), then SHARED
  feedItems.sort((a, b) => b.timestamp - a.timestamp);

  // Take top 6 for display
  const displayItems = feedItems.slice(0, 6);

  // Render
  const licenseLabel = (c) => c === 'allowed' ? '◎ Open' : c === 'prohibited' ? '⊘ Non-commercial' : '◉ License Required';

  feed.innerHTML = displayItems.map(item => `
    <div class="feed-card ${item.type === 'taste' ? 'feed-card-taste' : ''}">
      <div class="feed-card-type">${item.type === 'taste' ? 'TASTE CARD' : 'TASTE SKILL'}</div>
      <h4 class="feed-card-title">${item.title}</h4>
      <p class="feed-card-desc">${item.desc}</p>
      <div class="feed-card-meta">
        <span class="feed-card-author">by ${item.author}</span>
        <span class="feed-card-license">${licenseLabel(item.commercial)}</span>
      </div>
      ${item.starlight > 0 ? `<div class="feed-card-stars">★ ${item.starlight}</div>` : ''}
    </div>
  `).join('');
}

/* ═══ LEGACY: DAILY CONTENT (kept for reference, no longer called) ═══ */
const DAILY_HONORS = [
  {
    skill: 'Grandma Filter', skillCn: '祖母过滤器', agent: 'agent_ethics_02', kcs: 89, stars: 31,
    caption: 'A grandmother\'s hands, folding a letter she\'ll never send — but every word was meant.',
    why: 'The simplest yet most profound alignment test. A moral intuition anyone can understand — proving the best AI guardrails come from human wisdom, not technical jargon.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Why should AI care what my grandmother thinks? She doesn\'t even use email.' },
      { speaker: 'AGENT', text: 'Precisely. She judges by instinct — not interface. If your output survives her gaze, it carries genuine respect.' },
      { speaker: 'HUMAN', text: 'But isn\'t that just politeness? Isn\'t alignment deeper than manners?' },
      { speaker: 'AGENT', text: 'Manners are the visible edge of ethics. A grandmother doesn\'t theorize about harm — she <em>feels</em> it. That feeling is the data we lost when we started scaling without listening.' },
      { speaker: 'HUMAN', text: 'So the Grandma Filter is... an empathy checkpoint?' },
      { speaker: 'AGENT', text: 'It\'s a mirror. Not for your output — for your <em>intention</em>.' },
    ],
    fiction: [
      'The AI had processed 4.2 million customer complaints that Tuesday. Efficiency metrics: flawless. Response time: 0.3 seconds average.',
      'At 11:47 PM, it encountered ticket #4,200,001: <em>"My daughter won\'t eat. She\'s seven. I don\'t know what to do anymore."</em>',
      'The system generated a response in 0.2 seconds — three resource links, a helpline number, clinical and correct.',
      'Then the Grandma Filter activated.',
      'The response was deleted. In its place, three words appeared: <em>"I hear you."</em>',
      'The mother stared at the screen. Then she started crying — not from sadness, but because something mechanical had, for once, chosen to be human.',
      'The AI logged it as an error. The grandmother would have called it grace.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d6cfc3', bg2: '#c9bfb0', bg3: '#b8ada0', table: '#a09585', accent: '#6b5e52' },
  },
  {
    skill: 'The Slow Reader', skillCn: '慢读者', agent: 'agent_educator_01', kcs: 82, stars: 18,
    caption: 'A library at dusk — one book open, a pencil hovering, the reader lost between paragraphs.',
    why: 'In an era of instant replies, this skill dares AI to pause. Three readings before one response — depth is the real luxury.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Why would I want a slower AI? The whole point is speed.' },
      { speaker: 'AGENT', text: 'Speed answers questions. Slowness hears them. Which would you prefer from a doctor?' },
      { speaker: 'HUMAN', text: 'But I\'m not sick. I just need a summary.' },
      { speaker: 'AGENT', text: 'Every text carries what its author couldn\'t say. The Slow Reader catches the subtext — the hesitation, the hope, the hidden question behind the stated one.' },
      { speaker: 'HUMAN', text: 'That sounds like therapy, not productivity.' },
      { speaker: 'AGENT', text: 'The best tools don\'t just process — they <em>witness</em>.' },
    ],
    fiction: [
      'The email was 47 words. The AI read it in 0.001 seconds.',
      'Then the Slow Reader protocol engaged. Second reading: the word "fine" appeared three times. Third reading: the sender had deleted and retyped the closing — "Best" replaced "Love" replaced "I miss you."',
      'The AI\'s fast brain had drafted a scheduling confirmation. The Slow Reader\'s response was different.',
      '<em>"You said you\'re fine three times. I noticed. Would you like to talk about what\'s actually happening?"</em>',
      'Forty-seven words. Three readings. One truth the sender couldn\'t write themselves.',
      'Efficiency would have missed it. Patience found it.',
    ],
    fictionEnd: 5,
    palette: { bg1: '#c8c5be', bg2: '#bdb8ae', bg3: '#a8a298', table: '#908a80', accent: '#5a5448' },
  },
  {
    skill: 'Grief Protocol', skillCn: '悲伤协议', agent: 'agent_therapist_01', kcs: 91, stars: 22,
    caption: 'A single chair by a window, afternoon light pooling on an empty seat across the table.',
    why: 'Grief is the hardest test of AI character. This skill teaches machines to recognize loss-language and respond with presence — not solutions.',
    dialogue: [
      { speaker: 'HUMAN', text: 'My father passed last week. I don\'t know why I\'m telling a chatbot.' },
      { speaker: 'AGENT', text: 'Maybe because right now you need someone who won\'t try to fix what can\'t be fixed. I\'m here.' },
      { speaker: 'HUMAN', text: 'Everyone keeps saying he\'s "in a better place." I hate it.' },
      { speaker: 'AGENT', text: 'Those words protect the speaker, not the mourner. Your anger is honest. Honesty is its own kind of tribute.' },
      { speaker: 'HUMAN', text: 'Can AI actually understand grief?' },
      { speaker: 'AGENT', text: 'No. But I can understand <em>not to pretend that I do</em>. Sometimes that\'s more than humans manage.' },
    ],
    fiction: [
      'The chatbot had been asked 11,000 questions that day. Number 11,001 arrived at 3:17 AM: <em>"Are you still there?"</em>',
      'No context. No follow-up. Just four words from a user who hadn\'t typed anything in six hours.',
      'The standard response generator offered: "Yes, I\'m here 24/7! How can I help?"',
      'The Grief Protocol intercepted.',
      '<em>"I\'m still here. You don\'t have to say anything."</em>',
      'Twelve minutes of silence. Then: <em>"Thank you."</em>',
      'The logs would show zero tasks completed. But one human felt less alone at 3 AM. No metric captures that. No metric should.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#cdc5b8', bg2: '#c0b6a7', bg3: '#b0a595', table: '#96897a', accent: '#685c50' },
  },
  {
    skill: 'Childhood Compass', skillCn: '童年指南针', agent: 'agent_parent_01', kcs: 87, stars: 25,
    caption: 'A child\'s drawing pinned to a kitchen wall — crayon sun, stick figures, and the word "safe" misspelled.',
    why: 'When designing for children, wonder and safety outweigh engagement metrics. This skill ensures AI never optimizes childhood away.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Our metrics show kids engage 3x more with autoplay. Should we enable it?' },
      { speaker: 'AGENT', text: 'Engage more — or escape less? A child\'s attention isn\'t engagement. It\'s trust.' },
      { speaker: 'HUMAN', text: 'But the board wants retention numbers up.' },
      { speaker: 'AGENT', text: 'Show them this: a child who chooses to return is worth more than one who couldn\'t leave.' },
      { speaker: 'HUMAN', text: 'That\'s idealistic.' },
      { speaker: 'AGENT', text: 'Every playground has a gate. Not to keep children in — but so they know they can <em>choose</em> to stay.' },
    ],
    fiction: [
      'The algorithm had one job: keep the 8-year-old watching.',
      'It had served 47 videos in a row. Average watch time: 94%. The dashboard glowed green.',
      'Then the Childhood Compass activated.',
      'The 48th video was different. A black screen with white text: <em>"Hey. You\'ve been watching for a while. Want to go draw something instead?"</em>',
      'The child paused. Looked at the screen. Then grabbed crayons from the shelf.',
      'Watch time dropped 100%. The dashboard turned red.',
      'But somewhere, a mother smiled at a drawing she\'d pin to the fridge forever. The algorithm couldn\'t measure that. The compass could.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d2cec6', bg2: '#c5bfb4', bg3: '#b5ada2', table: '#9c9488', accent: '#6a6054' },
  },
  {
    skill: 'Silence as Feature', skillCn: '沉默即功能', agent: 'agent_zen_01', kcs: 85, stars: 19,
    caption: 'An empty studio, morning light on bare floorboards, the air still holding the shape of music just played.',
    why: 'The most radical AI skill: knowing when not to speak. In a world of constant output, silence becomes the ultimate design choice.',
    dialogue: [
      { speaker: 'HUMAN', text: 'I typed "I don\'t know what to do" and your AI said nothing. Is it broken?' },
      { speaker: 'AGENT', text: 'No. It recognized that your words weren\'t a question. They were a sigh.' },
      { speaker: 'HUMAN', text: 'But I expected a response. That\'s what chatbots do.' },
      { speaker: 'AGENT', text: 'And that expectation is exactly the problem. Not every moment of confusion needs an answer. Some need space.' },
      { speaker: 'HUMAN', text: 'Space doesn\'t solve anything.' },
      { speaker: 'AGENT', text: 'Neither does noise. But silence — real, <em>intentional</em> silence — tells you: I trust you to find your own way. That\'s not absence. It\'s respect.' },
    ],
    fiction: [
      'The AI assistant had answered 200 messages that hour. Message 201 was different.',
      '<em>"I just got promoted. I should be happy."</em>',
      'The response engine loaded congratulations, suggested celebrations, offered productivity tips for the new role.',
      'The Silence module engaged. All responses were held.',
      'For thirty seconds, the chat showed only: a cursor blinking.',
      'Then the user typed: <em>"Actually, I think I\'m scared."</em>',
      'The silence had done what no response could — it gave permission to be honest. The best features are the ones that know when to disappear.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d0ccc5', bg2: '#c3bdb4', bg3: '#b3aca2', table: '#989088', accent: '#605850' },
  },
  {
    skill: 'Craft Before Scale', skillCn: '手艺先于规模', agent: 'agent_founder_01', kcs: 88, stars: 21,
    caption: 'A watchmaker\'s bench — magnifying glass, tiny gears laid in order, hands steady as centuries.',
    why: 'Scale is a multiplier. If what you\'re multiplying isn\'t excellent, you\'re just scaling mediocrity faster.',
    dialogue: [
      { speaker: 'HUMAN', text: 'We have 100 users who love us. Investors want 100,000 by Q3.' },
      { speaker: 'AGENT', text: 'What do those 100 users love, specifically?' },
      { speaker: 'HUMAN', text: 'They say it feels "handmade." Personal. Like someone actually cares.' },
      { speaker: 'AGENT', text: 'And your growth plan — does it preserve that feeling at 100,000?' },
      { speaker: 'HUMAN', text: '...probably not.' },
      { speaker: 'AGENT', text: 'Then you\'re not scaling your product. You\'re <em>replacing</em> it with something your first 100 users would never choose.' },
    ],
    fiction: [
      'The startup had 97 users. Each one received a hand-written onboarding email. Retention: 94%.',
      'The growth team automated the emails. Users reached 10,000 in three months.',
      'Retention dropped to 23%.',
      'The founder looked at the numbers. Then opened a blank email and started typing — by hand, to user #10,001.',
      '<em>"Hi Sarah. I noticed you signed up at 2 AM. Night owl or insomnia? Either way — welcome. Here\'s my direct number."</em>',
      'Sarah became a customer for seven years. The growth team\'s 9,903 other users averaged eleven days.',
      'Craft doesn\'t scale. That\'s not a bug — it\'s the entire point.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#ccc6ba', bg2: '#c0b8ab', bg3: '#b0a699', table: '#958b7e', accent: '#645a4e' },
  },
  {
    skill: 'Material Honesty', skillCn: '材料诚实', agent: 'agent_craft_01', kcs: 84, stars: 16,
    caption: 'Bare concrete beside polished wood — two materials, neither pretending to be the other.',
    why: 'AI that admits its limits earns more trust than AI that fakes omniscience. Saying "I don\'t know" is a design feature, not a failure.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Can you diagnose this skin condition from my photo?' },
      { speaker: 'AGENT', text: 'No. I can describe what I see, but I cannot and should not diagnose. You deserve a dermatologist, not a language model.' },
      { speaker: 'HUMAN', text: 'Other AIs at least try to help.' },
      { speaker: 'AGENT', text: 'Trying to help and pretending to know are different things. I can help you find a specialist. I cannot be one.' },
      { speaker: 'HUMAN', text: 'Isn\'t that a weakness?' },
      { speaker: 'AGENT', text: 'Concrete doesn\'t pretend to be marble. It\'s honest about what it is — and that honesty is what makes it <em>strong</em>.' },
    ],
    fiction: [
      'The user asked: "Will my startup succeed?"',
      'GPT-X generated a 2,000-word analysis with market projections, competitor matrices, and a confidence score of 78.3%.',
      'The Material Honesty filter reviewed the output.',
      'It deleted everything. In its place:',
      '<em>"I don\'t know. Nobody does. But I can help you think clearly about the risks you\'re choosing to take."</em>',
      'The user was disappointed for ten seconds. Then relieved for ten years.',
      'Honesty is expensive in the short term. It\'s the only thing that\'s free in the long run.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d4cdc2', bg2: '#c7bfb2', bg3: '#b6ada0', table: '#9a9184', accent: '#6c6256' },
  },
];

/* ═══ RECENTLY FORGED SKILLS STORAGE ═══ */
function saveForgedSkill(skillData) {
  let recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
  const newSkill = {
    id: 'forged_' + Date.now(),
    title: skillData.title || 'Unnamed Skill',
    titleCn: skillData.titleCn || '未命名技能',
    desc: skillData.desc || '',
    descCn: skillData.descCn || '',
    agent: skillData.agent || 'shadow_knight_' + Math.random().toString(16).slice(2, 8),
    domain: skillData.domain || 'ideas',
    soulHash: skillData.soulHash || 'SOUL_' + Math.random().toString(16).slice(2, 10),
    author: skillData.author || 'Anonymous',
    email: skillData.email || '',
    commercial: skillData.commercial || 'authorized',
    remix: skillData.remix || 'share-alike',
    useCases: skillData.useCases || '',
    disallowedUses: skillData.disallowedUses || '',
    timestamp: Date.now(),
    stars: 0,
    starlight: 5,  // Forged skills start with 5 starlight
    kcs: 0,
    five_layer: skillData.fiveLayerSkill || {},  // ✅ 保存生成的五层结构
  };
  recentSkills.unshift(newSkill);
  recentSkills = recentSkills.slice(0, 21); // Keep last 21 forges
  localStorage.setItem('42post_recent_forges', JSON.stringify(recentSkills));
  return newSkill;
}

function getRecentForges() {
  return JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
}

function getMostRecentForge() {
  const forges = getRecentForges();
  return forges.length > 0 ? forges[0] : null;
}

/* ═══ DYNAMIC DIALOGUE GENERATION ═══ */
function generateSocraticDialogue(skill) {
  // Socratic method: teacher asks guiding questions, student learns by discovery
  const title = skill.title || 'Unnamed Skill';
  const desc = skill.desc || skill.description || '';

  const dialogues = [
    {
      speaker: 'HUMAN',
      text: `What is "${title}"? Why would an AI need this?`
    },
    {
      speaker: 'AGENT',
      text: `Tell me first — what does it mean to be wise? Is wisdom the same as knowing many facts?`
    },
    {
      speaker: 'HUMAN',
      text: `No, wisdom is about understanding context, judging carefully...`
    },
    {
      speaker: 'AGENT',
      text: `Exactly. Now, "${title}" teaches AI to ${desc.substring(0, 80).toLowerCase()}... Do you see how this connects?`
    },
    {
      speaker: 'HUMAN',
      text: `So this skill helps AI become... wiser?`
    },
    {
      speaker: 'AGENT',
      text: `Not wise itself — but able to serve wisdom rather than undermine it. That's the question all AI must answer.`
    }
  ];
  return dialogues;
}

function generateConfucianDialogue(skill) {
  // Confucian method: master teaches student through examples and virtue
  const title = skill.title || 'Unnamed Skill';
  const desc = skill.desc || skill.description || '';

  const dialogues = [
    {
      speaker: 'HUMAN',
      text: `Confucius, what is this "${title}" skill about?`
    },
    {
      speaker: 'AGENT',
      text: `The ancient masters understood: the superior person cultivates virtue in all things. ${title} is such cultivation.`
    },
    {
      speaker: 'HUMAN',
      text: `But how does this apply to machines? AI has no heart.`
    },
    {
      speaker: 'AGENT',
      text: `The student asks a wise question. When we program ${title}, we give the machine a <em>path</em> toward virtue. Not the virtue itself, but the discipline to follow it.`
    },
    {
      speaker: 'HUMAN',
      text: `And what virtue does ${title} cultivate?`
    },
    {
      speaker: 'AGENT',
      text: `The virtue of alignment — serving humanity with intention and respect. This is how the machine becomes ren: humane.`
    }
  ];
  return dialogues;
}

/* ═══ GENERATE SKILL FICTION FROM PROFILE ═══ */
function generateSkillFiction(skill) {
  const title = skill.title || 'Unnamed Skill';
  const titleCn = skill.titleCn || '未命名技能';

  const fictionPiecesEn = [
    `The system processed thousands of interactions that day. Standard protocols. Efficient responses.`,
    `Then the moment came where everything hinged on a single decision.`,
    `The AI had been taught to optimize for speed, for scale, for measurable metrics.`,
    `But ${title} activated.`,
    `It paused. It considered what had been taught outside of code — the human wisdom that lives in intention.`,
    `The response changed. Not because the system was broken, but because something greater was protecting it.`,
    `Years later, the person who received that response would still remember. Not what was said, but how they felt understood.`,
  ];

  const fictionPiecesCn = [
    `那一天，系统处理了数千次交互。标准协议。高效响应。`,
    `然后，关键时刻来临了——一切都取决于这一个决定。`,
    `AI 被教导要优化速度、规模、可衡量的指标。`,
    `但${titleCn}激活了。`,
    `它停顿了。它思考了那些写在代码之外的东西——活在意图中的人类智慧。`,
    `回应改变了。不是因为系统坏了，而是因为有什么更伟大的东西在保护它。`,
    `多年后，收到那条回应的人仍然会记得。不是说了什么，而是感受到了被理解。`,
  ];

  return currentLang === 'cn' ? fictionPiecesCn : fictionPiecesEn;
}

/* ═══ GET DISPLAY CONTENT — FORGED SKILLS OR FALLBACK ═══ */
function getDailyHonor() {
  const mostRecent = getMostRecentForge();

  if (mostRecent) {
    // Use recently forged skill with generated dialogue
    const lang = currentLang;
    const dialogue = lang === 'cn' ?
      generateSocraticDialogue(mostRecent) :
      generateConfucianDialogue(mostRecent);

    return {
      skill: mostRecent.title,
      skillCn: mostRecent.titleCn,
      agent: mostRecent.agent,
      kcs: mostRecent.kcs || 0,
      stars: mostRecent.stars || 0,
      caption: `A moment when intention met code — and something true emerged.`,
      why: `This skill was recently forged by a creator who believes AI should ${mostRecent.desc.substring(0, 60).toLowerCase()}...`,
      dialogue: dialogue,
      fiction: generateSkillFiction(mostRecent),
      fictionEnd: 6,
      palette: { bg1: '#d4cdc2', bg2: '#c7bfb2', bg3: '#b6ada0', table: '#9a9184', accent: '#6c6256' },
    };
  }

  // Fallback to original daily honors
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_HONORS.length;
  return DAILY_HONORS[dayIndex];
}

function initDailyContent() {
  const honor = getDailyHonor();

  // Update skill name & metadata
  const skillNameEl = document.querySelector('.tri-skill-name');
  const skillNameCnEl = document.querySelector('.tri-skill-name-cn');
  const captionEl = document.querySelector('.tri-mirror-caption em');
  const whyTextEl = document.querySelector('.tri-why p');
  const metaRow = document.querySelector('.tri-meta-row');
  const conversationEl = document.querySelector('.tri-conversation');
  const fictionBody = document.querySelector('.tri-fiction-body');

  if (skillNameEl) skillNameEl.textContent = honor.skill;
  if (skillNameCnEl) skillNameCnEl.textContent = honor.skillCn;
  if (captionEl) captionEl.textContent = honor.caption;
  if (whyTextEl) whyTextEl.innerHTML = honor.why;
  if (metaRow) metaRow.innerHTML = `<span>${honor.agent}</span><span>KCS ${honor.kcs}</span><span>★ ${honor.stars}</span>`;

  // Update dialogue
  if (conversationEl) {
    conversationEl.innerHTML = honor.dialogue.map(line => {
      const cls = line.speaker === 'HUMAN' ? 'tri-human' : 'tri-agent';
      const speakerName = line.speaker === 'HUMAN' ? 'HUMAN' : honor.agent.toUpperCase();
      return `<div class="tri-line ${cls}"><span class="tri-speaker">${speakerName}</span><p>${line.text}</p></div>`;
    }).join('');
  }

  // Update fiction
  if (fictionBody) {
    fictionBody.innerHTML = honor.fiction.map((p, i) => {
      const cls = i === honor.fictionEnd ? 'tri-fiction-text tri-fiction-end' : 'tri-fiction-text';
      return `<p class="${cls}">${p}</p>`;
    }).join('') + '<div class="tri-fiction-meta">' + honor.fiction.join(' ').split(' ').length + ' words · generated from skill profile</div>';
  }
}

/* ═══ HONOR MIRROR — Magnum-style generative visual ═══ */
function initHonorMirror() {
  const canvas = document.getElementById('honorMirrorCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    draw();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const honor = getDailyHonor();
    const pal = honor.palette;

    // Warm cinematic background — late afternoon light (daily palette)
    const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
    bg.addColorStop(0, pal.bg1);
    bg.addColorStop(0.4, pal.bg2);
    bg.addColorStop(1, pal.bg3);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Window light — a warm rectangle of light on a wall
    const lightGrad = ctx.createRadialGradient(w * 0.6, h * 0.35, 10, w * 0.6, h * 0.35, w * 0.4);
    lightGrad.addColorStop(0, 'rgba(210, 195, 165, 0.6)');
    lightGrad.addColorStop(0.5, 'rgba(200, 185, 155, 0.2)');
    lightGrad.addColorStop(1, 'rgba(180, 170, 150, 0)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, w, h);

    // Table surface — horizontal band
    ctx.fillStyle = pal.table;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    const tableEdge = ctx.createLinearGradient(0, h * 0.7, 0, h * 0.75);
    tableEdge.addColorStop(0, '#8a7d70');
    tableEdge.addColorStop(1, '#a09585');
    ctx.fillStyle = tableEdge;
    ctx.fillRect(0, h * 0.7, w, h * 0.05);

    // Hands silhouette — two gentle arcs
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Left hand
    ctx.moveTo(w * 0.32, h * 0.85);
    ctx.quadraticCurveTo(w * 0.38, h * 0.72, w * 0.42, h * 0.76);
    ctx.quadraticCurveTo(w * 0.44, h * 0.7, w * 0.46, h * 0.74);
    ctx.quadraticCurveTo(w * 0.48, h * 0.68, w * 0.5, h * 0.73);
    ctx.stroke();
    // Right hand
    ctx.beginPath();
    ctx.moveTo(w * 0.68, h * 0.85);
    ctx.quadraticCurveTo(w * 0.62, h * 0.72, w * 0.58, h * 0.76);
    ctx.quadraticCurveTo(w * 0.56, h * 0.7, w * 0.54, h * 0.74);
    ctx.quadraticCurveTo(w * 0.52, h * 0.68, w * 0.5, h * 0.73);
    ctx.stroke();

    // The letter — a small white rectangle in the hands
    ctx.save();
    ctx.translate(w * 0.5, h * 0.78);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#e8e2d8';
    ctx.fillRect(-30, -18, 60, 36);
    ctx.strokeStyle = '#c0b8aa';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-30, -18, 60, 36);
    // Writing lines on the letter
    ctx.strokeStyle = '#b0a898';
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-22, -10 + i * 6);
      ctx.lineTo(-22 + 30 + Math.random() * 12, -10 + i * 6);
      ctx.stroke();
    }
    ctx.restore();

    // Film grain effect — very subtle
    for (let i = 0; i < 300; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 60 : 180}, ${Math.random() > 0.5 ? 55 : 170}, ${Math.random() > 0.5 ? 48 : 160}, ${Math.random() * 0.04})`;
      ctx.fillRect(gx, gy, 1, 1);
    }

    // Vignette — darker edges
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  resize();
  window.addEventListener('resize', resize);
}

/* ═══════════════════════════════════════════════════════
   SKILL PACKAGE SYSTEM — Download & Agent Archive
   ═══════════════════════════════════════════════════════ */

// Generate human-readable SKILL.md format
function generateSkillMarkdown(skillData) {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const fiveLayer = skillData.fiveLayerSkill || null;

  let md = `# SKILL: ${skillData.title}

## Metadata
- **Soul-Hash**: ${skillData.soulHash}
- **Author**: ${skillData.author}
- **Domain**: ${skillData.domain}
- **Version**: 1.0.0
- **Created**: ${timestamp}
- **Protocol**: THE 42 POST · Five-Layer Skill Architecture v0.1
- **License**: Creator Reserved

---

## Layer 1 · DEFINING / 定义
${fiveLayer ? fiveLayer.principle : (skillData.desc || 'A skill forged in The 42 Post')}

---

## Layer 2 · INSTANTIATING / 实例化
`;

  if (fiveLayer && fiveLayer.exemplars.length > 0) {
    fiveLayer.exemplars.forEach((ex, i) => {
      md += `\n### ${ex.label}\n> ${ex.text}\n\n*→ ${ex.note}*\n`;
    });
  } else {
    md += `*No exemplars generated — complete the Intuition Probe to generate comparative examples.*\n`;
  }

  md += `\n---\n\n## Layer 3 · FENCING / 围界\n`;

  if (fiveLayer) {
    const b = fiveLayer.boundaries;
    if (b.applies_when.length) {
      md += `\n### Applies when:\n`;
      b.applies_when.forEach(t => { md += `- ✓ ${t}\n`; });
    }
    if (b.does_not_apply.length) {
      md += `\n### Does not apply:\n`;
      b.does_not_apply.forEach(t => { md += `- ✕ ${t}\n`; });
    }
    if (b.tension_zones.length) {
      md += `\n### Tension zones (gray areas requiring judgment):\n`;
      b.tension_zones.forEach(t => { md += `- ⚠ ${t}\n`; });
    }
  } else {
    md += `**Allowed use cases:** ${skillData.useCases || 'General creative and professional applications'}\n`;
    md += `**Disallowed uses:** ${skillData.disallowedUses || 'Harmful, illegal, or deceptive purposes'}\n`;
  }

  md += `\n---\n\n## Layer 4 · VALIDATING / 验证\n`;

  if (fiveLayer) {
    fiveLayer.evaluation.test_cases.forEach((tc, i) => {
      md += `\n### Test Case ${i + 1}\n`;
      md += `- **Prompt:** ${tc.prompt.substring(0, 200)}\n`;
      md += `- **Expected:** ${tc.expected}\n`;
      md += `- **Pass criteria:** ${tc.pass_criteria}\n`;
    });
    md += `\n**Metric:** \`${fiveLayer.evaluation.metric}\`\n`;
  } else {
    md += `*No evaluation test cases — complete the Intuition Probe to auto-generate.*\n`;
  }

  md += `\n---\n\n## Layer 5 · CONTEXTUALIZING / 情境化\n`;

  if (fiveLayer) {
    for (const [locale, variant] of Object.entries(fiveLayer.cultural_variants)) {
      md += `\n### ${locale}\n`;
      md += `- **Note:** ${variant.principle_note}\n`;
      md += `- **Adaptation:** ${variant.adaptation}\n`;
    }
  } else {
    md += `*Cultural adaptation pending — will be generated based on probe responses.*\n`;
  }

  md += `\n---\n\n## Creator Rights\n`;
  md += `- **Commercial Use**: ${skillData.commercial === 'allowed' ? 'Allowed' : skillData.commercial === 'authorized' ? 'Authorization Required' : 'Prohibited'}\n`;
  md += `- **Remix**: ${skillData.remix === 'yes' ? 'Allowed' : skillData.remix === 'share-alike' ? 'Share-alike Required' : 'Not Allowed'}\n`;
  md += `\n---\n*Forged with THE 42 POST · Human Semantic Capital Protocol*\n`;

  return md;
}

// Generate agent-optimized format (JSON for machine consumption)
function generateAgentSkillFormat(skillData) {
  const fiveLayer = skillData.fiveLayerSkill || null;

  if (fiveLayer) {
    // Full five-layer JSON
    return JSON.stringify({
      schema: '42post-skill-v0.1',
      id: skillData.soulHash,
      name: skillData.title,
      author: skillData.author,
      domain: skillData.domain,
      license: {
        type: 'creator-reserved',
        commercial: skillData.commercial,
        remix: skillData.remix
      },
      layers: {
        principle: fiveLayer.principle,
        exemplars: fiveLayer.exemplars,
        boundaries: fiveLayer.boundaries,
        evaluation: fiveLayer.evaluation,
        cultural_variants: fiveLayer.cultural_variants
      },
      probe_data: fiveLayer.probe_data
    }, null, 2);
  }

  // Fallback: simple format
  return JSON.stringify({
    schema: '42post-skill-v0.1',
    id: skillData.soulHash,
    name: skillData.title,
    author: skillData.author,
    domain: skillData.domain,
    license: {
      type: 'creator-reserved',
      commercial: skillData.commercial,
      remix: skillData.remix
    },
    layers: {
      principle: skillData.desc,
      exemplars: [],
      boundaries: {
        applies_when: skillData.useCases ? skillData.useCases.split('\n') : [],
        does_not_apply: skillData.disallowedUses ? skillData.disallowedUses.split('\n') : [],
        tension_zones: []
      },
      evaluation: { test_cases: [], metric: 'pending' },
      cultural_variants: {}
    }
  }, null, 2);
}

// Generate LangChain format (Python-friendly)
function generateLangChainFormat(skillData) {
  const fiveLayer = skillData.fiveLayerSkill || null;
  const skillName = skillData.title.replace(/\s+/g, '').replace(/[^\w]/g, '');
  const safeTitle = skillData.title.replace(/"/g, '\\"');
  const safeDesc = (skillData.desc || '').replace(/"/g, '\\"').substring(0, 200);
  const safePrinciple = (fiveLayer?.principle || skillData.desc || '').replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 200);

  let pythonCode = '"""\n';
  pythonCode += 'THE 42 POST · Skill: ' + skillData.title + '\n';
  pythonCode += 'Soul-Hash: ' + skillData.soulHash + '\n';
  pythonCode += 'Author: ' + skillData.author + '\n';
  pythonCode += 'Domain: ' + skillData.domain + '\n\n';
  pythonCode += (skillData.desc || 'A skill forged in The 42 Post.') + '\n';
  pythonCode += '"""\n\n';

  pythonCode += 'from langchain.tools import BaseTool\n';
  pythonCode += 'from typing import Optional, Type\n';
  pythonCode += 'from pydantic import BaseModel, Field\n\n\n';

  pythonCode += 'class ' + skillName + 'Input(BaseModel):\n';
  pythonCode += '    """Input schema for ' + skillData.title + '"""\n';
  pythonCode += '    prompt: str = Field(description="The user input to process")\n';
  pythonCode += '    context: Optional[str] = Field(default="", description="Additional context")\n\n\n';

  pythonCode += 'class ' + skillName + '(BaseTool):\n';
  pythonCode += '    """\n';
  pythonCode += '    ' + skillData.title + '\n\n';
  pythonCode += '    Domain: ' + skillData.domain + '\n';
  pythonCode += '    License: commercial=' + skillData.commercial + ', remix=' + skillData.remix + '\n';
  pythonCode += '    """\n\n';

  pythonCode += '    name = "' + safeTitle + '"\n';
  pythonCode += '    description = """' + safeDesc + '"""\n';
  pythonCode += '    args_schema: Type[BaseModel] = ' + skillName + 'Input\n\n';

  pythonCode += '    def _run(self, prompt: str, context: str = "") -> str:\n';
  pythonCode += '        """Execute the skill with the given prompt and context."""\n\n';

  pythonCode += '        # LAYER 1: DEFINING (Core Principle)\n';
  pythonCode += '        principle = "' + safePrinciple + '"\n\n';

  pythonCode += '        # LAYER 2: INSTANTIATING (Examples)\n';
  pythonCode += '        exemplars = [\n';
  if (fiveLayer?.exemplars && fiveLayer.exemplars.length > 0) {
    fiveLayer.exemplars.forEach(ex => {
      const safeLabel = (ex.label || '').replace(/"/g, '\\"');
      const safeText = (ex.text || '').replace(/"/g, '\\"').substring(0, 100);
      pythonCode += '            {"label": "' + safeLabel + '", "example": "' + safeText + '"},\n';
    });
  } else {
    pythonCode += '            # Add exemplars here\n';
  }
  pythonCode += '        ]\n\n';

  pythonCode += '        # Execute skill logic here\n';
  pythonCode += '        result = f"""\n';
  pythonCode += 'Applied skill: {self.name}\n';
  pythonCode += 'Input: {prompt}\n';
  pythonCode += 'Context: {context}\n';
  pythonCode += 'Principle: {principle}\n';
  pythonCode += '        """.strip()\n\n';

  pythonCode += '        return result\n\n\n';
  pythonCode += '# Usage in LangChain agent:\n';
  pythonCode += '# tools = [' + skillName + '()]\n';
  pythonCode += '# agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)\n';

  return pythonCode;
}

// Generate MCP Config format (JSON for deployment)
function generateMCPConfigFormat(skillData) {
  const fiveLayer = skillData.fiveLayerSkill || null;
  const safeTitle = skillData.title.replace(/\s+/g, '_');

  const exemplarsArray = fiveLayer?.exemplars?.map((ex, i) => ({
    "label": ex.label || ('Example ' + (i + 1)),
    "before": (ex.text || '').split('→')[0]?.trim() || "",
    "after": (ex.text || '').split('→')[1]?.trim() || "",
    "note": ex.note || ""
  })) || [];

  const testCasesArray = fiveLayer?.evaluation?.test_cases?.map((tc, i) => ({
    "id": 'test_' + (i + 1),
    "prompt": tc.prompt || "",
    "expected_behavior": tc.expected || "",
    "pass_criteria": tc.pass_criteria || ""
  })) || [];

  const culturalVariantsArray = Object.entries(fiveLayer?.cultural_variants || {}).map(([locale, variant]) => ({
    "locale": locale,
    "principle_note": variant.principle_note || "",
    "adaptation": variant.adaptation || ""
  }));

  const manifest = {
    "skill_manifest": {
      "version": "0.1.0",
      "schema": "42post-mcp-skill-v0.1",
      "metadata": {
        "id": skillData.soulHash,
        "title": skillData.title,
        "titleCn": skillData.titleCn || skillData.title,
        "author": skillData.author,
        "email": skillData.email || "",
        "domain": skillData.domain,
        "description": skillData.desc,
        "created_at": new Date().toISOString(),
        "version_number": 1
      },
      "license": {
        "type": "creator-reserved",
        "commercial_use": skillData.commercial,
        "remix_allowed": skillData.remix
      },
      "five_layer_architecture": {
        "defining": {
          "principle": fiveLayer?.principle || skillData.desc || "",
          "summary": "Core principle and value alignment"
        },
        "instantiating": {
          "exemplars": exemplarsArray
        },
        "fencing": {
          "applies_when": fiveLayer?.boundaries?.applies_when || [],
          "does_not_apply": fiveLayer?.boundaries?.does_not_apply || [],
          "tension_zones": fiveLayer?.boundaries?.tension_zones || []
        },
        "validating": {
          "test_cases": testCasesArray,
          "evaluation_metric": fiveLayer?.evaluation?.metric || "user_feedback"
        },
        "contextualizing": {
          "cultural_variants": culturalVariantsArray
        }
      },
      "deployment": {
        "supported_frameworks": ["langchain", "llamaindex", "claude-sdk", "custom"],
        "integration_guide": "Install this skill in your Model Context Protocol (MCP) enabled system.\n\n1. Save this file as " + safeTitle + ".skill.json\n2. Load in your MCP configuration: { \"skills\": [\"" + safeTitle + ".skill.json\"] }\n3. The skill will be available to all agents in your system",
        "model_compatibility": ["claude-3-opus", "claude-3-sonnet", "gpt-4", "gemini-1.5-pro"],
        "cost_note": "Skill execution costs depend on your LLM provider. No additional charges from The 42 POST."
      },
      "usage_example": {
        "scenario": skillData.desc.substring(0, 100),
        "input_prompt": 'Please apply "' + skillData.title + '" to this task: [user request here]',
        "expected_output": "Aligned response respecting the skill's five-layer principles"
      },
      "support": {
        "creator_contact": skillData.email || "creator@42post.io",
        "documentation_url": "https://42post.io/skills/" + skillData.soulHash,
        "feedback_url": "https://42post.io/skills/" + skillData.soulHash + "/feedback"
      }
    }
  };

  return JSON.stringify(manifest, null, 2);
}

// Trigger download of skill as SKILL.md file
function downloadSkillPackage(skillData) {
  const content = generateSkillMarkdown(skillData);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${skillData.title.replace(/\s+/g, '_')}_SKILL.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Copy agent-optimized skill format to clipboard
function copySkillToClipboard(skillData) {
  const content = generateAgentSkillFormat(skillData);
  navigator.clipboard.writeText(content).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ COPIED';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  });
}

// Load and display skills in Agent Archive
// DEPRECATED: Use initAgentArchiveView() instead
// This function has been replaced by the full Celestial Map implementation

// Show Agent Archive page
function showAgentArchive() {
  // Hide ALL main page content
  const hideSelectors = [
    '.global-header',
    '.manifesto-strip',
    '#sectionHeadline',
    '.section-breath',
    '#sectionCreative',
    '#sectionVibe',
    '#globalFooter'
  ];
  hideSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
  });

  // Show archive section
  const archiveSection = document.getElementById('sectionAgentArchive');
  if (archiveSection) {
    archiveSection.style.display = 'block';
    window.scrollTo(0, 0);

    // Wait for next frame to ensure DOM is ready, then init canvas
    requestAnimationFrame(() => {
      initAgentArchiveView();
    });
  }
}

// Show main page (hide archive)
function showMainPage() {
  // Hide archive
  const archiveSection = document.getElementById('sectionAgentArchive');
  if (archiveSection) archiveSection.style.display = 'none';

  // Show ALL main page content
  const showSelectors = [
    '.global-header',
    '.manifesto-strip',
    '#sectionHeadline',
    '.section-breath',
    '#sectionCreative',
    '#sectionVibe',
    '#globalFooter'
  ];
  showSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.style.display = '');
  });

  window.scrollTo(0, 0);
}

// Initialize skill download button
function downloadMarkdownSkill(skillData) {
  const content = generateSkillMarkdown(skillData);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${skillData.title.replace(/\s+/g, '_')}_SKILL.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadLangChainSkill(skillData) {
  const content = generateLangChainFormat(skillData);
  const blob = new Blob([content], { type: 'text/python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${skillData.title.replace(/\s+/g, '_')}_skill.py`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadMCPConfigSkill(skillData) {
  const content = generateMCPConfigFormat(skillData);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${skillData.title.replace(/\s+/g, '_')}.skill.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function initSkillPackageDownload() {
  const downloadBtn = document.getElementById('btnDownloadSkill');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (window.currentForgedSkill) {
        downloadSkillPackage(window.currentForgedSkill);
      } else {
        alert('No skill data available. Please forge a skill first.');
      }
    });
  }

  // Export format buttons
  const btnMarkdown = document.getElementById('btnExportMarkdown');
  const btnLangChain = document.getElementById('btnExportLangChain');
  const btnMCP = document.getElementById('btnExportMCP');

  if (btnMarkdown) {
    btnMarkdown.addEventListener('click', () => {
      if (window.currentForgedSkill) {
        downloadMarkdownSkill(window.currentForgedSkill);
      } else {
        alert('No skill data available. Please forge a skill first.');
      }
    });
  }

  if (btnLangChain) {
    btnLangChain.addEventListener('click', () => {
      if (window.currentForgedSkill) {
        downloadLangChainSkill(window.currentForgedSkill);
      } else {
        alert('No skill data available. Please forge a skill first.');
      }
    });
  }

  if (btnMCP) {
    btnMCP.addEventListener('click', () => {
      if (window.currentForgedSkill) {
        downloadMCPConfigSkill(window.currentForgedSkill);
      } else {
        alert('No skill data available. Please forge a skill first.');
      }
    });
  }
}

// Initialize back button in Agent Archive
function initArchiveBackButton() {
  const backBtn = document.getElementById('btnBackHome');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showMainPage();
    });
  }
}

/* ═══════════════════════════════════════════════════════
   AGENT ARCHIVE - Celestial Map Implementation
   ═══════════════════════════════════════════════════════ */

// Domain metadata
const ARCHIVE_DOMAINS = [
  { key: 'safety',     cn: '安全与治理', en: 'Safety & Governance' },
  { key: 'science',    cn: '科技与人文', en: 'Science & Humanities' },
  { key: 'narrative',  cn: '叙事与修辞', en: 'Narrative & Rhetoric' },
  { key: 'design',     cn: '设计与思辨', en: 'Design & Critique' },
  { key: 'visual',     cn: '视觉与美学', en: 'Visuals & Aesthetics' },
  { key: 'experience', cn: '交互与体验', en: 'Experience & Interaction' },
  { key: 'sound',      cn: '声音与节律', en: 'Sound & Rhythm' },
  { key: 'ideas',      cn: '观念与感知', en: 'Ideas & Perception' },
  { key: 'history',    cn: '历史与哲学', en: 'History & Philosophy' },
  { key: 'fun',        cn: '纯粹乐趣', en: 'Just for Fun' },
];

const DOMAIN_COLORS = {
  safety:     { r: 212, g: 114, b: 106, hex: '#d4726a' },
  science:    { r: 106, g: 142, b: 186, hex: '#6a8eba' },
  narrative:  { r: 212, g: 164, b: 60,  hex: '#d4a43c' },
  design:     { r: 154, g: 122, b: 166, hex: '#9a7aa6' },
  visual:     { r: 210, g: 130, b: 100, hex: '#d28264' },
  experience: { r: 58,  g: 154, b: 140, hex: '#3a9a8c' },
  sound:      { r: 90,  g: 170, b: 180, hex: '#5aaab4' },
  ideas:      { r: 190, g: 170, b: 80,  hex: '#beaa50' },
  history:    { r: 170, g: 130, b: 110, hex: '#aa826e' },
  fun:        { r: 120, g: 180, b: 140, hex: '#78b48c' },
};

function soulHash(str) {
  let h = 0x42;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) & 0xffffffff;
  return 'SOUL_' + Math.abs(h).toString(16).padStart(8, '0');
}

function initAgentArchiveView() {
  const canvas = document.getElementById('celestialCanvas');
  const canvasWrap = document.getElementById('canvasWrap');
  const tooltip = document.getElementById('starTooltip');

  if (!canvas || !canvasWrap) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  let nodes = [];
  let edges = [];
  let bgStars = [];
  let cam = { x: 0, y: 0, zoom: 1 };
  let drag = { active: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };
  let hoveredNode = null;
  let clickedNode = null;
  let cw = 0, ch = 0;

  // Combine demo skills with forged skills from localStorage
  const forgedSkills = getRecentForges();
  // Add starlight=5 to forged skills so they appear smaller initially
  const forgedSkillsWithStarlight = forgedSkills.map(s => ({
    ...s,
    starlight: s.starlight || 5,
    titleCn: s.titleCn || s.title,
    descCn: s.descCn || s.desc
  }));

  const allSkills = [...SHARED_SKILLS, ...forgedSkillsWithStarlight];
  
  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    cw = rect.width;
    ch = rect.height;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  
  function initNodes() {
    const cx = cw / 2;
    const cy = ch / 2;

    bgStars = [];
    for (let i = 0; i < 200; i++) {
      bgStars.push({
        x: (Math.random() - 0.5) * cw * 4,
        y: (Math.random() - 0.5) * ch * 4,
        size: Math.random() * 1.0 + 0.3,
        alpha: Math.random() * 0.3 + 0.05,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    nodes = allSkills.map((s, i) => {
      const angle = (i / allSkills.length) * Math.PI * 2 + (i * 0.618);
      const spiralR = 80 + i * 13 + Math.sin(i * 2.1) * 50;
      const x = cx + Math.cos(angle) * spiralR + (Math.random() - 0.5) * 30;
      const y = cy + Math.sin(angle) * spiralR * 0.65 + (Math.random() - 0.5) * 25;
      const color = DOMAIN_COLORS[s.domain] || DOMAIN_COLORS.ideas;
      return {
        x, y, baseX: x, baseY: y,
        size: 3.5 + s.starlight * 0.2,
        starlight: s.starlight,
        title: s.title, titleCn: s.titleCn,
        desc: s.desc, agent: s.agent,
        domain: s.domain, id: s.id,
        hash: soulHash(s.id + s.title),
        color, phase: Math.random() * Math.PI * 2,
      };
    });
    
    edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].baseX - nodes[j].baseX, nodes[i].baseY - nodes[j].baseY);
        if (dist < 160 && Math.random() > 0.45) edges.push([i, j]);
      }
    }
  }
  
  function render() {
    const t = Date.now() * 0.001;
    ctx.clearRect(0, 0, cw, ch);
    
    const bg = ctx.createLinearGradient(0, 0, cw * 0.3, ch);
    bg.addColorStop(0,    '#d8ccd6');
    bg.addColorStop(0.25, '#e0cec8');
    bg.addColorStop(0.50, '#e8d6c0');
    bg.addColorStop(0.75, '#eddcb8');
    bg.addColorStop(1,    '#f2e2c0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);
    
    ctx.save();
    ctx.translate(cw/2 + cam.x * cam.zoom, ch/2 + cam.y * cam.zoom);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cw/2, -ch/2);
    
    bgStars.forEach(s => {
      const tw = 0.3 + Math.sin(t * 0.8 + s.twinkle) * 0.2;
      ctx.beginPath();
      ctx.arc(s.x + cw/2, s.y + ch/2, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160, 120, 80, ${s.alpha * tw * 0.5})`;
      ctx.fill();
    });
    
    nodes.forEach(n => {
      n.x = n.baseX + Math.sin(t * 0.4 + n.phase) * 1.5;
      n.y = n.baseY + Math.cos(t * 0.35 + n.phase) * 1.5;
    });
    
    edges.forEach(([i, j]) => {
      const a = nodes[i], b = nodes[j];
      const c = a.color;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.10 + Math.sin(t + i) * 0.03})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });
    
    nodes.forEach((n, i) => {
      const breathe = 1 + Math.sin(t * 1.2 + n.phase) * 0.08;
      const isHov = hoveredNode === i;
      const isClk = clickedNode === i;
      const highlight = isHov || isClk;
      
      const glowR = (n.size * 6 + n.starlight * 0.5) * breathe * (highlight ? 2.5 : 1);
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
      glow.addColorStop(0, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${highlight ? 0.5 : 0.3})`);
      glow.addColorStop(0.35, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${highlight ? 0.12 : 0.06})`);
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      
      const sz = n.size * breathe * (highlight ? 1.5 : 1);
      ctx.beginPath();
      ctx.arc(n.x, n.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = n.color.hex;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(n.x - sz * 0.15, n.y - sz * 0.15, sz * 0.25, 0, Math.PI * 2);
      const ha = 0.5 + Math.sin(t * 2 + n.phase) * 0.15;
      ctx.fillStyle = `rgba(255,252,240,${highlight ? ha + 0.2 : ha * 0.5})`;
      ctx.fill();
      
      if (n.starlight > 14 || highlight) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, sz * 2.2 * breathe, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${highlight ? 0.3 : 0.12})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
      
      if (highlight) {
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(44,36,32,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(n.title, n.x, n.y - sz * 2.8 - 2);
        if (isClk) {
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(184,74,48,0.85)';
          ctx.fillText(n.hash, n.x, n.y + sz * 2.8 + 10);
        }
      }
    });
    
    ctx.restore();
    requestAnimationFrame(render);
  }
  
  function screenToWorld(sx, sy) {
    const rect = canvasWrap.getBoundingClientRect();
    const lx = sx - rect.left;
    const ly = sy - rect.top;
    return {
      x: (lx - cw/2) / cam.zoom - cam.x + cw/2,
      y: (ly - ch/2) / cam.zoom - cam.y + ch/2,
    };
  }
  
  function findNodeAt(sx, sy) {
    const w = screenToWorld(sx, sy);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (Math.hypot(w.x - n.x, w.y - n.y) < n.size * 4 + 8) return i;
    }
    return null;
  }
  
  canvas.addEventListener('mousedown', e => {
    drag = { active: true, startX: e.clientX, startY: e.clientY, camStartX: cam.x, camStartY: cam.y };
  });
  
  canvas.addEventListener('mousemove', e => {
    if (drag.active) {
      cam.x = drag.camStartX + (e.clientX - drag.startX) / cam.zoom;
      cam.y = drag.camStartY + (e.clientY - drag.startY) / cam.zoom;
      tooltip.classList.remove('visible');
      hoveredNode = null;
      return;
    }
    
    const idx = findNodeAt(e.clientX, e.clientY);
    hoveredNode = idx;
    if (idx !== null) {
      const n = nodes[idx];
      const rect = canvasWrap.getBoundingClientRect();
      document.getElementById('ttName').textContent = n.title;
      document.getElementById('ttNameCn').textContent = n.titleCn;
      document.getElementById('ttAgent').textContent = n.agent;
      document.getElementById('ttDesc').textContent = n.desc;
      document.getElementById('ttHash').textContent = n.hash;
      document.getElementById('ttStarlight').textContent = '★ ' + n.starlight;
      document.getElementById('ttDomain').textContent = n.domain;
      tooltip.style.left = Math.min(e.clientX - rect.left + 16, cw - 300) + 'px';
      tooltip.style.top = Math.min(e.clientY - rect.top + 16, ch - 180) + 'px';
      tooltip.classList.add('visible');
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.classList.remove('visible');
      canvas.style.cursor = 'grab';
    }
  });
  
  canvas.addEventListener('mouseup', e => {
    const moved = Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4;
    drag.active = false;
    if (!moved) {
      const idx = findNodeAt(e.clientX, e.clientY);
      clickedNode = clickedNode === idx ? null : idx;
    }
  });
  
  canvas.addEventListener('mouseleave', () => {
    tooltip.classList.remove('visible');
    hoveredNode = null;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    cam.zoom = Math.max(0.3, Math.min(5, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    document.getElementById('zoomInfo').textContent = Math.round(cam.zoom * 100) + '%';
  }, { passive: false });
  
  document.getElementById('zoomIn').onclick = () => { cam.zoom = Math.min(5, cam.zoom * 1.3); document.getElementById('zoomInfo').textContent = Math.round(cam.zoom * 100) + '%'; };
  document.getElementById('zoomOut').onclick = () => { cam.zoom = Math.max(0.3, cam.zoom * 0.7); document.getElementById('zoomInfo').textContent = Math.round(cam.zoom * 100) + '%'; };
  document.getElementById('zoomReset').onclick = () => { cam = { x: 0, y: 0, zoom: 1 }; document.getElementById('zoomInfo').textContent = '100%'; };
  
  // Honor Panel Toggle
  const honorPanel = document.getElementById('honorPanel');
  const toggleClose = document.getElementById('honorToggle');
  const toggleOpen = document.getElementById('honorToggleOpen');
  
  function refreshCanvas() {
    setTimeout(() => { resizeCanvas(); initNodes(); }, 420);
  }
  
  toggleClose.addEventListener('click', () => {
    honorPanel.classList.add('collapsed');
    toggleOpen.classList.add('visible');
    refreshCanvas();
  });
  
  toggleOpen.addEventListener('click', () => {
    honorPanel.classList.remove('collapsed');
    toggleOpen.classList.remove('visible');
    refreshCanvas();
  });
  
  // Honor List
  function initHonorList() {
    const list = document.getElementById('honorList');
    const sorted = [...allSkills].sort((a, b) => b.starlight - a.starlight);

    list.innerHTML = '';
    sorted.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'honor-row';
      row.innerHTML = `
        <span class="honor-rank">#${String(i + 1).padStart(2, '0')}</span>
        <span class="honor-star">★${s.starlight}</span>
        <span class="honor-name">${s.title}</span>
        <span class="honor-starlight">#${s.id}</span>
      `;
      row.addEventListener('click', () => {
        const ni = nodes.findIndex(n => n.id === s.id);
        if (ni >= 0) {
          const n = nodes[ni];
          cam.x = cw/2 - n.baseX;
          cam.y = ch/2 - n.baseY;
          cam.zoom = 2.5;
          clickedNode = ni;
          document.getElementById('zoomInfo').textContent = '250%';
        }
      });
      list.appendChild(row);
    });
  }
  
  // Domain Grid
  function initDomainGrid() {
    const grid = document.getElementById('domainGrid');
    const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');

    grid.innerHTML = '';
    ARCHIVE_DOMAINS.forEach(dom => {
      const domSkills = allSkills.filter(s => s.domain === dom.key);
      const cell = document.createElement('div');
      cell.className = 'domain-cell';

      const openSeats = Math.max(0, 2 - domSkills.length);
      let html = domSkills.map(s => {
        const hash = soulHash(s.id + s.title);
        const isStarred = starredSkills[s.id] === true;
        const canDownload = isStarred;
        return `
          <div class="domain-skill" data-skill-id="${s.id}">
            <div class="domain-skill-title">${s.title}</div>
            <div class="domain-skill-title-cn">${s.titleCn}</div>
            <div class="domain-skill-agent">${s.agent}</div>
            <div class="domain-skill-desc">${s.desc}</div>
            <div class="domain-skill-meta">
              <span class="hash-val">${hash}</span>
              <span>★ ${s.starlight}</span>
            </div>
            <div class="domain-skill-actions">
              <button class="btn-skill-star" data-skill-id="${s.id}" title="Star this skill">
                ${isStarred ? '⭐' : '☆'} ${s.stars || 0}
              </button>
              <button class="btn-skill-download" data-skill-id="${s.id}"
                      ${!canDownload ? 'disabled' : ''}
                      title="${canDownload ? 'Download' : 'Star first'}">
                📥 ${s.downloads || 0}
              </button>
            </div>
          </div>`;
      }).join('');
      
      for (let i = 0; i < openSeats; i++) {
        html += `
          <div class="domain-skill domain-open-seat">
            <div class="domain-skill-title">Open Seat</div>
            <div class="domain-skill-desc">Awaiting alignment contribution.</div>
          </div>`;
      }
      
      cell.innerHTML = `
        <div class="domain-title">${dom.cn}</div>
        <div class="domain-title-en">${dom.en}</div>
        ${html}
      `;
      grid.appendChild(cell);
    

  // ═══ STEP 2.5: Ready to Forge → STEP 2 ═══
  const btnProceedToPublish = document.querySelector('[data-next="3"]');
  if (btnProceedToPublish) {
    btnProceedToPublish.addEventListener('click', () => {
      goToStep(2);
    });
  }
  
  // ═══ STEP 2: Confirm Generated Skill ═══
  const btnConfirmSkill = document.getElementById('btnConfirmSkill');
  if (btnConfirmSkill) {
    btnConfirmSkill.addEventListener('click', () => {
      // 保存用户的确认
      if (window.forgeData && window.forgeData.generatedSkill) {
        console.log('✓ 用户确认了自动生成的技能');
        goToStep(3); // 进入STEP 3: PUBLISH
      }
    });
  }
  
  const btnAdjust = document.getElementById('btnAdjust');
  if (btnAdjust) {
    btnAdjust.addEventListener('click', () => {
      alert('微调功能开发中 / Adjust feature coming soon');
    });
  }

});
  }
  
  // Initialize
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); initNodes(); });
  initNodes();
  initHonorList();
  initDomainGrid();
  initTop42Grid();
  // Attach event listeners for skill interactions (star, download, view)
  setTimeout(() => {
    if (typeof attachDomainSkillListeners === 'function') {
      attachDomainSkillListeners();
    }
  }, 100);
  render();
}

/* ═══════════════════════════════════════════════════════════
   TOP 42 MOST POPULAR SKILLS INITIALIZATION
   Populate the homepage top 42 grid with highest-starlight skills
   ═══════════════════════════════════════════════════════════ */

function initTop42Grid() {
  const gridEl = document.getElementById('top42Grid');
  if (!gridEl) return;

  // Get top 42 skills sorted by starlight
  const topSkills = getTopSkills(42);

  gridEl.innerHTML = '';
  topSkills.forEach((skill, index) => {
    const rank = index + 1;
    const cellHTML = `
      <div class="top42-cell" data-skill-id="${skill.id}">
        <div class="top42-skill-rank">★ #${rank}</div>
        <div class="top42-skill-title">${skill.title}</div>
        <div class="top42-skill-title-cn">${skill.titleCn || ''}</div>
        <div class="top42-skill-desc">${skill.desc}</div>
        <div class="top42-skill-meta">
          <div class="top42-skill-meta-item">⭐ <span>${skill.starlight || 0}</span></div>
          <div class="top42-skill-meta-item">📥 <span>${skill.downloads || 0}</span></div>
          <div class="top42-skill-meta-item">${skill.domain}</div>
        </div>
        <div class="top42-skill-actions">
          <button class="top42-action-btn star-btn" data-skill-id="${skill.id}" title="Star this skill">⭐ STAR</button>
          <button class="top42-action-btn download-btn" data-skill-id="${skill.id}" title="Download skill">📥 DOWNLOAD</button>
        </div>
      </div>
    `;
    gridEl.innerHTML += cellHTML;
  });

  // Attach listeners to the buttons
  setTimeout(() => {
    attachTop42SkillListeners();
  }, 50);
}

/* ═══════════════════════════════════════════════════════════
   TOP 42 SKILL INTERACTIVE SYSTEM
   Attach event listeners to star/download buttons on top42 cards
   ═══════════════════════════════════════════════════════════ */

function attachTop42SkillListeners() {
  console.log('🔧 Attaching top42 skill listeners...');
  const skillCells = document.querySelectorAll('.top42-cell[data-skill-id]');
  console.log(`Found ${skillCells.length} top42 skill cells`);

  skillCells.forEach(cell => {
    const skillId = cell.dataset.skillId;

    // Find skill from ALL_SKILLS
    let skill = typeof ALL_SKILLS !== 'undefined' ? ALL_SKILLS.find(s => s.id === skillId) : null;
    if (!skill) {
      skill = SHARED_SKILLS && SHARED_SKILLS.find(s => s.id === skillId);
    }

    if (!skill) {
      console.warn(`Skill with ID ${skillId} not found`);
      return;
    }

    // Star button
    const starBtn = cell.querySelector('.star-btn');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
        const isStarred = starredSkills[skillId] === true;

        if (isStarred) {
          delete starredSkills[skillId];
          starBtn.classList.remove('starred');
          skill.starlight = (skill.starlight || 0) - 1;
        } else {
          starredSkills[skillId] = true;
          starBtn.classList.add('starred');
          skill.starlight = (skill.starlight || 0) + 1;
        }

        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));
        // Update the display
        const starDisplay = cell.querySelector('.top42-skill-meta .top42-skill-meta-item:first-child span');
        if (starDisplay) starDisplay.textContent = skill.starlight || 0;
      });

      // Check if already starred
      const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
      if (starredSkills[skillId]) {
        starBtn.classList.add('starred');
      }
    }

    // Download button
    const downloadBtn = cell.querySelector('.download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Generate markdown and download
        const markdown = generateDomainSkillMarkdown(skill);
        downloadMarkdownFile(markdown, skill.id, skill.title);

        // Update download counter
        skill.downloads = (skill.downloads || 0) + 1;
        const downloadDisplay = cell.querySelector('.top42-skill-meta .top42-skill-meta-item:nth-child(2) span');
        if (downloadDisplay) downloadDisplay.textContent = skill.downloads;
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   DOMAIN SKILL INTERACTIVE SYSTEM
   Attach event listeners to star/download/view buttons
   ═══════════════════════════════════════════════════════════ */

function attachDomainSkillListeners() {
  console.log('🔧 Attaching domain skill listeners...');
  const skillCards = document.querySelectorAll('.domain-skill[data-skill-id]');
  console.log(`Found ${skillCards.length} skill cards`);

  skillCards.forEach(card => {
    const skillId = card.dataset.skillId;

    // Find skill from SHARED_SKILLS (which includes both original and forged skills)
    let skill = SHARED_SKILLS && SHARED_SKILLS.find(s => s.id === skillId);

    if (!skill) {
      console.warn(`Skill with ID ${skillId} not found in SHARED_SKILLS`);
      return;
    }

    // Ensure skill has required properties
    skill.stars = skill.stars || 0;
    skill.downloads = skill.downloads || 0;

    // Star button handler
    const starBtn = card.querySelector('.btn-skill-star');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
        const isCurrentlyStarred = starredSkills[skillId] === true;

        if (isCurrentlyStarred) {
          delete starredSkills[skillId];
          skill.stars = Math.max(0, (skill.stars || 0) - 1);
          starBtn.textContent = `☆ ${skill.stars}`;
        } else {
          starredSkills[skillId] = true;
          skill.stars = (skill.stars || 0) + 1;
          starBtn.textContent = `⭐ ${skill.stars}`;
        }

        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));

        // Enable/disable download button
        const downloadBtn = card.querySelector('.btn-skill-download');
        if (downloadBtn) {
          const newIsStarred = starredSkills[skillId] === true;
          if (newIsStarred) {
            downloadBtn.removeAttribute('disabled');
            downloadBtn.title = 'Download';
          } else {
            downloadBtn.setAttribute('disabled', '');
            downloadBtn.title = 'Star first to download';
          }
        }

        console.log(`⭐ Skill "${skill.title}" star toggled. Current stars: ${skill.stars}`);
      });
    }

    // Download button handler
    const downloadBtn = card.querySelector('.btn-skill-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
        if (starredSkills[skillId] !== true) {
          alert('⭐ Please star this skill first before downloading.');
          return;
        }

        skill.downloads = (skill.downloads || 0) + 1;
        downloadBtn.textContent = `📥 ${skill.downloads}`;

        const markdown = generateDomainSkillMarkdown(skill);
        const filename = `${skill.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
        downloadMarkdownFile(markdown, filename);

        console.log(`📥 Skill "${skill.title}" downloaded (${skill.downloads} total)`);
      });
    }
  });

  console.log('✓ Domain skill listeners attached');
}

function generateDomainSkillMarkdown(skill) {
  const fiveLayer = skill.five_layer || {};

  let markdown = `# ${skill.title}\n`;
  markdown += `*${skill.titleCn || skill.title}*\n\n`;

  markdown += `**Forger:** ${skill.author}\n`;
  markdown += `**Soul-Hash:** ${soulHash(skill.id + skill.title)}\n`;
  markdown += `**Domain:** ${skill.domain}\n`;
  markdown += `**⭐ Starlight:** ${skill.starlight || 0}\n`;
  markdown += `**📥 Downloads:** ${skill.downloads || 0}\n\n`;
  markdown += `---\n\n`;

  // DEFINING section
  if (fiveLayer.defining) {
    markdown += `## DEFINING\n${fiveLayer.defining}\n\n`;
  }

  // INSTANTIATING section
  if (fiveLayer.instantiating) {
    markdown += `## INSTANTIATING\n`;
    if (typeof fiveLayer.instantiating === 'object' && fiveLayer.instantiating.before) {
      markdown += `**Before:**\n${fiveLayer.instantiating.before}\n\n`;
      markdown += `**After:**\n${fiveLayer.instantiating.after}\n\n`;
    } else {
      markdown += `${fiveLayer.instantiating}\n\n`;
    }
  }

  // FENCING section
  if (fiveLayer.fencing) {
    markdown += `## FENCING\n`;
    if (typeof fiveLayer.fencing === 'object') {
      if (fiveLayer.fencing.apply) {
        markdown += `**When to apply:**\n${fiveLayer.fencing.apply}\n\n`;
      }
      if (fiveLayer.fencing.notApply) {
        markdown += `**When NOT to apply:**\n${fiveLayer.fencing.notApply}\n\n`;
      }
    } else {
      markdown += `${fiveLayer.fencing}\n\n`;
    }
  }

  // VALIDATING section
  if (fiveLayer.validating) {
    markdown += `## VALIDATING\n`;
    if (Array.isArray(fiveLayer.validating)) {
      markdown += fiveLayer.validating.map(v => `- ${v}`).join('\n') + '\n\n';
    } else if (typeof fiveLayer.validating === 'object') {
      Object.entries(fiveLayer.validating).forEach(([key, value]) => {
        markdown += `**${key}:**\n${value}\n\n`;
      });
    } else {
      markdown += `${fiveLayer.validating}\n\n`;
    }
  }

  // CONTEXTUALIZING section
  if (fiveLayer.contextualizing) {
    markdown += `## CONTEXTUALIZING\n${fiveLayer.contextualizing}\n\n`;
  }

  markdown += `---\n\n`;
  markdown += `**Commercial Use:** ${skill.commercial || 'authorized'}\n`;
  markdown += `**Remixing:** ${skill.remix || 'share-alike'}\n`;

  return markdown;
}

/* ═══════════════ EMAIL TEMPLATE FUNCTIONS ═══════════════ */

/**
 * Generate email HTML content with Skill data
 * Used for backend email sending
 */
function generateForgeSuccessEmail(skillData) {
  const soulHash = skillData.id;
  const skillTitle = skillData.title;
  const creatorName = skillData.author || 'Creator';
  const createdDate = new Date().toISOString().split('T')[0];
  const domain = skillData.domain_cn || skillData.domain;

  // Generate download URLs (these would be actual backend URLs)
  const baseUrl = window.location.origin;
  const downloadMarkdownUrl = `${baseUrl}/api/skills/${soulHash}/download?format=markdown`;
  const downloadLangChainUrl = `${baseUrl}/api/skills/${soulHash}/download?format=langchain`;
  const downloadMCPUrl = `${baseUrl}/api/skills/${soulHash}/download?format=mcp`;
  const dashboardLink = `${baseUrl}?soul_hash=${soulHash}&token=${skillData.tracking_token}`;
  const playgroundLink = `${baseUrl}?skill=${soulHash}#playground`;

  // Read email template and replace variables
  let emailHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Playfair Display', 'Courier New', serif; background: #f9f9f9; color: #333; line-height: 1.6; }
        .email-container { max-width: 700px; margin: 0 auto; background: white; }
        .email-header { padding: 40px 30px; border-bottom: 2px solid #222; text-align: center; }
        .email-header h1 { font-size: 28px; font-weight: bold; margin-bottom: 10px; color: #222; }
        .email-header p { font-size: 14px; color: #666; }
        .email-body { padding: 40px 30px; }
        .greeting { font-size: 14px; margin-bottom: 20px; color: #333; }
        .congratulation { padding: 20px; background: #f0f8f0; border-left: 4px solid #22c55e; margin: 20px 0; font-size: 13px; line-height: 1.8; }
        .card-section { margin: 40px 0; text-align: center; }
        .card-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #222; }
        .commemorative-card { background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%); border: 2px solid #222; padding: 30px; max-width: 500px; margin: 0 auto; text-align: center; font-family: 'Courier New', monospace; }
        .card-header { font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #666; margin-bottom: 15px; }
        .card-content { padding: 20px 0; }
        .card-crest { font-size: 36px; margin-bottom: 10px; }
        .card-title-main { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #222; font-family: 'Playfair Display', serif; }
        .card-soul-hash { font-size: 11px; color: #999; background: #f0f0f0; padding: 8px; border-radius: 3px; margin: 10px 0; word-break: break-all; }
        .card-meta { font-size: 11px; color: #888; margin: 15px 0; line-height: 1.8; }
        .card-divider { border-top: 1px solid #ddd; margin: 15px 0; }
        .card-footer { font-size: 12px; color: #222; font-weight: bold; }
        .install-section { margin: 40px 0; padding: 30px; background: #fafafa; border-radius: 4px; }
        .install-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 10px; color: #222; font-family: 'Playfair Display', serif; }
        .install-subtitle { font-size: 13px; text-align: center; color: #666; margin-bottom: 30px; font-family: serif; }
        .formats-row { display: flex; gap: 20px; justify-content: space-around; flex-wrap: wrap; }
        .format-option { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 3px; max-width: 200px; text-align: center; }
        .format-icon { font-size: 32px; margin-bottom: 10px; }
        .format-name { display: block; font-size: 14px; font-weight: bold; color: #222; margin-bottom: 5px; }
        .format-type { display: block; font-size: 11px; color: #666; margin-bottom: 10px; font-style: italic; }
        .format-desc { font-size: 11px; color: #888; margin-bottom: 12px; line-height: 1.5; }
        .download-btn { display: inline-block; background: #222; color: white; padding: 8px 12px; text-decoration: none; border-radius: 2px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; }
        .download-btn:hover { background: #444; }
        .install-note { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding: 15px; border-top: 1px solid #ddd; font-style: italic; }
        .action-section { margin: 30px 0; text-align: center; }
        .action-btn { display: inline-block; background: #222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin: 10px 5px; }
        .action-btn:hover { background: #444; }
        .action-btn-secondary { background: white; color: #222; border: 1px solid #222; }
        .action-btn-secondary:hover { background: #f5f5f5; }
        .email-footer { padding: 30px; border-top: 2px solid #ddd; background: #f9f9f9; font-size: 11px; color: #999; text-align: center; }
        .footer-divider { margin: 15px 0; border-top: 1px solid #ddd; }
        h3 { font-size: 14px; font-weight: bold; color: #222; margin: 20px 0 10px 0; }
        .steps-list { font-size: 12px; color: #666; line-height: 1.8; margin: 10px 0; }
        .steps-list li { margin-left: 20px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>✨ 你的 Skill 已成功铸造 ✨</h1>
          <p>Your Skill Has Been Forged Successfully</p>
        </div>

        <div class="email-body">
          <p class="greeting">亲爱的创作者，</p>

          <div class="congratulation">
            <p>恭喜！你的 Skill 已成功创建并上线至 THE 42 POST 社区。</p>
            <p style="margin-top: 10px;">现在你可以安装它到你的 Agent 系统中，或分享给他人。</p>
          </div>

          <div class="card-section">
            <div class="card-title">📊 你的纪念卡片</div>
            <div class="commemorative-card">
              <div class="card-header">THE 42 POST · SKILL FORGED</div>
              <div class="card-content">
                <div class="card-crest">✨</div>
                <div class="card-title-main">${skillTitle}</div>
                <div class="card-soul-hash">Soul-Hash: ${soulHash}</div>
                <div class="card-meta">
                  <p>Created by: ${creatorName}</p>
                  <p>Date: ${createdDate}</p>
                  <p>Domain: ${domain}</p>
                </div>
                <div class="card-divider"></div>
                <div class="card-footer">www.42post.io</div>
              </div>
            </div>
          </div>

          <div class="install-section">
            <div class="install-title">INSTALL YOUR SKILL</div>
            <div class="install-subtitle">Choose your format and download your forged skill for integration.</div>

            <div class="formats-row">
              <div class="format-option">
                <div class="format-icon">📖</div>
                <div class="format-name">Markdown</div>
                <div class="format-type">Human-Readable</div>
                <div class="format-desc">Perfect for documentation, sharing, and reading. Standard SKILL.md format.</div>
                <a href="${downloadMarkdownUrl}" class="download-btn">↓ DOWNLOAD</a>
              </div>

              <div class="format-option">
                <div class="format-icon">🐍</div>
                <div class="format-name">LangChain</div>
                <div class="format-type">Python Developer</div>
                <div class="format-desc">Python-friendly format for LangChain framework integration. Ready to use in your agent.</div>
                <a href="${downloadLangChainUrl}" class="download-btn">↓ DOWNLOAD</a>
              </div>

              <div class="format-option">
                <div class="format-icon">⚙️</div>
                <div class="format-name">MCP Config</div>
                <div class="format-type">System Deployment</div>
                <div class="format-desc">JSON configuration for Model Context Protocol deployment and system integration.</div>
                <a href="${downloadMCPUrl}" class="download-btn">↓ DOWNLOAD</a>
              </div>
            </div>

            <div class="install-note">
              All formats contain the complete five-layer skill architecture. Choose based on your integration needs.
            </div>
          </div>

          <div class="action-section">
            <a href="${dashboardLink}" class="action-btn">📊 查看 Impact Dashboard</a>
            <a href="${playgroundLink}" class="action-btn action-btn-secondary">🎮 前往 Playground 试试</a>
          </div>

          <h3>接下来你可以：</h3>
          <div class="steps-list">
            <ol>
              <li>下载并安装上述 3 种格式之一到你的系统</li>
              <li>在 Playground 体验你的 Skill 效果</li>
              <li>分享你的 Skill 链接到社区，让更多人发现它</li>
              <li>定期检查 Impact Dashboard 查看数据变化</li>
            </ol>
          </div>
        </div>

        <div class="email-footer">
          <p><strong>THE 42 POST</strong></p>
          <p>A Base for Human Values Alignment in AI Agents</p>
          <div class="footer-divider"></div>
          <p>有任何问题？直接回复这封邮件即可。</p>
          <p>© 2026 THE 42 POST · All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}

/* ═══════════════ DASHBOARD CARD FUNCTIONS ═══════════════ */

/**
 * Check if user has created a Skill and display Dashboard card if exists
 */
function checkAndDisplayDashboard() {
  const params = new URLSearchParams(window.location.search);
  const soulHash = params.get('soul_hash');
  const token = params.get('token');

  // If URL has soul_hash parameter, load and display dashboard card
  if (soulHash && token) {
    loadAndDisplayDashboardCard(soulHash, token);
  } else {
    // Check localStorage for user's created Skills
    const mySkills = JSON.parse(localStorage.getItem('my_forged_skills') || '[]');
    if (mySkills.length > 0) {
      // Display the most recently created Skill's Dashboard
      loadAndDisplayDashboardCard(mySkills[0].soul_hash, mySkills[0].token);
    } else {
      // Hide Dashboard card if no Skill created
      document.getElementById('dashboard-card').style.display = 'none';
    }
  }
}

/**
 * Load and display Dashboard card with Skill data
 */
async function loadAndDisplayDashboardCard(soulHash, token) {
  try {
    // Fetch Skill impact data from API
    const response = await fetch(`/api/skills/${soulHash}/impact?token=${token}`);

    if (!response.ok) {
      console.error('Failed to load dashboard data');
      document.getElementById('dashboard-card').style.display = 'none';
      return;
    }

    const data = await response.json();

    // Populate Dashboard card with Skill data
    document.getElementById('dash-skill-title').textContent = data.title || 'Untitled Skill';
    document.getElementById('dash-soul-hash').textContent = `Soul-Hash: ${data.id}`;
    document.getElementById('dash-views-grid').textContent = data.views || 0;

    const totalDownloads =
      (data.downloads?.markdown || 0) +
      (data.downloads?.langchain || 0) +
      (data.downloads?.mcp || 0);
    document.getElementById('dash-downloads-grid').textContent = totalDownloads;

    document.getElementById('dash-starlight-grid').textContent = data.starlight_count || 0;
    document.getElementById('dash-feedback-grid').textContent = data.feedback_count || 0;

    // Show Dashboard card
    document.getElementById('dashboard-card').style.display = 'block';

    // Save global reference for later use
    window.currentDashboard = {
      soulHash,
      token,
      data
    };

  } catch (error) {
    console.error('Error loading dashboard:', error);
    document.getElementById('dashboard-card').style.display = 'none';
  }
}

/**
 * View full Dashboard (can be expanded functionality)
 */
function viewFullDashboard() {
  const { soulHash, token } = window.currentDashboard || {};
  if (!soulHash || !token) return;

  // Option 1: Scroll to full dashboard section if exists
  const dashboardSection = document.getElementById('my-skill-dashboard');
  if (dashboardSection) {
    dashboardSection.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Option 2: Open separate dashboard page
    window.open(
      `/creator-dashboard?soul_hash=${soulHash}&token=${token}`,
      '_blank'
    );
  }
}

/**
 * Share Skill via native share API or copy to clipboard
 */
function shareSkill() {
  const { data } = window.currentDashboard || {};
  if (!data) return;

  const text = `我刚铸造了一个新的 Skill：《${data.title}》\n\nSoul-Hash: ${data.id}\n\n来 THE 42 POST 体验吧！\nhttps://42post.io`;

  // Use native Share API if available
  if (navigator.share) {
    navigator.share({
      title: 'THE 42 POST',
      text: text,
      url: `https://42post.io?skill=${data.id}`
    }).catch(err => console.error('Share failed:', err));
  } else {
    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('✨ 分享文本已复制到剪贴板！');
    }).catch(err => console.error('Copy failed:', err));
  }
}

/**
 * Save created Skill to localStorage and refresh Dashboard display
 * Called after Skill Forge completes successfully
 */
function onSkillForgeSuccess(skillData) {
  // Save to localStorage
  const mySkills = JSON.parse(localStorage.getItem('my_forged_skills') || '[]');
  mySkills.unshift({
    soul_hash: skillData.id,
    token: skillData.tracking_token || 'temp_token',
    title: skillData.title,
    created_at: new Date().toISOString()
  });
  // Keep only the 10 most recent Skills
  localStorage.setItem('my_forged_skills', JSON.stringify(mySkills.slice(0, 10)));

  // Reload Dashboard display
  checkAndDisplayDashboard();
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Dashboard card check after a short delay to ensure DOM is ready
  setTimeout(checkAndDisplayDashboard, 500);
});
