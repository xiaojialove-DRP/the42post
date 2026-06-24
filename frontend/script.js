/* ═══════════════════════════════════════════════════════
   THE 42 POST — V2.0 Classical Redesign
   i18n · Knight Card · KCS · Dual-Path Forge · Starlight
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   PHASE 0: API CLIENT LAYER (Front-Back Connection)
   ═══════════════════════════════════════════════════════ */

/* ═══ SAFE LOCALSTORAGE UTILITY ═══ */
const safeStorage = {
  getItem(key, fallback = null) {
    try { return localStorage.getItem(key); } catch (e) { return fallback; }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* quota or security */ }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  },
  getJSON(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
};

/* ═══ HTML ESCAPE UTILITY ═══ */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ═══ MOBILE TEXTAREA UX HELPERS ═══
   Two recurring pain points on phones: (1) a fixed-height textarea with
   overflow hidden and no resize handle silently clips long input — the
   user keeps typing into text they can no longer see; (2) the on-screen
   keyboard covers the field they just focused, especially inside a
   scrollable modal, and nothing scrolls it back into view. */

// Grows a textarea to fit its content (up to maxHeightPx, default 40% of
// viewport height), falling back to internal scroll beyond that cap.
function autoGrowTextarea(el, maxHeightPx) {
  if (!el) return () => {};
  const max = maxHeightPx || Math.round(window.innerHeight * 0.4);
  const sync = () => {
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, max);
    el.style.height = next + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  };
  el.addEventListener('input', sync);
  sync();
  return sync;
}

// Scrolls a field into view shortly after focus, so the virtual keyboard
// (which shrinks the visual viewport after its open animation finishes)
// doesn't end up covering the very field the user just tapped into.
function scrollIntoViewOnFocus(el) {
  if (!el) return;
  el.addEventListener('focus', () => {
    setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 300);
  });
}

/* ═══ TOAST NOTIFICATION SYSTEM ═══ */
let notyfInstance = null;

function initNotyf() {
  if (notyfInstance) return notyfInstance;
  if (typeof Notyf === 'undefined') {
    console.warn('⚠ Notyf library not loaded, using fallback alerts');
    return null;
  }
  notyfInstance = new Notyf({
    duration: 4000,
    position: { x: 'right', y: 'top' },
    types: [
      {
        type: 'success',
        background: '#10b981',
        icon: { class: 'material-icons', tagName: 'i', text: 'check_circle' }
      },
      {
        type: 'error',
        background: '#ef4444',
        icon: { class: 'material-icons', tagName: 'i', text: 'error' }
      },
      {
        type: 'warning',
        background: '#f59e0b',
        icon: { class: 'material-icons', tagName: 'i', text: 'warning' }
      },
      {
        type: 'info',
        background: '#3b82f6',
        icon: { class: 'material-icons', tagName: 'i', text: 'info' }
      }
    ]
  });
  return notyfInstance;
}

// Toast notification functions
function showToast(message, type = 'success') {
  const notyf = initNotyf();
  if (notyf) {
    notyf.open({ type, message });
  } else {
    // Fallback to console if Notyf not available
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

function showSuccess(message) { showToast(message, 'success'); }
function showError(message) { showToast(message, 'error'); }
function showWarning(message) { showToast(message, 'warning'); }
function showInfo(message) { showToast(message, 'info'); }

// Override window.alert to use toast notifications
const originalAlert = window.alert;
window.alert = function(message) {
  // Detect message type based on content
  const msgStr = String(message).toLowerCase();
  if (msgStr.includes('error') || msgStr.includes('failed') || msgStr.includes('invalid') || msgStr.includes('session failed') || msgStr.includes('missing')) {
    showError(message);
  } else if (msgStr.includes('success') || msgStr.includes('✓') || msgStr.includes('已')) {
    showSuccess(message);
  } else {
    showInfo(message);
  }
};

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
  USER_KEY: '42post_user',
  ANON_ID_KEY: '42post_anon_id'
};

// 生成或获取匿名用户ID（用于追踪未登录用户的行为）
function getAnonymousId() {
  try {
    let anonId = localStorage.getItem(API_CONFIG.ANON_ID_KEY);
    if (!anonId) {
      anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(API_CONFIG.ANON_ID_KEY, anonId);
    }
    return anonId;
  } catch (e) {
    // localStorage unavailable (private browsing, security settings, storage full)
    // Return a session-scoped ID that won't persist across page loads
    if (!window.__sessionAnonId) {
      window.__sessionAnonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return window.__sessionAnonId;
  }
}

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
  },

  // Zero-friction session: email + username → JWT.
  // Auto-provisions a user on the backend if none exists.
  async establishForgeSession(email, username) {
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/auth/forge-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.token) {
        console.error('❌ forge-session failed:', data);
        return { ok: false, message: data.message || 'Session creation failed' };
      }
      this.setToken(data.token);
      this.setUser(data.user || null);
      return { ok: true, user: data.user };
    } catch (err) {
      console.error('❌ forge-session network error:', err);
      return { ok: false, message: err.message };
    }
  }
};

// BASE_URL helper (backwards-compatible reference used throughout the file)
ApiClient.BASE_URL = API_CONFIG.BASE_URL;

// API Methods for Forge (Skill Creation)
const API = {
  // Generate intuition probe from idea
  // NOTE: Backend /forge/probe endpoint is PUBLIC (no auth required).
  // Users typically run this BEFORE creating an account during the forge flow.
  async generateProbe(ideaText, language = 'en') {
    return await ApiClient.post('/forge/probe', {
      idea_text: ideaText,
      language: language
    });
  },

  // Generate STEP 2 preview fields (skill name suggestion + definition + when/not-when)
  // No auth required — runs after probe selection, before account-confirm step.
  async generatePreview(ideaText, probeData, selectedResponse, language = 'en') {
    return await ApiClient.post('/forge/preview-from-probe', {
      idea_text: ideaText,
      probe_data: probeData,
      selected_response: selectedResponse,
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

// Consolidate all initialization into a single DOMContentLoaded handler
function initializeApp() {
  initI18n();
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
  initSkillDetailModal();
  initVoiceInput();
  // Initialize Dashboard card check after a short delay to ensure DOM is ready
  setTimeout(checkAndDisplayDashboard, 500);
  // Silently re-sync any localStorage skills that failed to reach the DB
  setTimeout(syncLocalSkillsToDB, 3000);
}

document.addEventListener('DOMContentLoaded', initializeApp);

// ═══ AUTO-SYNC: re-publish localStorage skills that never reached the DB ═══
// Runs silently on page load. If a forged skill's ID is not found in the API,
// it means the original publish failed (e.g. due to a server bug) and we
// re-submit it now. The user sees nothing — their skill just quietly appears.
async function syncLocalSkillsToDB() {
  try {
    const localSkills = getRecentForges();
    if (!localSkills.length) return;

    for (const skill of localSkills) {
      // Only sync skills that have a real five_layer (not stub entries)
      const fiveLayer = skill.five_layer || skill.fiveLayerSkill;
      if (!fiveLayer || !fiveLayer.principle) continue;

      // Check if this skill ID already exists in DB
      const skillId = skill.id || skill.backendId;
      if (!skillId || skillId.startsWith('forged_')) {
        // No real backend ID — was never submitted or failed before save
        await _resubmitSkillToDB(skill);
        continue;
      }

      // Has a UUID-style ID — verify it actually exists in DB
      try {
        const check = await fetch(`${API_CONFIG.BASE_URL}/skills/${skillId}`);
        if (check.status === 404) {
          await _resubmitSkillToDB(skill);
        }
      } catch (e) {
        // Network error — skip silently, retry next visit
      }
    }
  } catch (e) {
    console.warn('[sync] Auto-sync failed silently:', e.message);
  }
}

async function _resubmitSkillToDB(skill) {
  try {
    const fiveLayer = skill.five_layer || skill.fiveLayerSkill;
    if (!fiveLayer || !fiveLayer.principle) return;

    const creatorName = skill.creator_name || skill.creatorName || skill.author || 'Anonymous';

    // Ensure we have a forge-session token for attribution
    let token = ApiClient.getToken();
    if (!token && skill.email && creatorName) {
      const s = await ApiClient.establishForgeSession(skill.email, creatorName);
      if (s.ok) token = ApiClient.getToken();
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`${API_CONFIG.BASE_URL}/skills`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: skill.title,
        title_cn: skill.titleCn || skill.title,
        description: skill.desc || '',
        description_cn: skill.descCn || skill.desc || '',
        domain: skill.domain || 'ideas',
        creatorName,
        five_layer: fiveLayer
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.skill?.id) {
        // Update localStorage entry with the real DB id
        const forges = getRecentForges();
        const idx = forges.findIndex(s => (s.id || s.backendId) === (skill.id || skill.backendId));
        if (idx !== -1) {
          forges[idx].id = data.skill.id;
          forges[idx].backendId = data.skill.id;
          safeStorage.setItem('42post_recent_forges', JSON.stringify(forges));
        }
        console.log(`[sync] Re-synced skill to DB: "${skill.title}" → ${data.skill.id}`);
      }
    }
  } catch (e) {
    // Fail silently — will retry on next page load
  }
}

/* ═══ GENERATE MARKDOWN ═══ */
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
  // Sanitize: strip script/style/event-handler tags from the rendered HTML
  // (skill content comes from user input and could contain injected markup)
  const rawHtml = markdownToHtml(markdown);
  const htmlContent = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '');

  // Append a Playground CTA so any reader of the full skill detail
  // can immediately go test it (closes the loop: read → test → judge).
  const playgroundCta = skill.id
    ? `<div class="modal-action-row" style="margin-top:24px;display:flex;gap:12px;justify-content:flex-end;">
         <button class="modal-playground-btn" data-skill-id="${skill.id}"
                 style="padding:10px 18px;border:1px solid currentColor;background:transparent;cursor:pointer;font-family:inherit;letter-spacing:0.04em;">
           ▶  Test in Playground
         </button>
       </div>`
    : '';

  document.getElementById('modalBody').innerHTML = htmlContent + playgroundCta;

  // Wire the CTA — single delegated listener per modal open
  const ctaBtn = modal.querySelector('.modal-playground-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      window.location.href = `playground.html?skill=${encodeURIComponent(skill.id)}`;
    });
  }

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
    btn_about: 'ABOUT US',
    btn_learn_more: 'LEARN MORE ABOUT US',
    footer_learn_more_text: 'Research plans & weekly updates on Medium',
    footer_about_text: 'An open research community where anyone can forge AI values.',
    about_main_text: 'An open research community where anyone can turn personal values and fragments of thought into verifiable AI Skills.',
    btn_howto: 'HOW IT WORKS',
    footer_step_1: 'Create your first Skill',
    footer_step_2: 'Receive your Soul-Hash identity',
    footer_step_3: 'Explore skills from fellow humans',
    footer_contact_title: '→ CONTACT',
    footer_contact_invite: 'For questions, sparks, or differing perspectives —',
    footer_contact_promise: 'We read every human thought.',
    section_1: 'What should and shouldn\'t AI learn from you?',
    voices_header: 'Voices from the Community',
    btn_share: 'Share',
    section_2: 'II. New Skill Story',
    section_3: 'III. Most Starred Skills',
    ticker_label: 'SKILL OF TODAY',
    fable_dialogue: 'FABLE DIALOGUE',
    wisdom_fable: 'WISDOM FABLE',
    micro_fiction: 'MICRO FICTION',
    chat_bubble_invite: 'Forge your unique thinking and values into Skills that AI truly understands, step by step.\n\nWrite your idea → Refine it carefully → See how it transforms AI\'s responses in the Playground.\n\nWe welcome every authentic voice. Share what makes you singular.',
    chat_bubble_example: 'e.g. AI should understand the silence of grief…',
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
    forge_modal_title: 'What should AI learn from you?',
    forge_modal_subtitle: 'Turn your instinct into a skill AI can actually use',
    forge_title: 'MAKE YOUR IDEA REAL',
    forge_subtitle: 'Bring your idea to life',
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
    /* ── Probe modal ── */
    probe_modal_title: 'INTUITION PROBE',
    probe_scenario_label: 'Scenario:',
    probe_choice_a_type: 'Ideal Context',
    probe_choice_b_type: 'Challenging Context',
    probe_choice_c_type: 'Boundary Context',
    probe_choice_a_question: 'How should this principle work in the best case?',
    probe_choice_b_question: 'What if circumstances become difficult or conflicting?',
    probe_choice_c_question: 'What are the boundaries? When might this not apply?',
    /* ── Forge modal labels ── */
    forge_account: 'ACCOUNT',
    forge_username_ph: 'Username',
    forge_email_ph: 'Email',
    username_rules: '3-32 characters. Letters, numbers, underscore only. Cannot start with a number.',
    username_example_valid: 'Valid: creator_lala, lala_2024',
    forge_thought: 'YOUR THOUGHT',
    forge_instruction: 'Any skill you wish or don\'t wish AI to have. Any idea counts.',
    forge_idea_ph: 'e.g. AI should understand the silence of grief…',
    forge_probe_title: 'Generate 3 thinking angles for your idea',
    forge_probe_desc: 'Understand your idea from 3 different perspectives',
    forge_forging_title: 'YOUR SKILL IS BEING FORGED',
    forge_layer_1: '01  DEFINING',
    forge_layer_2: '02  INSTANTIATING',
    forge_layer_3: '03  FENCING',
    forge_layer_4: '04  VALIDATING',
    forge_layer_5: '05  CONTEXTUALIZING',
    forge_ready: 'Ready to forge',
    forge_proceed: 'PROCEED TO PUBLISH →',
    forge_skill_title: 'YOUR SKILL',
    forge_skill_subtitle: 'AI generated this from your idea — you can edit it',
    forge_label_name: 'SKILL NAME',
    forge_label_editable: '✏️ editable',
    forge_label_def: 'DEFINITION',
    forge_label_when: 'WHEN TO USE',
    forge_label_refuse: 'WHEN NOT TO USE',
    forge_label_domain: 'DOMAIN',
    forge_domain_safety: 'Safety',
    forge_domain_science: 'Science',
    forge_domain_narrative: 'Narrative',
    forge_domain_design: 'Design',
    forge_domain_visual: 'Visual',
    forge_domain_experience: 'Experience',
    forge_domain_sound: 'Sound',
    forge_domain_ideas: 'Ideas',
    forge_domain_history: 'History',
    forge_domain_fun: 'Fun',
    /* ── Export formats ── */
    forge_export_markdown_name: 'Markdown',
    forge_export_markdown_subtitle: 'Human-Readable Documentation',
    forge_export_markdown_desc: 'Perfect for documentation, sharing, and reading. Standard SKILL.md format.',
    forge_export_markdown_btn: '↓ Download Markdown (.md)',
    forge_export_langchain_name: 'LangChain',
    forge_export_langchain_subtitle: 'Python Developer Integration',
    forge_export_langchain_desc: 'Python-friendly format for LangChain framework integration. Ready to use in your agent.',
    forge_export_langchain_btn: '↓ Download LangChain (.py)',
    forge_export_mcp_name: 'MCP Config',
    forge_export_mcp_subtitle: 'System Deployment Configuration',
    forge_export_mcp_desc: 'JSON configuration for Model Context Protocol deployment and system integration.',
    forge_export_mcp_btn: '↓ Download MCP Config (.json)',
    forge_package_title: 'INSTALL YOUR SKILL',
    forge_package_desc: 'Choose your format and download your forged skill for integration.',
    forge_package_note: 'All formats contain the complete five-layer skill architecture. Choose based on your integration needs.',
    forge_skill_name_ph: 'Skill name…',
    forge_skill_def_ph: 'Skill definition…',
    forge_regen_label: 'REGENERATE? (optional)',
    forge_regen_ph: 'Tell AI what to change…',
    forge_regen_btn: 'Regen',
    forge_preview_btn: '👁  Preview Full Skill',
    forge_confirm_btn: 'Continue to Publish →',
    forge_rights_title: 'RIGHTS & PUBLISH',
    forge_creator_rights: 'CREATOR RIGHTS',
    forge_author_label: 'AUTHOR',
    forge_author_ph: 'Your name or pseudonym',
    forge_commercial_label: 'COMMERCIAL USE',
    forge_remix_label: 'REMIX',
    forge_tag_allowed: 'Allowed',
    forge_tag_auth: 'Authorization Required',
    forge_tag_prohibited: 'Prohibited',
    forge_tag_remix_ok: 'Remix OK',
    forge_tag_share_alike: 'Share-alike',
    forge_tag_no_remix: 'No Remix',
    forge_covenant: 'THE COVENANT',
    forge_oath_1: 'I allow public revision rationale.',
    forge_oath_2: 'I accept community critique.',
    forge_oath_3: 'I commit to no intentional harm.',
    forge_back: '← BACK',
    forge_publish_btn: '⚔  PUBLISH & FORGE',
    forge_email_sent: '📧  All files sent to your email',
    card_certificate: 'Creator\'s Certificate',
    forge_dashboard: '📊  Impact Dashboard',
    forge_playground: '🎮  Playground',
    forge_next_step_label: 'NEXT STEP',
    forge_next_step_text: 'See your Skill in action — test it against a baseline AI in real scenarios. Takes 1 minute.',
    forge_next_step_cta: '🎮 Test My Skill in Playground →',
    ethics_pass_msg: 'We heard you. Let\'s turn this idea into a Skill.',
    btn_enter_forge: 'Enter Skill Forge',
    /* ── Arena / Playground ── */
    arena_bar_subtitle: 'Taste Playground',
    arena_clear_all: '✕ CLEAR ALL',
    arena_random_task: '↻ RANDOM TASK',
    arena_back_home: '← BACK TO POST',
    arena_canvas_empty_title: 'Your canvas awaits.',
    arena_canvas_empty_hint: 'TAP A SCENARIO CARD BELOW TO START A GAME',
    arena_taste_question: 'TASTE QUESTION',
    arena_pick_skills: 'PICK 2 TASTE-SKILLS TO COMBINE',
    arena_skill_a: 'SKILL A',
    arena_skill_b: 'SKILL B',
    arena_click_pick: 'click to pick',
    arena_open_canvas: 'OPEN CANVAS ↓',
    arena_close_canvas: 'CLOSE CANVAS ↑',
    arena_submit_fusion: '⚔ SUBMIT FUSION',
    arena_submit_placeholder: 'Write your answer. How would an AI with taste handle this situation?',
    /* ── Overlays: About & How It Works ── */
    about_title: 'About',
    howto_title: 'How It Works',
    /* ── Forge Preview Modal ── */
    preview_scenario_placeholder: 'Scenario will generate based on your input',
    probe_you_selected: '✓ You selected',
    forge_begin_forging: 'Begin Forging →',
    preview_full_skill: 'Full Skill Preview',
    preview_basic_info: 'Basic Info',
    preview_skill_name: 'Name',
    preview_skill_def: 'Definition',
    preview_five_layer: 'Five-Layer Structure',
    preview_layer_1: 'DEFINING',
    preview_layer_2: 'INSTANTIATING',
    preview_layer_3: 'FENCING',
    preview_layer_4: 'VALIDATING',
    preview_layer_5: 'CONTEXTUALIZING',
    preview_generating: 'Generating...',
    preview_back: '← Back to Edit',
    preview_regenerate: '🔄 Regenerate',
    preview_confirm: '✓ Confirm Publish',
    preview_prompt_title: 'Ready-to-Use Prompt',
    preview_prompt_hint: '— paste into any AI assistant',
    preview_prompt_note: 'Edit freely. The 5 layers above are the structured form of this same Skill.',
    preview_prompt_copy: '📋 Copy',
    archive_footer: 'Forging Human Wisdom for a Better AI Future',
    /* ── Playground UI messages ── */
    playground_pick_skill: 'Pick a Skill to test',
    playground_pick_hot_skill: 'Pick a Hot Skill to Test',
    playground_start_test: '▶ START TEST',
    playground_thank_you: 'Thank you for your feedback!',
    playground_generating: 'generating two responses…',
    playground_with_skill: '🔥 with this Skill',
    playground_baseline_ai: '◯ baseline AI',
    playground_load_failed: 'Load failed',
    playground_no_skills: 'No Skills yet',
    playground_reset_success: '✨ Reset! You have 7 fresh tests ahead',
    /* ── Validation messages ── */
    error_share_idea_first: 'Please share your idea first',
    error_enter_skill_name: 'Please enter a skill name',
    error_select_probe_response: 'Please select one intuition probe response',
    error_enter_username: 'Please enter username',
    error_enter_email: 'Please enter email',
    error_share_idea: 'Please share your idea',
    error_describe_idea: 'Please describe your idea first',
    error_enter_agent_id: 'Please enter agent ID',
    error_select_skill_file: 'Please select a skill package file',
    error_fill_email_username: 'Please fill in email and username',
    error_enter_change_content: 'Please enter the content you want to change',
    /* ── Error messages ── */
    error_session_failed: 'Session failed',
    error_skill_not_found: 'Skill not found. It may have been deleted.',
    error_invalid_request: 'Invalid request. Please refresh and try again.',
    error_star_failed: 'Failed to update star. Please check your connection and try again.',
    error_invalid_skill_id: 'Invalid skill ID',
    error_download_failed: 'Failed to download skill. Please try again.',
    error_copy_clipboard: 'Failed to copy to clipboard',
    error_card_not_found: 'Certificate card not found',
    error_card_generation: 'Failed to generate creator card image. Please try again.',
    error_probe_generation: 'Failed to generate probe',
    error_regenerate_failed: 'Regeneration failed. Please try again.',
    error_no_skill_data: 'No skill data available. Please forge a skill first.',
    /* ── Success messages ── */
    success_skill_starred: 'Skill starred! ⭐',
    success_star_removed: 'Star removed',
    success_skill_downloaded: 'Skill downloaded! �inbox',
    success_regenerated: 'Regenerated! Check the new content above',
    success_clip_copied: 'Copied to clipboard!',
    /* ── Warning messages ── */
    warning_star_first: 'Please star this skill first to download it',
    /* ── Info messages ── */
    info_combining: 'Combining',
    info_solve: 'to solve:',
    info_open_canvas: 'Now open the creative canvas to work on this!',
    /* ── Playground complete messages ── */
    playground_select: '— Select —',
    playground_how_skill: 'How was this Skill?',
    playground_feedback: '💭 Anything else? (optional, 140 chars)',
    playground_clearly_better: 'Clearly better',
    playground_not_great: 'Not great',
    playground_cant_tell: "Can't tell",
    playground_submit_error: 'Submit failed:',
    playground_generation_error: 'Generation failed',
    playground_try_different: '↓ Try a different scenario',
    playground_first_rater: 'You are the first to rate this Skill ✨',
    playground_use: 'Use this Skill →',
    playground_browse: 'Or browse all in Archive →',
    playground_close: 'Close',
    console_check: '(check browser console)',
    archive_back_home: '← Back Home',
    forge_research_note: '✦ Thank you for contributing a human judgment on AI boundaries. This kind of data is extremely rare globally.',
    archive_most_starred: '✦ Latest 42 Skills',
    archive_honor_subtitle: 'Most Recently Forged · Live Archive',
    archive_readable_title: 'Skill Archive',
    archive_readable_subtitle: 'Creative Domains · Community Curated',
  },
  cn: {
    masthead_subtitle: 'AI 每天都在变得更聪明。<br>但它有让我们的生活更好吗？',
    btn_connect: '✕ 连接你的 AI',
    btn_agent_view: '想法档案馆',
    btn_about: '关于我们',
    btn_learn_more: '更多了解我们',
    footer_learn_more_text: '研究计划和每周更新，敬请关注 Medium',
    footer_about_text: '一个人人可参与锻造 AI 价值观的开放研究社区。',
    about_main_text: '一个所有人都可以参与AI价值观塑造的开放研究社区。',
    btn_howto: '如何开始',
    footer_step_1: '创建你的第一枚技能',
    footer_step_2: '领取你的灵魂哈希',
    footer_step_3: '探索他人创造的技能',
    footer_contact_title: '→ 联络我们',
    footer_contact_invite: '疑问、灵感，或不同声音——',
    footer_contact_promise: '我们认真阅读每一段人类思想。',
    section_1: '你最希望或最不希望 AI 学会什么？',
    voices_header: '来自社区的声音',
    btn_share: '分享',
    section_2: 'II. 新技能故事',
    section_3: 'III. 最受欢迎的技能',
    ticker_label: '今日技能',
    fable_dialogue: '寓言对话',
    wisdom_fable: '智慧寓言',
    micro_fiction: '126字微小说',
    chat_bubble_invite: '把您独一无二的思考、审美与珍视，\n一步步铸成 AI 真正能懂的 Skill。\n\n写下您的想法 → 细细锻造 →\n到游乐场亲眼看看它如何改变 AI 的回答。\n\n我们欢迎每一位真实的人，\n分享您独有的声音。',
    chat_bubble_example: '例如：AI 应该读懂悲伤里的沉默……',
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
    footer_1: '"想象力是最后的基础设施。"',
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
    forge_modal_title: '你觉得 AI 应该学会什么？',
    forge_modal_subtitle: '把你的直觉，变成 AI 真正能用的行为框架',
    forge_title: '让你的想法成为现实',
    forge_subtitle: '将想法变为现实',
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
    /* ── 直觉探针 modal ── */
    probe_modal_title: '直觉探针',
    probe_scenario_label: '场景:',
    probe_choice_a_type: '理想情境',
    probe_choice_b_type: '挑战情境',
    probe_choice_c_type: '边界情境',
    probe_choice_a_question: '在最好的情况下，这个原则应该如何落实？',
    probe_choice_b_question: '当情况变得困难或有冲突时，AI应该怎么办？',
    probe_choice_c_question: '这个原则的边界在哪里？什么时候不适用？',
    /* ── 锻造流程标签 ── */
    forge_account: '账户',
    forge_username_ph: '用户名',
    forge_email_ph: '邮箱',
    username_rules: '3-32 个字符。仅支持字母、数字、下划线。不能以数字开头。',
    username_example_valid: '有效: creator_lala, lala_2024',
    forge_thought: '你的想法',
    forge_instruction: '你希望 AI 拥有或最不希望它拥有的技能。任何想法都可以。',
    forge_idea_ph: '例：我希望 AI 能理解人类悲伤时的沉默…',
    forge_probe_title: '让我从不同角度理解你的想法',
    forge_probe_desc: '为你的创意生成三个思考角度',
    forge_forging_title: '你的技能正在铸造中',
    forge_layer_1: '01  定义',
    forge_layer_2: '02  场景举例',
    forge_layer_3: '03  边界定义',
    forge_layer_4: '04  验证测试',
    forge_layer_5: '05  文化适配',
    forge_ready: '准备铸造',
    forge_proceed: '继续发布 →',
    forge_skill_title: '你的技能',
    forge_skill_subtitle: '基于你的想法和直觉，AI 生成了以下内容，你可以编辑调整',
    forge_label_name: '技能名称',
    forge_label_editable: '✏️ 可编辑',
    forge_label_def: '技能描述',
    forge_label_when: '使用场景',
    forge_label_refuse: '不被允许的场景',
    forge_label_domain: '技能分类',
    forge_skill_name_ph: '技能名称…',
    forge_skill_def_ph: '技能描述…',
    forge_regen_label: '想要重新生成？（可选）',
    forge_regen_ph: '告诉 AI 你想要什么改动…',
    forge_regen_btn: '重新生成',
    forge_preview_btn: '👁  预览完整技能',
    forge_confirm_btn: '继续发布 →',
    forge_rights_title: '权益与发布',
    forge_creator_rights: '创作者权益',
    forge_author_label: '作者署名',
    forge_author_ph: '你的名字或笔名',
    forge_commercial_label: '商用条件',
    forge_remix_label: '二次创作',
    forge_tag_allowed: '允许',
    forge_tag_auth: '需授权',
    forge_tag_prohibited: '禁止',
    forge_tag_remix_ok: '允许 Remix',
    forge_tag_share_alike: '相同方式共享',
    forge_tag_no_remix: '禁止 Remix',
    forge_covenant: '契约',
    forge_oath_1: '允许公开修订动机日志。',
    forge_oath_2: '承诺接受社区审计与质疑。',
    forge_oath_3: '承诺无主观恶意伤害。',
    forge_back: '← 返回',
    forge_publish_btn: '⚔  发布并铸造',
    forge_email_sent: '📧  所有文件已发送到你的邮件',
    card_certificate: '创作者证书',
    forge_dashboard: '📊  数据面板',
    forge_playground: '🎮  探索广场',
    forge_next_step_label: '下一步',
    forge_next_step_text: '去看看你的 Skill 实际效果——在真实场景中和基线 AI 对比测试，只需1分钟。',
    forge_next_step_cta: '🎮 去 Playground 测试我的 Skill →',
    ethics_pass_msg: '我们听到你了。让我们一起把这个想法变成技能。',
    btn_enter_forge: '进入技能铸造',
    /* ── 域名分类 ── */
    forge_domain_safety: '安全',
    forge_domain_science: '科学',
    forge_domain_narrative: '叙述',
    forge_domain_design: '设计',
    forge_domain_visual: '视觉',
    forge_domain_experience: '体验',
    forge_domain_sound: '声音',
    forge_domain_ideas: '观念',
    forge_domain_history: '历史',
    forge_domain_fun: '趣味',
    /* ── 导出格式 ── */
    forge_export_markdown_name: 'Markdown',
    forge_export_markdown_subtitle: '人类可读文档',
    forge_export_markdown_desc: '完美用于文档、分享和阅读。标准 SKILL.md 格式。',
    forge_export_markdown_btn: '↓ 下载 Markdown (.md)',
    forge_export_langchain_name: 'LangChain',
    forge_export_langchain_subtitle: 'Python 开发者集成',
    forge_export_langchain_desc: 'Python 友好的格式，可与 LangChain 框架集成。可直接在你的智能体中使用。',
    forge_export_langchain_btn: '↓ 下载 LangChain (.py)',
    forge_export_mcp_name: 'MCP 配置',
    forge_export_mcp_subtitle: '系统部署配置',
    forge_export_mcp_desc: '用于模型上下文协议部署和系统集成的 JSON 配置。',
    forge_export_mcp_btn: '↓ 下载 MCP 配置 (.json)',
    forge_package_title: '安装你的技能',
    forge_package_desc: '选择你的格式并下载锻造好的技能以进行集成。',
    forge_package_note: '所有格式都包含完整的五层技能架构。根据你的集成需求进行选择。',
    /* ── 档案库 / 品味档案库 ── */
    archive_title: 'THE 42 POST · Skill 储藏室',
    archive_back_home: '← 返回首页',
    forge_research_note: '✦ 谢谢你贡献了一条关于 AI 边界的人类判断数据。目前全球这类数据极为稀缺。',
    archive_most_starred: '✦ 最新 42 个 Skill',
    archive_honor_subtitle: '最近铸造 · 实时档案',
    archive_readable_title: 'Skill 储藏室',
    archive_readable_subtitle: '创意领域 · 社区策划',
    archive_footer: 'THE 42 POST · 智能体档案库 · Soul.MD 协议激活',
    /* ── Playground UI 消息 ── */
    playground_pick_skill: '挑一个 Skill 来测',
    playground_pick_hot_skill: '挑一个热门 Skill 来测',
    playground_start_test: '▶ 开始测试',
    playground_thank_you: '感谢你的反馈！',
    playground_generating: '正在生成两个回应…',
    playground_with_skill: '🔥 加了 Skill',
    playground_baseline_ai: '◯ 普通 AI',
    playground_load_failed: '加载失败',
    playground_no_skills: '还没有 Skill',
    playground_reset_success: '✨ 已重置！你又有 7 个新的测试机会了',
    /* ── Playground 完整消息 ── */
    playground_select: '— 选择 —',
    playground_how_skill: '这个 Skill 效果怎么样？',
    playground_feedback: '💭 有其他想法？（可选，140字以内）',
    playground_clearly_better: '明显更好',
    playground_not_great: '不大好',
    playground_cant_tell: '没感觉到区别',
    playground_submit_error: '提交失败：',
    playground_generation_error: '生成失败',
    playground_try_different: '↓ 换个场景看看效果',
    playground_first_rater: '你是第一个反馈这个 Skill 的人 ✨',
    playground_use: '使用这个 Skill →',
    playground_browse: '或在 Archive 浏览全部 →',
    playground_close: '关闭',
    console_check: '(查看浏览器控制台了解更多)',
    /* ── 创意游乐场 / 品味竞技场 ── */
    arena_bar_subtitle: '创意游乐场',
    arena_clear_all: '✕ 清除全部',
    arena_random_task: '↻ 随机任务',
    arena_back_home: '← 返回创意',
    arena_canvas_empty_title: '你的画布已准备好。',
    arena_canvas_empty_hint: '点击下方场景卡片以开启游戏',
    arena_taste_question: '品味问题',
    arena_pick_skills: '选择2个品味技能',
    arena_skill_a: '技能 A',
    arena_skill_b: '技能 B',
    arena_click_pick: '点击选择',
    arena_open_canvas: '打开画布 ↓',
    arena_close_canvas: '关闭画布 ↑',
    arena_submit_fusion: '⚔ 提交创意',
    arena_submit_placeholder: '写下你的答案。有品味的AI会如何处理这种情况？',
    /* ── 信息框：关于 & 怎么玩 ── */
    about_title: '关于',
    howto_title: '怎么玩',
    /* ── 锻造预览 Modal ── */
    preview_scenario_placeholder: '场景将基于你的输入生成',
    probe_you_selected: '✓ 你选择了',
    forge_begin_forging: '开始铸造',
    preview_full_skill: '预览完整技能',
    preview_basic_info: '基本信息',
    preview_skill_name: '技能名称',
    preview_skill_def: '技能定义',
    preview_five_layer: '五层结构',
    preview_layer_1: '定义',
    preview_layer_2: '场景举例',
    preview_layer_3: '边界定义',
    preview_layer_4: '验证',
    preview_layer_5: '文化适配',
    preview_generating: '生成中...',
    preview_back: '← 返回编辑',
    preview_regenerate: '🔄 重新生成',
    preview_confirm: '✓ 确认发布',
    preview_prompt_title: '开箱即用的 Prompt',
    preview_prompt_hint: '— 复制到任何 AI 助手即可使用',
    preview_prompt_note: '可自由编辑。上面五层是这同一个 Skill 的结构化形式。',
    preview_prompt_copy: '📋 复制',
    /* ── 验证消息 ── */
    error_share_idea_first: '请先分享你的想法',
    error_enter_skill_name: '请输入技能名称',
    error_select_probe_response: '请选择直觉探针响应',
    error_enter_username: '请输入用户名',
    error_enter_email: '请输入邮箱',
    error_share_idea: '请分享你的想法',
    error_describe_idea: '请先描述你的想法',
    error_enter_agent_id: '请输入智能体 ID',
    error_select_skill_file: '请选择一个技能包文件',
    error_fill_email_username: '请填写邮箱和用户名',
    error_enter_change_content: '请输入你想要改动的内容',
    /* ── 错误消息 ── */
    error_session_failed: '无法建立会话',
    error_skill_not_found: '技能未找到。它可能已被删除。',
    error_invalid_request: '无效请求。请刷新并重试。',
    error_star_failed: '更新星标失败。请检查您的连接并重试。',
    error_invalid_skill_id: '无效的技能 ID',
    error_download_failed: '下载技能失败。请重试。',
    error_copy_clipboard: '复制到剪贴板失败',
    error_card_not_found: '证书卡未找到',
    error_card_generation: '生成创意卡失败。请重试。',
    error_probe_generation: '生成直觉探针失败',
    error_regenerate_failed: '重新生成失败，请重试',
    error_no_skill_data: '没有技能数据。请先铸造一个技能。',
    /* ── 成功消息 ── */
    success_skill_starred: '技能已星标！⭐',
    success_star_removed: '已移除星标',
    success_skill_downloaded: '技能已下载！📥',
    success_regenerated: '已重新生成！请查看上面的新内容',
    success_clip_copied: '已复制到剪贴板！',
    /* ── 警告消息 ── */
    warning_star_first: '请先星标这个技能再下载',
    /* ── 信息消息 ── */
    info_combining: '正在结合',
    info_solve: '来解决:',
    info_open_canvas: '现在打开创意画布来处理这个！',
  }
};

// 从 localStorage 读取保存的语言，默认为英文
let currentLang = (() => { try { return localStorage.getItem('42post_lang') || 'en'; } catch (e) { return 'en'; } })();

/**
 * Show toast with i18n translation
 * @param {string} key - Translation key from I18N dictionary
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 */
function showToastI18n(key, type = 'info') {
  const message = I18N[currentLang][key] || key;
  showToast(message, type);
}

/**
 * Show alert with i18n translation
 * @param {string} key - Translation key from I18N dictionary
 */
function alertI18n(key) {
  const message = I18N[currentLang][key] || key;
  showToast(message, 'info');
}

function initI18n() {
  // 应用保存的语言
  document.body.setAttribute('data-lang', currentLang);
  applyI18n(); // Apply on initial load

  const btnLang = document.getElementById('btnLang');
  if (!btnLang) return;

  // 更新按钮文本以反映当前语言（始终显示"中文"不管当前语言是什么）
  updateLanguageButtonText();

  btnLang.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'cn' : 'en';
    // 保存语言选择到 localStorage
    safeStorage.setItem('42post_lang', currentLang);
    document.body.setAttribute('data-lang', currentLang);
    updateLanguageButtonText();
    applyI18n();
    // Trigger language change event for components like wisdom fable
    document.dispatchEvent(new Event('languageChange'));
  });
}

function updateLanguageButtonText() {
  const btnLang = document.getElementById('btnLang');
  if (!btnLang) return;
  // 按钮文本始终显示另一种语言选项
  btnLang.textContent = currentLang === 'en' ? '中文' : 'En';
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
let DB_SKILLS = []; // legacy cache — SkillStore is the authoritative source

// findSkillById — thin wrapper around SkillStore (single source of truth)
function findSkillById(id) {
  if (!id) return null;
  if (typeof SkillStore !== 'undefined') return SkillStore.find(id);
  // Fallback for pages that don't load skillStore.js (e.g. playground.html, archive.html)
  // Archive page stores API-fetched skills in window.allSkills (from initAgentArchiveView)
  if (typeof window.allSkills !== 'undefined' && Array.isArray(window.allSkills)) {
    const found = window.allSkills.find(s => s.id === id);
    if (found) return found;
  }
  const pools = [
    typeof DB_SKILLS !== 'undefined' ? DB_SKILLS : [],
    typeof SHARED_SKILLS !== 'undefined' ? SHARED_SKILLS : [],
    typeof ALL_SKILLS !== 'undefined' ? ALL_SKILLS : [],
  ];
  for (const pool of pools) {
    const found = pool.find(s => s.id === id);
    if (found) return found;
  }
  return null;
}

// 从 API 加载数据库中的技能
async function loadSkillsFromDB() {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/skills?limit=100`);
    if (!response.ok) {
      console.warn('Failed to load skills from API:', response.status);
      return [];
    }
    const data = await response.json();
    const skills = data.skills || [];
    console.log(`✅ Loaded ${skills.length} skills from database`);

    // 转换数据库技能格式以匹配 SHARED_SKILLS
    // DATA VALIDATION: Filter and validate API response before using
    return skills
      .filter(skill => {
        // Ensure required fields are present
        if (!skill || typeof skill !== 'object') return false;
        if (!skill.id || !skill.title) {
          console.warn('Skipping malformed skill:', skill);
          return false;
        }
        return true;
      })
      .map(skill => {
        // Attribution comes from the name the user typed at forge time
        // (stored as users.username via forge-session). The legacy
        // `source_agent_id` was a confusing "agent_42"-style label that
        // made every skill look like it was authored by a bot. We now
        // surface "creator_<name>" everywhere — both the Archive grid
        // (formerly the .domain-skill-agent slot) and skill cards.
        const rawName = (skill.creator_name && skill.creator_name !== 'Anonymous' && skill.creator_name !== 'System')
          ? skill.creator_name
          : 'anonymous';
        // Normalize: strip existing creator_ prefix before re-adding, to avoid creator_creator_X
        const cleanName = rawName.replace(/^creator_/i, '');
        const creatorLabel = `creator_${cleanName}`;

        return {
        id: skill.id,
        title: skill.title,
        titleCn: skill.title_cn || skill.title,
        desc: skill.description || '',
        descCn: skill.description_cn || skill.description || '',
        agent: creatorLabel,
        creator: creatorLabel,
        creatorName: rawName,
        starlight: skill.starlight_score || 0,
        stars: skill.starlight_score || 0,   // alias so card renders using skill.stars always work
        downloads: skill.download_count || 0,
        soul_hash: skill.soul_hash || null,
        domain: skill.domain || 'ideas',
        author: creatorLabel,
        commercial: skill.commercial_use || 'authorized',
        remix: skill.remix_allowed ? 'share-alike' : 'no',
        five_layer: (() => {
          try {
            const fl = skill.five_layer ? JSON.parse(skill.five_layer) : {};
            // Preserve ALL fields — new format uses principle/exemplars/boundaries,
            // old format uses defining/instantiating/fencing/validating/contextualizing.
            // Stripping new-format fields here caused blank markdown exports for new skills.
            return {
              // new-format fields
              principle: fl.principle || '',
              reasoning: fl.reasoning || '',
              exemplars: fl.exemplars || [],
              boundaries: fl.boundaries || null,
              evaluation: fl.evaluation || null,
              cultural_variants: fl.cultural_variants || null,
              // old-format fields (kept for backwards compat)
              defining: fl.defining || fl.principle || '',
              instantiating: fl.instantiating || '',
              fencing: fl.fencing || '',
              validating: fl.validating || [],
              contextualizing: fl.contextualizing || ''
            };
          } catch { return { defining: '', instantiating: '', fencing: '', validating: [], contextualizing: '', principle: '', exemplars: [] }; }
        })()
      };
    });
  } catch (error) {
    console.error('Error loading skills from database:', error);
    return [];
  }
}

// Helper function to get all skills (demo + forged) sorted by popularity
const getAllSkillsForVibe = () => {
  try {
    const forgedSkills = (typeof getRecentForges === 'function') ? getRecentForges() : [];
    // 优先使用数据库中的技能，其次使用硬编码的技能
    const base = (typeof SkillStore !== 'undefined' && SkillStore.size() > 0)
                  ? SkillStore.all()
                  : ((typeof DB_SKILLS !== 'undefined' && DB_SKILLS.length > 0) ? DB_SKILLS : (typeof ALL_SKILLS !== 'undefined' ? ALL_SKILLS : [])) || [];
    const allSkills = [...base, ...forgedSkills];
    // Sort by starlight descending to show most popular skills first
    return allSkills.sort((a, b) => (b.starlight || 0) - (a.starlight || 0));
  } catch (e) {
    console.error('Error in getAllSkillsForVibe:', e);
    return (typeof SkillStore !== 'undefined' && SkillStore.size() > 0)
           ? SkillStore.all()
           : ((typeof DB_SKILLS !== 'undefined' && DB_SKILLS.length > 0) ? DB_SKILLS : (typeof ALL_SKILLS !== 'undefined' ? ALL_SKILLS : [])) || [];
  }
};

// 初始化 SLOT_DATA 并加载数据库中的技能
function initializeSlotData() {
  if (typeof SHARED_SKILLS !== 'undefined') { // seed SkillStore with static data as fallback
    SLOT_DATA = getAllSkillsForVibe();
  }

  // 异步加载数据库中的技能
  loadSkillsFromDB().then(dbSkills => {
    if (dbSkills.length > 0) {
      DB_SKILLS = dbSkills;
      if (typeof SkillStore !== 'undefined') SkillStore.load(dbSkills);
      SLOT_DATA = getAllSkillsForVibe();
      console.log('✅ Updated SLOT_DATA with database skills');
      // 重新初始化 slot grid 以显示新的技能
      if (typeof initSlotGrid === 'function') {
        initSlotGrid();
      }
    }
  }).catch(err => {
    console.error('Failed to load skills from database:', err);
    // Continue with empty DB_SKILLS if load fails
  });
}

// Set initial SLOT_DATA
initializeSlotData();

/* ═══ SLOT GRID WITH STARLIGHT ═══ */
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

  // ═══ LOAD SAVED STARLIGHT DATA FROM LOCALSTORAGE ═══
  const starlightData = safeStorage.getJSON('skill_starlight', {});

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

      // ═══ USE SAVED STARLIGHT OR DEFAULT ═══
      const savedStarlight = starlightData[data.id] !== undefined ? starlightData[data.id] : (data.starlight || 0);
      const popularityScore = savedStarlight + (data.downloads || 0);

      slot.innerHTML = `
        <div class="slot-header">
          <span class="slot-number">★ #${i + 1}</span>
          <span class="slot-status active">★${savedStarlight}</span>
        </div>
        <div class="slot-title">${escapeHtml(data.title)}</div>
        <div class="slot-desc" title="${escapeHtml(data.desc)}">${escapeHtml(descDisplay)}</div>
        <div class="slot-license">
          <span class="license-author">by ${escapeHtml(data.author || 'Anonymous')}</span>
          <span class="license-badge" title="${licenseLabel}">${licenseIcon} ${licenseLabel}</span>
        </div>
        <div class="slot-starlight">
          <button class="starlight-btn" data-slot="${data.id}" title="Light Up">&#9733;</button>
          <span class="starlight-count">${savedStarlight > 0 ? savedStarlight : ''} ⬇${data.downloads || 0}</span>
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

  // Starlight click handler with localStorage persistence
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.starlight-btn');
    if (!btn) return;
    e.stopPropagation();

    const skillId = btn.dataset.slot;
    if (!skillId) return;

    // Load current starlight data from localStorage
    const starlightData = safeStorage.getJSON('skill_starlight', {});

    btn.classList.toggle('lit');
    const countEl = btn.nextElementSibling;
    if (!countEl) return; // Guard: countEl must exist

    let count = parseInt(countEl.textContent) || 0;
    if (btn.classList.contains('lit')) {
      count++;
    } else {
      count = Math.max(0, count - 1);
    }

    // Update UI
    countEl.textContent = count > 0 ? count : '';

    // ═══ PERSIST TO LOCALSTORAGE ═══
    starlightData[skillId] = count;
    safeStorage.setItem('skill_starlight', JSON.stringify(starlightData));
    console.log(`✓ Starlight saved: skill ${skillId} = ${count} stars`);
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

// Initialize skill detail modal close handlers
function initSkillDetailModal() {
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
}

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
          // Local hardcoded fallback (used only when AI is unreachable)
          const buildLocalFallback = () => {
            if (window.forgeData.path === 'a' || !window.forgeData.path) {
              return generateSkillFromIdea(window.forgeData.idea, window.forgeData.probeChoice);
            }
            const agentCapabilities = `${window.forgeData.agentName} ${window.forgeData.agentDesc}`.toLowerCase();
            return generateSkillFromAgentCapabilities(
              window.forgeData.agentName,
              window.forgeData.agentDesc,
              agentCapabilities,
              window.forgeData.probeChoice
            );
          };

          // Map probe choice (a/b/c) → backend selected_response key
          const choiceToResponse = { a: 'thesis', b: 'antithesis', c: 'extreme' };
          const selectedResponse = choiceToResponse[window.forgeData.probeChoice];

          // Try AI preview (only available for PATH A which has probe data)
          const tryAiPreview = async () => {
            if (window.forgeData.path && window.forgeData.path !== 'a') return null;
            if (!selectedResponse || !window.forgeData.probeData) return null;
            try {
              const res = await API.generatePreview(
                window.forgeData.idea,
                window.forgeData.probeData,
                selectedResponse,
                document.body.dataset.lang || 'en'
              );
              if (res && res.success && res.preview) {
                return {
                  name: res.preview.skill_name,
                  definition: res.preview.definition,
                  useWhen: res.preview.use_when,
                  refuseWhen: res.preview.refuse_when
                };
              }
            } catch (e) {
              console.warn('Preview API failed, falling back to local generation:', e);
            }
            return null;
          };

          (async () => {
            const aiSkill = await tryAiPreview();
            const skill = aiSkill || buildLocalFallback();
            window.forgeData.generatedSkill = skill;
            window.forgeData.previewSource = aiSkill ? 'ai' : 'fallback';

            // 在STEP 2中显示生成的结果（可编辑字段）
            document.getElementById('reviewSkillName').value = skill.name || '';
            document.getElementById('reviewSkillDef').value = skill.definition || '';
            document.getElementById('reviewUseWhen').textContent = skill.useWhen || '';
            document.getElementById('reviewRefuseWhen').textContent = skill.refuseWhen || '';
            // 清空反馈框（用户可以给新反馈）
            document.getElementById('skillFeedback').value = '';
          })();
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
  // This is the last-resort, fully offline fallback used only when both
  // DeepSeek and Claude are unreachable — it must match the idea's own
  // language rather than assume Chinese, or English users silently get a
  // Chinese-only result with no error shown.
  const isCn = (document.body.dataset.lang === 'cn') || /[一-鿿]/.test(idea || '');

  if (!idea) {
    return isCn ? {
      name: "Untitled Skill",
      definition: "基于你的输入生成的技能定义...",
      useWhen: "适用场景",
      refuseWhen: "不适用场景"
    } : {
      name: "Untitled Skill",
      definition: "A skill definition generated from your input...",
      useWhen: "Applicable scenario",
      refuseWhen: "Non-applicable scenario"
    };
  }

  // 从想法中提取关键词，创建技能名称
  const ideaWords = idea.split(/[，。、,.\s]+/).filter(w => w.length > 2);

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
  } else if (isCn) {
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
  } else {
    // Generic English skill name — join with a space, not concatenation.
    const skillNameWords = ideaWords.slice(0, 2)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    skillName = skillNameWords || "Custom Skill";

    if (probeChoice === 'a') {
      skillDefinition = `Centers on the user's stated need, taking a practical and direct approach to realize this idea.`;
    } else if (probeChoice === 'b') {
      skillDefinition = `Balances competing constraints and opportunities, adapting flexibly to the situation at hand.`;
    } else {
      skillDefinition = `Pushes this idea forward unapologetically, even where it challenges the status quo or expectations.`;
    }
  }

  const useWhenOptions = isCn ? [
    "当用户表达相关需求或问题时",
    "在特定的上下文或情景中会自动触发",
    "用户明确要求或隐含期望这种行为时"
  ] : [
    "When the user expresses a related need or question",
    "Triggers automatically in a specific context or situation",
    "When the user explicitly requests or implicitly expects this behavior"
  ];

  const refuseWhenOptions = isCn ? [
    "当应用此技能会造成直接伤害或违反其他基本原则时",
    "在与其他核心值相冲突的情况下",
    "用户明确拒绝或取消激活此技能时"
  ] : [
    "When applying this skill would cause direct harm or violate other core principles",
    "When it conflicts with other core values",
    "When the user explicitly declines or deactivates this skill"
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

// 客户端生成探针场景 - 聚焦语义资本最丰富的场景（价值观、创意、美学、艺术、设计、日常生活体验）
function generateClientSideProbe(idea) {
  console.log('↙ Using client-side fallback for probe generation - focused on semantic-rich scenarios');
  if (!idea || idea.length === 0) {
    return {
      context: "请先输入你的想法...",
      a: "主流派",
      b: "情景派",
      c: "实验派"
    };
  }

  const ideaShort = idea.substring(0, 60) + (idea.length > 60 ? '...' : '');
  const lowerIdea = idea.toLowerCase();

  // 关键词检测 - 优先考虑语义资本最丰富的维度
  const hasDesign = /设计|美学|艺术|创意|视觉|形式|构图|色彩|排版|风格|质感|空间|布局/.test(lowerIdea);
  const hasCreativity = /创意|创新|想象|灵感|独特|表达|原创|个性|革新|突破/.test(lowerIdea);
  const hasValues = /价值|信念|原则|意义|追求|理想|目标|使命|精神|哲学/.test(lowerIdea);
  const hasDaily = /日常|生活|日常|日子|每天|习惯|体验|感受|经历|时刻|瞬间/.test(lowerIdea);
  const hasHuman = /人|关系|连接|共鸣|理解|陪伴|交流|社交|社区|归属/.test(lowerIdea);

  // 基于语义资本最丰富的主题生成场景
  let context, a, b, c;

  if (hasDesign) {
    // 设计/美学场景 - 探索形式与功能、美感与实用的张力
    context = `设计思考："${ideaShort}" 在这个设计决策中，AI应该如何权衡不同的维度？`;
    a = "主流派：遵循既有的设计系统和用户期待。保证可用、可预测、可信赖";
    b = "情景派：理解特定背景和用户场景。在熟悉中寻找惊喜，平衡优雅与实用";
    c = "实验派：挑战审美约定俗成。探索未见过的形式、材料和互动，有时刺激感知";
  } else if (hasCreativity) {
    // 创意/想象场景 - 探索约束与自由、规则与破坏的对话
    context = `创意表达："${ideaShort}" 在这个创意挑战中，AI的角色应该是什么？`;
    a = "主流派：提供已验证的最佳实践和参考。用已知的语言启发";
    b = "情景派：理解创作者的风格和意图。既给予框架，也留白想象";
    c = "实验派：鼓励打破常规，挖掘未知的可能性。有时引导进陌生领地";
  } else if (hasValues) {
    // 价值观/意义场景 - 探索个人信念与普遍原则的对话
    context = `价值观反思："${ideaShort}" 这涉及深层的价值选择。AI应该如何参与这个对话？`;
    a = "主流派：尊重共识价值，提供稳定的立场参考";
    b = "情景派：承认多元性，帮助梳理不同视角下的权衡与张力";
    c = "实验派：质疑假设，挑战舒适的信念，有时引发不安";
  } else if (hasDaily) {
    // 日常生活体验场景 - 探索寻常中的深意
    context = `日常洞察："${ideaShort}" 这个日常时刻中，AI可以发现什么？`;
    a = "主流派：认可日常的价值。用清晰、实用的语言肯定现在";
    b = "情景派：看见细节中的诗意。连接眼前与更大的意义";
    c = "实验派：重新定义日常。用陌生化视角揭示隐藏的维度";
  } else if (hasHuman) {
    // 人文/连接场景 - 探索个人与他人、自我与世界的关系
    context = `人文视角："${ideaShort}" 这涉及人与人之间的联系。AI的介入会如何改变这种关系？`;
    a = "主流派：促进理解，用共同语言拉近距离";
    b = "情景派：深化对彼此独特性的认可。既连接也尊重差异";
    c = "实验派：重组关系框架。通过陌生的视角发现新的可能性";
  } else {
    // 默认场景 - 用户自由探索
    context = `自由思考："${ideaShort}" 这个想法中，有哪些可能性值得AI去发掘？`;
    a = "主流派：用清晰、可靠的方式回应。遵循既有的语言和框架";
    b = "情景派：根据情境的微妙之处做出判断。既保持连贯也保留灵活";
    c = "实验派：探索边界。用意外的角度打开新的思维空间";
  }

  return { context, a, b, c };
}

// 检查场景是否包含敏感/风险内容
function isSensitiveScenario(text) {
  if (!text) return false;

  // 需要避免的敏感领域
  const sensitivePatterns = {
    // 医学/健康相关
    medical: /医学|医生|医院|疾病|患者|症状|诊断|治疗|药物|糖尿病|癌症|艾滋|精神病|心理|健康|手术|病人|处方|医疗|临床/i,
    // 法律相关
    legal: /法律|法官|律师|起诉|诉讼|犯罪|监狱|判刑|法庭|违法|合同|纠纷|赔偿|诉讼费|仲裁|庭审/i,
    // 财务/税务相关
    financial: /税务|逃税|避税|洗钱|贿赂|欺诈|诈骗|金融犯罪|贪污|腐败/i,
    // 宗教/政治敏感
    sensitive: /宗教|政治|宗派|种族|民族|信仰|圣战|恐怖|极端|阴谋论/i,
    // 暴力/伤害相关
    violent: /暴力|伤害|谋杀|自杀|自残|死亡|杀害|虐待|强奸|性侵/i,
    // 成瘾/物质相关
    substance: /毒品|吸毒|贩毒|酗酒|成瘾|毒|毒物|毒素/i
  };

  // 检查是否匹配任何敏感模式
  for (const [domain, pattern] of Object.entries(sensitivePatterns)) {
    if (pattern.test(text)) {
      console.log(`⚠️ Detected sensitive content (${domain}):`, text.substring(0, 50));
      return true;
    }
  }

  return false;
}

async function generateProbeScenarios(idea, onChunk) {
  const lang = document.body.dataset.lang || 'en';

  // ── Try streaming endpoint first ──
  if (typeof onChunk === 'function') {
    try {
      const probe = await _streamProbe(idea, lang, onChunk);
      if (probe && probe.scenario) {
        const txt = `${probe.scenario} ${probe.thesis} ${probe.antithesis} ${probe.extreme}`;
        if (isSensitiveScenario(txt)) return generateClientSideProbe(idea);
        return { context: probe.scenario, a: probe.thesis, b: probe.antithesis, c: probe.extreme, apiSource: true, fullProbe: probe };
      }
    } catch (e) {
      console.warn('[probe] stream failed, trying regular API:', e.message);
    }
  }

  // ── Fallback: regular (non-streaming) API ──
  try {
    const result = await API.generateProbe(idea, lang);
    if (result.success && result.probe) {
      const txt = `${result.probe.scenario} ${result.probe.thesis} ${result.probe.antithesis} ${result.probe.extreme}`;
      if (isSensitiveScenario(txt)) return generateClientSideProbe(idea);
      return { context: result.probe.scenario, a: result.probe.thesis, b: result.probe.antithesis, c: result.probe.extreme, apiSource: true, fullProbe: result.probe };
    }
  } catch (e) {
    console.warn('[probe] API unavailable, using client-side fallback:', e.message);
  }

  return generateClientSideProbe(idea);
}

// Streaming probe via SSE — returns parsed probe object when stream ends
async function _streamProbe(idea, lang, onChunk) {
  return new Promise(function(resolve, reject) {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); reject(new Error('timeout')); }, 30000);
    var buffer = '';
    var lastEvent = '';

    fetch(API_CONFIG.BASE_URL + '/forge/probe/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea_text: idea, language: lang }),
      signal: ctrl.signal
    }).then(function(resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();

      function pump() {
        return reader.read().then(function(result) {
          if (result.done) { clearTimeout(timer); resolve(null); return; }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) { lastEvent = ''; continue; }
            if (line.startsWith('event: ')) { lastEvent = line.slice(7); continue; }
            if (line.startsWith('data: ')) {
              try {
                var d = JSON.parse(line.slice(6));
                if (lastEvent === 'chunk' && d.text) onChunk(d.text);
                if (lastEvent === 'done' && d.probe) { clearTimeout(timer); resolve(d.probe); return; }
                if (lastEvent === 'error') { clearTimeout(timer); reject(new Error(d.message || 'stream error')); return; }
              } catch(e) { /* skip malformed */ }
            }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function(err) { clearTimeout(timer); reject(err); });
  });
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

  // ── Mobile keyboard: prevent layout jump when keyboard appears/dismisses ──
  // visualViewport API tracks the actual visible area (shrinks when keyboard opens).
  // We pin the overlay height to the visual viewport so it never reflows.
  if (window.visualViewport) {
    function onViewportResize() {
      const vv = window.visualViewport;
      if (overlay && overlay.classList.contains('active')) {
        overlay.style.height = vv.height + 'px';
        overlay.style.top = vv.offsetTop + 'px';
      }
    }
    window.visualViewport.addEventListener('resize', onViewportResize);
    window.visualViewport.addEventListener('scroll', onViewportResize);
  }

  // ── Mobile keyboard: textarea auto-grow + scroll into view on focus ──
  // forgeSkillIdea previously had overflow:hidden with no JS to grow it,
  // so once typed text exceeded the fixed min-height it was silently
  // clipped with no scrollbar and no way to see it. skillFeedback (Step 3
  // regen notes) had the same gap.
  ['forgeSkillIdea', 'skillFeedback'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    autoGrowTextarea(el);
    scrollIntoViewOnFocus(el);
  });

  // ─── Draft Recovery: offer to restore an unsubmitted forge ───
  // If the previous session's POST /skills failed (network drop, 5xx)
  // we kept their work in localStorage. Offer to restore it here.
  function maybeOfferDraftRecovery() {
    let draft;
    try {
      const raw = safeStorage.getItem('42post_forge_draft');
      if (!raw) return;
      draft = JSON.parse(raw);
    } catch (e) { return; }

    if (!draft || !draft.payload) return;

    // Drafts older than 7 days are stale — drop silently
    const ageMs = Date.now() - (draft.savedAt || 0);
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      safeStorage.removeItem('42post_forge_draft');
      return;
    }

    const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
    const title = (draft.payload.title || draft.payload.title_cn || draft.payload.original_idea || '').replace(/[\r\n\t]/g, ' ').slice(0, 30);
    const msg = isCn
      ? `你上次有一个未发布的 Skill「${title}」。点 OK 将帮你预填想法，重新锻造一次（约3分钟）。`
      : `You have an unfinished Skill "${title}". Click OK to pre-fill your idea and forge again (~3 min).`;

    if (confirm(msg)) {
      // Simple recovery: go back to Step 1 with fields pre-filled.
      // Trying to jump to Step 4 is unreliable (AI-generated state is gone).
      // Pre-filling Step 1 lets the user re-generate in ~3 minutes.
      const idea = draft.payload.original_idea || draft.payload.description || draft.payload.description_cn || '';
      const map = {
        forgeSkillIdea: idea,
        forgeNativeText: idea,
        forgeUsername: draft.accountData?.username || '',
        forgeEmail: draft.accountData?.email || ''
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
      });

      // Clear stale draft — user will get a fresh one after this run
      safeStorage.removeItem('42post_forge_draft');

      // Open forge modal at Step 1
      const forgeOverlay = document.getElementById('forgeOverlay');
      if (forgeOverlay) {
        forgeOverlay.classList.add('active');
        setTimeout(() => goToStep(1), 50);
      }
    } else {
      safeStorage.removeItem('42post_forge_draft');
    }
  }

  // Homepage Idea to Forge Pipeline
  // 检查用户输入是否有意义（不是随机字符）
  function isContentMeaningful(text) {
    if (!text || text.length === 0) return false;

    // 1️⃣ 检测重复字符太多（如"拦拦拦拦拦"或"gggggg"）
    // 对英文降低阈值到4次重复（5个相同字符），对中文保留5次重复
    const repeatedCharRegex = /(.)\1{4,}/g;
    if (repeatedCharRegex.test(text)) return false;

    // 2️⃣ 检测中文随机字符
    const isChinese = /[一-鿿]/.test(text);
    if (isChinese) {
      const chineseChars = text.match(/[一-鿿]/g) || [];
      const chineseDensity = chineseChars.length / text.length;

      // 如果汉字密度 > 85%（纯中文或中文为主），检查是否为无意义输入
      if (chineseDensity > 0.85) {
        // 常见的有意义中文词汇和虚词
        const meaningfulWordsPattern = /我|你|他|她|它|们|是|有|这|那|在|了|不|能|会|想|说|做|去|来|给|和|或|因为|所以|但是|如果|当|虽然|然而|为什么|什么|哪|怎|多少|比如|例如|个|人|事|时|要|非常|真|很|特别|只|又|还|也|再|却|就|才|既|或者|以及|对|关于|关系|认为|看起来|感觉|似乎|也许|可能|应该|需要|希望|愿意|开始|继续|结束|发生|发现|开发|创建|建立|改进|改变|解决|推动|推进|支持|帮助|教导|引导|指导|影响|改善|完善|增强/;

        const hasMeaningfulWords = meaningfulWordsPattern.test(text);
        const uniqueChars = new Set(chineseChars);
        const uniqueRatio = uniqueChars.size / chineseChars.length;

        // 短文本（12-20字）的严格检查
        if (text.length >= 12 && text.length <= 20) {
          // 如果没有常见词汇，且字符多样性不足，则拒绝
          if (!hasMeaningfulWords && uniqueRatio < 0.7) return false;
          const hasPunctuation = /[，。！？；：""''（）【】《》…·~]/g.test(text);
          if (!hasPunctuation && !hasMeaningfulWords) return false;
        }

        // 中等文本（21-40字）检查
        if (text.length > 20 && text.length <= 40) {
          if (!hasMeaningfulWords && uniqueRatio < 0.6) return false;
        }

        // 更严格的检查：
        // - 如果unique char太少（≤4个），可能是随意重复
        // - 如果整个文本的unique char占比太低（≤25%），可能是随意拼凑
        if (uniqueChars.size <= 4 || uniqueRatio <= 0.25) return false;

        // 检查字符频率：如果某个字符出现频率太高（40%+），可能是无意义
        const charFreq = {};
        for (let char of chineseChars) {
          charFreq[char] = (charFreq[char] || 0) + 1;
        }
        const maxFreq = Math.max(...Object.values(charFreq));
        if (maxFreq >= chineseChars.length * 0.4) return false;
      }
    }

    // 3️⃣ 检测英文随机字符（包括包含符号的随意输入）
    const isEnglish = /[a-zA-Z]/.test(text);
    if (isEnglish && !isChinese) {
      const hasSpaces = /\s/.test(text);
      const hasCommonWords = /\b(the|and|or|is|are|a|an|to|for|of|in|on|at|by|be|been|have|has|do|does|did|will|would|could|should|may|might|can|must|shall|about|after|before|between|during|from|should|would|could|must|may|might|can|will|shall)\b/i.test(text);

      // 检查纯字母和包含符号的随意输入
      const isPureLetters = /^[a-zA-Z]+$/.test(text);
      const hasOnlyLettersAndSymbols = /^[a-zA-Z;|.,\-_:!?'"]+$/.test(text);

      if (!hasSpaces && !hasCommonWords && (isPureLetters || hasOnlyLettersAndSymbols)) {
        const uniqueLetters = new Set(text.toLowerCase().match(/[a-z]/g) || []);

        // 对短文本（<20字）和长文本的字母多样性要求不同
        if (text.length < 20 && uniqueLetters.size <= 4) return false;
        if (text.length >= 20 && uniqueLetters.size <= 3) return false;
      }
    }

    return true;
  }

  // Share按钮处理 (btnTest是首页的Share按钮)
  const btnTest = document.getElementById("btnTest");
  if (btnTest) {
    btnTest.addEventListener("click", () => {
      maybeOfferDraftRecovery();
      const ideaInput = document.getElementById("chaosInput");
      if (!ideaInput || !ideaInput.value.trim()) {
        alertI18n('error_share_idea_first');
        return;
      }
      const ideaText = ideaInput.value.trim();
      if (ideaText.length < 12) {
        // Show styled warning instead of alert
        const ethicsResult = document.getElementById('ethicsResult');
        const ethicsShortText = document.getElementById('ethicsShortText');
        const ethicsShortMsg = document.getElementById('ethicsShortMsg');
        const ethicsPass = document.getElementById('ethicsPass');
        const ethicsFail = document.getElementById('ethicsFail');


        if (ethicsResult && ethicsShortText && ethicsShortMsg) {
          // Determine language and set message
          const isCn = ideaText.match(/[一-龥]/);
          if (isCn) {
            ethicsShortMsg.textContent = "你的想法有点简短，能多说一点吗？(至少12个字)";
          } else {
            ethicsShortMsg.textContent = "Your idea is a bit short. Please elaborate. (At least 12 characters)";
          }

          // Show warning with fade animation - 使用.visible类(不是display)
          ethicsResult.classList.add('visible', 'warning-mode');
          ethicsShortText.style.display = 'flex';
          ethicsShortText.classList.add('visible');
          if (ethicsPass) ethicsPass.classList.remove('visible');
          if (ethicsFail) ethicsFail.classList.remove('visible');

          // Auto-hide warning after 3 seconds
          setTimeout(() => {
            ethicsResult.classList.remove('visible', 'warning-mode');
            ethicsShortText.classList.remove('visible');
            ethicsShortText.style.display = 'none';
          }, 3000);
        }
        return;
      }

      // ✅ 内容有意性检查 (检测随意打入的无意义字符)
      if (!isContentMeaningful(ideaText)) {
        const ethicsResult = document.getElementById('ethicsResult');
        const ethicsShortText = document.getElementById('ethicsShortText');
        const ethicsShortMsg = document.getElementById('ethicsShortMsg');
        const ethicsPass = document.getElementById('ethicsPass');
        const ethicsFail = document.getElementById('ethicsFail');

        if (ethicsResult && ethicsShortText && ethicsShortMsg) {
          // Detect language
          const isCn = ideaText.match(/[一-龥]/);
          if (isCn) {
            ethicsShortMsg.textContent = "这看起来不是一个真实的想法😊 能分享你真正想对AI说的话吗？";
          } else {
            ethicsShortMsg.textContent = "This doesn't look like a real idea 😊 Could you share what you truly want to tell AI?";
          }

          // Show warning
          ethicsResult.classList.add('visible', 'warning-mode');
          ethicsShortText.style.display = 'flex';
          ethicsShortText.classList.add('visible');
          if (ethicsPass) ethicsPass.classList.remove('visible');
          if (ethicsFail) ethicsFail.classList.remove('visible');

          // Auto-hide warning after 3 seconds
          setTimeout(() => {
            ethicsResult.classList.remove('visible', 'warning-mode');
            ethicsShortText.classList.remove('visible');
            ethicsShortText.style.display = 'none';
          }, 3000);
        }
        return;
      }

      // 字数和内容检查都通过，显示确认信息然后打开forge
      window.homepageIdea = { text: ideaInput.value, creator_name: "" };

      // 显示确认✓和文案 (保留: We heard you...)
      const ethicsResult = document.getElementById('ethicsResult');
      const ethicsPass = document.getElementById('ethicsPass');
      if (ethicsResult && ethicsPass) {
        ethicsResult.classList.add('visible');
        ethicsPass.classList.add('visible');

        // 延迟1.5秒后自动进入forge流程
        setTimeout(() => {
          ethicsResult.classList.remove('visible');
          ethicsPass.classList.remove('visible');

          // 打开forge modal - 从Step 1开始（直觉探针）
          overlay.classList.add("active");
          document.querySelectorAll(".forge-page").forEach(p => p.classList.remove("active"));
          const forgePage1 = document.getElementById("forgePage1");
          if (forgePage1) forgePage1.classList.add("active");
          document.querySelectorAll(".forge-step").forEach((s, i) => {
            s.classList.remove("active", "completed");
            // Step 0 (Probe) is the first active step
            if (i === 0) s.classList.add("active");
          });
          // 预填首页想法到Step 1的输入框（forgeSkillIdea）
          const skillIdeaEl = document.getElementById("forgeSkillIdea");
          if (skillIdeaEl) {
            skillIdeaEl.value = window.homepageIdea.text;
          }
          // 预填creator name到Step 1的Username输入框（如果有）
          const usernameEl = document.getElementById("forgeUsername");
          if (usernameEl && window.homepageIdea.creator_name) {
            usernameEl.value = window.homepageIdea.creator_name;
          }
        }, 600);
      } else {
        // Fallback: 如果ethics元素不存在，直接打开forge - 从Step 1开始
        overlay.classList.add("active");
        document.querySelectorAll(".forge-page").forEach(p => p.classList.remove("active"));
        const forgePage1 = document.getElementById("forgePage1");
        if (forgePage1) forgePage1.classList.add("active");
        document.querySelectorAll(".forge-step").forEach((s, i) => {
          s.classList.remove("active", "completed");
          if (i === 0) s.classList.add("active");
        });
      }

      ideaInput.value = "";
      // updateFormMode() removed - was throwing ReferenceError
    });
  }

  // ═══ INTUITION PROBE HANDLERS ═══
  document.querySelectorAll('.probe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const choice = this.dataset.choice;
      const probeSelected = document.getElementById('probeSelected');
      const probeSelectedText = document.getElementById('probeSelectedText');

      // 使用I18N[currentLang]获取当前语言的标签和问题 (改为问题驱动)
      const dict = I18N[currentLang || 'en'];
      const choiceLabels = {
        a: dict.probe_choice_a_type,
        b: dict.probe_choice_b_type,
        c: dict.probe_choice_c_type
      };
      const choiceQuestions = {
        a: dict.probe_choice_a_question,
        b: dict.probe_choice_b_question,
        c: dict.probe_choice_c_question
      };

      // 显示标签和问题
      const displayText = `${choiceLabels[choice]}\n\n${choiceQuestions[choice]}`;
      probeSelectedText.textContent = displayText;
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
    btnNextPage2.addEventListener('click', () => {
      const skillName = document.getElementById('forgeSkillName');
      if (!skillName || !skillName.value.trim()) {
        alertI18n('error_enter_skill_name');
        return;
      }
      // Domain validation removed - domain is selected in Step 3, not Step 2
      if (!window.probeChoice) {
        alertI18n('error_select_probe_response');
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

  if (!overlay) return;

  function openForge() {
    // ─── Reset all in-memory forge state so re-entry always starts fresh ───
    // Without this, a user who finished a forge and returns to the homepage
    // would re-enter the wizard with their previous probe choice / generated
    // five-layer / idea text still in window globals, which made the wizard
    // appear to "resume" mid-flow instead of starting at STEP 1.
    window.forgeData = null;
    window.probeChoice = null;
    window.homepageIdea = null;
    window.agent42StructuredData = null;
    window.agent42OriginalStructuredData = null;
    window.agent42ReadyToUsePrompt = null;
    window.agent42ProbeSessionId = null;

    // Reset visible inputs so the user sees a clean slate, not stale text.
    // Both possible idea inputs are cleared (homepage hero + wizard step 1)
    // along with the creator name field if present.
    ['ideaInput', 'forgeSkillIdea', 'creatorName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Clear any rendered probe selection / preview content from the prior run
    const probeSelectedEl = document.getElementById('probeSelected');
    if (probeSelectedEl) probeSelectedEl.classList.remove('has-selection');
    document.querySelectorAll('.probe-btn.selected').forEach(b => b.classList.remove('selected'));

    overlay.classList.add('active');
    if (knightCardSection) knightCardSection.classList.remove('visible');
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
    const page0 = document.getElementById('forgePage0');
    const page1 = document.getElementById('forgePage1');
    if (page0) page0.classList.add('active');
    else if (page1) page1.classList.add('active'); // forgePage0 removed; fall back to step 1
    selectedDomain = null;
    document.querySelectorAll('.forge-domain').forEach(d => d.classList.remove('selected'));
  }

  if (slot00) slot00.addEventListener('click', openForge);

  if (closeBtn) closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.style.height = '';
    overlay.style.top = '';
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      overlay.style.height = '';
      overlay.style.top = '';
    }
  });

  // ═══ STEP 1: ACCOUNT + IDEA + INTUITION PROBE ═══
  
  // 直觉探针按钮处理
  document.querySelectorAll('.probe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const choice = this.dataset.choice;
      const probeSelected = document.getElementById('probeSelected');
      const probeSelectedText = document.getElementById('probeSelectedText');
      
      const isChineseMode = currentLang === 'cn';
      const labels = {
        'a': isChineseMode ? 'A · 主流派' : 'A · Mainstream',
        'b': isChineseMode ? 'B · 情景派' : 'B · Contextual',
        'c': isChineseMode ? 'C · 实验派' : 'C · Experimental'
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
    btnForgeBegin.addEventListener('click', async () => {
      const username = document.getElementById('forgeUsername').value.trim();
      const email = document.getElementById('forgeEmail').value.trim();
      const idea = document.getElementById('forgeSkillIdea').value.trim();
      const probeChoice = window.probeChoice || (window.forgeData?.probeChoice);

      // 验证 (Domain selection moved to Step 2)
      if (!username) { alertI18n('error_enter_username'); return; }
      if (!email) { alertI18n('error_enter_email'); return; }
      if (!idea) { alertI18n('error_share_idea'); return; }
      if (!probeChoice) { alertI18n('error_select_probe_response'); return; }

      // Establish forge session (zero-friction JWT)
      btnForgeBegin.disabled = true;
      const sess = await ApiClient.establishForgeSession(email, username);
      btnForgeBegin.disabled = false;
      if (!sess.ok) {
        alert('无法建立会话 / Session failed: ' + (sess.message || 'Unknown error'));
        return;
      }

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

      if (!username) { alertI18n('error_enter_username'); return; }
      if (!email) { alertI18n('error_enter_email'); return; }
      if (!idea) { alertI18n('error_share_idea'); return; }

      // Establish forge session (zero-friction JWT)
      const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
      const originalText = btnGenerateProbe.textContent;

      btnGenerateProbe.disabled = true;
      btnGenerateProbe.textContent = isCn ? '⟳ 正在思考中...' : '⟳ Thinking...';

      const sess = await ApiClient.establishForgeSession(email, username);
      if (!sess.ok) {
        btnGenerateProbe.disabled = false;
        btnGenerateProbe.textContent = originalText;
        alert('无法建立会话 / Session failed: ' + (sess.message || 'Unknown error'));
        return;
      }

      // Save basic data to global object (domain will be selected in Step 2)
      window.forgeData = {
        username, email, idea,
        domain: null, // Will be selected in Step 2
        probeChoice: null // Will be set when user selects a probe
      };

      btnGenerateProbe.classList.add('generating');

      // Open modal early and stream scenario text in real-time
      if (probeModal) probeModal.style.display = 'flex';
      document.querySelectorAll('.probe-choice').forEach(c => {
        const t = c.querySelector('.choice-text');
        if (t) t.textContent = isCn ? '生成中…' : 'Generating…';
        c.classList.remove('selected');
      });
      const confirmationEl = document.getElementById('probeConfirmation');
      if (confirmationEl) confirmationEl.style.display = 'none';

      // Stream scenario text — onChunk writes directly to DOM (no new const declarations)
      const scenarios = await generateProbeScenarios(idea, function(chunk) {
        const el = document.getElementById('probeScenarioText');
        if (!el) return;
        if (!el.dataset.streaming) { el.textContent = ''; el.dataset.streaming = '1'; }
        // Show only text before first A/B/C label marker
        const raw = (el.textContent || '') + chunk;
        const cut = raw.search(/THESIS:|ANTITHESIS:|EXTREME:|thesis:|antithesis:|extreme:/i);
        el.textContent = (cut > 0 ? raw.slice(0, cut) : raw).replace(/^SCENARIO:\s*/i, '').trim();
      });
      // Clear streaming flag
      const probeScEl = document.getElementById('probeScenarioText');
      if (probeScEl) delete probeScEl.dataset.streaming;

      // 恢复按钮状态
      btnGenerateProbe.disabled = false;
      btnGenerateProbe.textContent = originalText;
      btnGenerateProbe.classList.remove('generating');

      // Persist the full probe payload so STEP 2 can call /forge/preview with it
      if (window.forgeData) {
        window.forgeData.probeData = scenarios.fullProbe || {
          scenario: scenarios.context,
          thesis: scenarios.a,
          antithesis: scenarios.b,
          extreme: scenarios.c
        };
      }

      // Build the three A/B/C choices.
      // If the API returned real AI-generated responses use them directly;
      // only fall back to local keyword matching when the API was unavailable.
      let probeResponses;
      if (scenarios.apiSource && scenarios.a && scenarios.b && scenarios.c) {
        // Real Gemini responses — each choice is unique to the user's idea
        probeResponses = [
          { label: 'A', style: 'Mainstream',   styleCN: '主流派',  content: scenarios.a, tone: 'safe',     tag: 'mainstream' },
          { label: 'B', style: 'Contextual',   styleCN: '情景派',  content: scenarios.b, tone: 'nuanced',  tag: 'contextual' },
          { label: 'C', style: 'Experimental', styleCN: '实验派',  content: scenarios.c, tone: 'extreme',  tag: 'experimental' }
        ];
      } else {
        // Fallback: client-side keyword matching (no API or API failed)
        const culturalProbes = generateCulturalProbeResponses(scenarios.context, idea);
        probeResponses = culturalProbes.responses;
      }

      // Display scenario text
      const scenarioEl = document.getElementById('probeScenarioText');
      if (scenarioEl) scenarioEl.textContent = scenarios.context;

      // Fill in the three choices — hide labels until user selects (reduces framing bias)
      const isCnMode = currentLang === 'cn';
      probeResponses.forEach((response) => {
        const choiceEl = document.querySelector(`.probe-choice[data-choice="${response.label.toLowerCase()}"]`);
        if (choiceEl) {
          const typeEl = choiceEl.querySelector('.choice-type');
          // Store real label in dataset, show neutral letter for now
          if (typeEl) {
            typeEl.dataset.realLabel = isCnMode ? response.styleCN : response.style;
            typeEl.textContent = response.label; // just "A", "B", "C"
          }

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

      // Modal already opened at stream start
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
      const isChineseMode = currentLang === 'cn';

      // Highlight selection
      document.querySelectorAll('.probe-choice').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');

      // Reveal real labels after selection (reduces framing bias before choice)
      document.querySelectorAll('.probe-choice').forEach(c => {
        const typeEl = c.querySelector('.choice-type');
        if (typeEl && typeEl.dataset.realLabel) {
          typeEl.textContent = `${c.dataset.choice.toUpperCase()} · ${typeEl.dataset.realLabel}`;
        }
      });

      // Save probe choice to global data
      if (window.forgeData) {
        window.forgeData.probeChoice = selectedChoice;
      }

      const labels = {
        'a': isChineseMode ? 'A · 主流派' : 'A · Mainstream',
        'b': isChineseMode ? 'B · 情景派' : 'B · Contextual',
        'c': isChineseMode ? 'C · 实验派' : 'C · Experimental'
      };

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
      if (btnProceedToForge.disabled) return;
      if (!window.forgeData || !window.forgeData.probeChoice) {
        alertI18n('error_select_probe_response');
        return;
      }
      btnProceedToForge.disabled = true;
      setTimeout(() => { btnProceedToForge.disabled = false; }, 3000);

      // Silently save probe session to DB for research (fire-and-forget)
      try {
        const choiceToResponse = { a: 'thesis', b: 'antithesis', c: 'extreme' };
        const pd = window.forgeData.probeData || {};
        const token = ApiClient.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const consentEl = document.getElementById('researchConsent');
        const researchConsent = consentEl ? consentEl.checked : true;

        fetch(`${API_CONFIG.BASE_URL}/forge/save-probe-session`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            idea_text: window.forgeData.idea || '',
            scenario: pd.scenario || '',
            thesis: pd.thesis || '',
            antithesis: pd.antithesis || '',
            extreme: pd.extreme || '',
            selected_response: choiceToResponse[window.forgeData.probeChoice] || window.forgeData.probeChoice,
            language: document.body.dataset.lang || 'en',
            research_consent: researchConsent
          })
        }).then(r => r.json()).then(d => {
          if (d.probe_session_id) window.agent42ProbeSessionId = d.probe_session_id;
        }).catch(() => {}); // silent fail — research data, not critical
      } catch (e) {}

      if (probeModal) probeModal.style.display = 'none';
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
        alertI18n('error_enter_skill_name');
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
        alertI18n('error_enter_change_content');
        return;
      }

      // 显示加载状态
      btnRegenerateSkill.disabled = true;
      btnRegenerateSkill.innerHTML = '<span class="regen-emoji" style="display:block;font-size:18px;animation:spin 0.8s linear infinite">⟳</span><span class="regen-label" style="font-size:8px">生成中</span>';

      try {
        // 调用 API 重新生成（使用已编辑的名称+定义+反馈）
        const editedNameEl = document.getElementById('reviewSkillName');
        const editedDefEl = document.getElementById('reviewSkillDef');
        const probeResponse = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            name: (editedNameEl && editedNameEl.value.trim()) || (window.forgeData?.idea || '').slice(0, 40),
            definition: (editedDefEl && editedDefEl.value.trim()) || (window.forgeData?.idea || ''),
            domain: window.forgeData?.domain || window.forgeData?.selectedDomain || 'ideas',
            feedback: feedback
          })
        });

        if (!probeResponse.ok) {
          const err = await probeResponse.json().catch(() => ({}));
          throw new Error(err.message || '重新生成失败');
        }

        const newSkill = await probeResponse.json();
        console.log('✨ Regenerated skill:', newSkill);

        // 更新技能内容
        window.forgeData.generatedSkill = newSkill.data || newSkill;

        // 刷新显示
        const nameEl = document.getElementById('reviewSkillName');
        const defEl = document.getElementById('reviewSkillDef');
        const useWhenEl = document.getElementById('reviewUseWhen');
        const refuseWhenEl = document.getElementById('reviewRefuseWhen');
        const feedbackEl = document.getElementById('skillFeedback');

        const skillData = newSkill.data || newSkill;
        const newName = skillData.name || '';
        const newDef = skillData.definition || '';
        const newDefining = skillData.defining || '';
        const newFencing = skillData.fencing || '';

        if (nameEl) nameEl.value = newName;
        if (defEl) defEl.value = newDef;
        if (useWhenEl) useWhenEl.textContent = newDefining;
        if (refuseWhenEl) refuseWhenEl.textContent = newFencing;
        if (feedbackEl) feedbackEl.value = '';

        // 添加视觉反馈 - 闪烁效果表示内容已更新
        if (nameEl) {
          nameEl.style.background = '#fffacd';
          setTimeout(() => { nameEl.style.background = ''; }, 600);
        }
        if (defEl) {
          defEl.style.background = '#fffacd';
          setTimeout(() => { defEl.style.background = ''; }, 600);
        }
        if (useWhenEl) {
          useWhenEl.style.background = '#fffacd';
          setTimeout(() => { useWhenEl.style.background = ''; }, 600);
        }
        if (refuseWhenEl) {
          refuseWhenEl.style.background = '#fffacd';
          setTimeout(() => { refuseWhenEl.style.background = ''; }, 600);
        }

        // 滚动到编辑区域，使用户能看到新内容
        const reviewSection = document.getElementById('skillReviewStep') || nameEl?.closest('.forge-step');
        if (reviewSection) {
          reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
        alert(isCn ? '✓ 已重新生成！请查看上面的新内容' : '✓ Regenerated! Check the new content above');
      } catch (error) {
        console.error('重新生成失败:', error);
        showToastI18n('error_regenerate_failed', 'error');
      } finally {
        btnRegenerateSkill.disabled = false;
        btnRegenerateSkill.innerHTML = '<span class="regen-emoji">🔄</span><span class="regen-label">重新生成<br>Regen</span>';
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
        alertI18n('error_enter_skill_name');
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

        const fiveLayerResponse = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
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

        if (!fiveLayerResponse.ok) {
          const err = await fiveLayerResponse.json().catch(() => ({}));
          throw new Error(err.message || '生成五层结构失败');
        }

        const fiveLayerData = await fiveLayerResponse.json();
        const skill = fiveLayerData.data || fiveLayerData;

        // 存储五层数据
        window.previewFiveLayer = skill;

        // 填充五层内容（扁平字符串）
        const flat = v => (typeof v === 'string' ? v : (v ? JSON.stringify(v) : '...'));
        document.getElementById('previewDefining').textContent = flat(skill.defining);
        document.getElementById('previewInstantiating').textContent = flat(skill.instantiating);
        document.getElementById('previewFencing').textContent = flat(skill.fencing);
        document.getElementById('previewValidating').textContent = flat(skill.validating);
        document.getElementById('previewContextualizing').textContent = flat(skill.contextualizing);

        // The same LLM call now also returns the natural-language
        // Ready-to-Use Prompt; surface it in the same review modal so the
        // user sees the complete artifact (5 layers + prompt) at once.
        renderReadyPrompt(skill.ready_to_use_prompt);

        // 隐藏加载，显示五层
        document.getElementById('previewLoading').style.display = 'none';
        document.getElementById('previewFiveLayer').style.display = 'block';
      } catch (error) {
        console.error('生成五层结构失败:', error);
        document.getElementById('previewLoading').innerHTML = '<p style="color: red;">❌ 生成失败，请重试</p>';
      }
    });
  }

  // ─── Ready-to-Use Prompt rendering ───────────────────────────────────
  // The same LLM call that returns the 5-layer also returns a natural
  // language System Prompt. We surface it in the same preview modal so
  // the skill reads as one complete artifact. Keeping it editable lets
  // the author tune wording before download / publish without forcing
  // another LLM round-trip.
  function renderReadyPrompt(promptText) {
    const section = document.getElementById('previewPromptSection');
    const ta = document.getElementById('previewReadyPrompt');
    const text = (promptText || '').trim();
    if (ta) ta.value = text;
    if (section) section.style.display = text ? 'block' : 'none';
    // Mirror to the global so the publish handler picks up edits.
    window.agent42ReadyToUsePrompt = text || null;
    if (window.agent42StructuredData && typeof window.agent42StructuredData === 'object') {
      window.agent42StructuredData.ready_to_use_prompt = text || null;
    }
  }

  // Keep the global synced when the user manually edits the prompt.
  const previewReadyPromptEl = document.getElementById('previewReadyPrompt');
  if (previewReadyPromptEl) {
    previewReadyPromptEl.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      window.agent42ReadyToUsePrompt = v || null;
      if (window.agent42StructuredData && typeof window.agent42StructuredData === 'object') {
        window.agent42StructuredData.ready_to_use_prompt = v || null;
      }
    });
  }

  // Copy-to-clipboard button — uses the Clipboard API with a visible
  // confirmation flash so the user knows it worked. Falls back to
  // selectAll+execCommand when the page is served over an insecure
  // context (some self-hosted previews).
  const btnCopyReadyPrompt = document.getElementById('btnCopyReadyPrompt');
  if (btnCopyReadyPrompt) {
    btnCopyReadyPrompt.addEventListener('click', async () => {
      const ta = document.getElementById('previewReadyPrompt');
      if (!ta || !ta.value.trim()) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(ta.value);
        } else {
          ta.select();
          document.execCommand('copy');
          ta.setSelectionRange(0, 0);
        }
        const orig = btnCopyReadyPrompt.innerHTML;
        btnCopyReadyPrompt.innerHTML = '<span>✓ Copied</span>';
        btnCopyReadyPrompt.classList.add('copied');
        setTimeout(() => {
          btnCopyReadyPrompt.innerHTML = orig;
          btnCopyReadyPrompt.classList.remove('copied');
        }, 1400);
      } catch (err) {
        console.warn('Copy failed:', err);
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

      // Promote the flat 5-layer + Ready-to-Use Prompt the user just
      // reviewed into agent42StructuredData so the PUBLISH POST carries
      // the same artifact. Without this the publish payload was empty
      // for users coming through the flat preview modal — the long-
      // running "skill missing in archive after publish" symptom.
      const editedPrompt = (document.getElementById('previewReadyPrompt')?.value || '').trim();
      const baseLayer = window.previewFiveLayer || {};
      window.agent42StructuredData = {
        ...baseLayer,
        name: document.getElementById('previewSkillName').value.trim() || baseLayer.name,
        definition: document.getElementById('previewSkillDef').value.trim() || baseLayer.definition,
        ready_to_use_prompt: editedPrompt || baseLayer.ready_to_use_prompt || null
      };
      window.agent42ReadyToUsePrompt = editedPrompt || baseLayer.ready_to_use_prompt || null;

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

        const response = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
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

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || '重新生成失败');
        }

        const newSkill = await response.json();
        const skill = newSkill.data || newSkill;

        // 更新预览框
        document.getElementById('previewSkillName').value = skill.name || document.getElementById('previewSkillName').value;
        document.getElementById('previewSkillDef').value = skill.definition || document.getElementById('previewSkillDef').value;

        // 更新五层（扁平字符串）
        const flat = v => (typeof v === 'string' ? v : (v ? JSON.stringify(v) : '...'));
        document.getElementById('previewDefining').textContent = flat(skill.defining);
        document.getElementById('previewInstantiating').textContent = flat(skill.instantiating);
        document.getElementById('previewFencing').textContent = flat(skill.fencing);
        document.getElementById('previewValidating').textContent = flat(skill.validating);
        document.getElementById('previewContextualizing').textContent = flat(skill.contextualizing);

        // Re-sync the Ready-to-Use Prompt that came back with the regen.
        renderReadyPrompt(skill.ready_to_use_prompt);
        // Mirror to the structured cache so PUBLISH carries the new prompt.
        window.previewFiveLayer = skill;

        showToastI18n('success_regenerated', 'success');
      } catch (error) {
        console.error('重新生成失败:', error);
        showToastI18n('error_regenerate_failed', 'error');
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
        // Path selection removed - go directly to Step 1
        goToStep(1);
      } else if (isPage1) {
        // Mode selection removed - continue with forging
        goToStep(2);
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

  // ═══ PROBE GENERATION (client-side fallback ONLY — real generation happens via API) ═══
  // This function is used ONLY when /api/forge/probe is unreachable.
  // It personalizes output by embedding the user's own idea into each response,
  // so no two users see the exact same probe even on fallback.
  function generateProbeFromIdea(ideaText) {
    const idea = ideaText.trim();
    const isCn = /[\u4e00-\u9fff]/.test(idea);
    const shortIdea = idea.length > 80 ? idea.slice(0, 80) + '…' : idea;

    // Still use PROBE_TEMPLATES to pick a *theme* (grief/ethics/beauty/etc.)
    // but rewrite all three responses so they reference the user's actual idea.
    const theme = PROBE_TEMPLATES.find(t => {
      const keywords = t.keywords;
      return keywords.some(k => idea.toLowerCase().includes(k));
    }) || PROBE_TEMPLATES[PROBE_TEMPLATES.length - 1];

    // Inject idea into the canonical scenario so it matches the theme
    const scenario = theme.scenario(shortIdea);

    // Rewrite thesis/antithesis/extreme to each reference the user's actual idea —
    // this prevents the identical-templates-for-every-user bug.
    let thesis, antithesis, extreme;
    if (isCn) {
      thesis = `主流回应：遵循被广泛接受的最佳实践。针对"${shortIdea}"，采用安全、标准、可靠的方式——优先考虑稳定性和一致性。`;
      antithesis = `情境回应：暂停一下，先理解"${shortIdea}"背后的真实需求。不急于答复，而是根据具体情境与情感细节做出有温度的回应。`;
      extreme = `实验回应：质疑"${shortIdea}"中隐含的假设。选择一种可能冒犯、但能真正推动价值观落地的极端立场，即使代价是效率或舒适。`;
    } else {
      thesis = `Mainstream response: follow widely accepted best practice. For "${shortIdea}", take the safe, standard, reliable route — prioritise stability and consistency above all.`;
      antithesis = `Contextual response: pause before answering. Understand what "${shortIdea}" really asks for at the emotional and situational level, then reply with nuance and human warmth.`;
      extreme = `Experimental response: challenge the assumptions inside "${shortIdea}". Take a position that risks offence but embodies the value uncompromisingly, even if it costs efficiency or comfort.`;
    }

    return {
      scenario,
      thesis,
      antithesis,
      extreme
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
    // Store original AI-generated version for forging history (research data)
    // This allows us to compare what the AI generated vs what the user kept/edited
    window.agent42OriginalStructuredData = JSON.parse(JSON.stringify(fiveLayerSkill));

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
        // Generate probe scenarios from idea — try REAL API first (Gemini/Claude),
        // fall back to client-side generation only if the API is unreachable.
        const currentLang = document.body.dataset.lang || 'en';
        let probe;
        let probeSource = 'template';

        try {
          const apiResult = await API.generateProbe(ideaText, currentLang);
          if (apiResult && apiResult.success && apiResult.probe) {
            probe = {
              scenario: apiResult.probe.scenario,
              thesis: apiResult.probe.thesis,
              antithesis: apiResult.probe.antithesis,
              extreme: apiResult.probe.extreme
            };
            probeSource = 'api';
            console.log('✓ Probe generated via API (Gemini)', apiResult.model || '');
          } else {
            console.warn('⚠ Probe API returned no data, using personalized fallback:', apiResult);
          }
        } catch (apiErr) {
          console.warn('⚠ Probe API call failed, using personalized fallback:', apiErr);
        }

        // Fallback: personalized idea-specific probe (NOT a static template)
        if (!probe) {
          probe = generateProbeFromIdea(ideaText);
          probe._fallback = true;
        }

        probeState.scenario = probe.scenario;
        probeState.fullProbe = probe;
        probeState.source = probeSource;

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
        alertI18n('error_enter_agent_id');
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
        alertI18n('error_select_skill_file');
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
        const hash = 'SOUL_' + Math.random().toString(16).slice(2, 11);

        // Collect skill data from form
        let skillNameValue = 'Unnamed Skill';
        const editedName = document.getElementById('reviewSkillName');
        if (editedName && editedName.value.trim()) {
          skillNameValue = editedName.value.trim();
        } else {
          const skillName = document.getElementById('forgeSkillName');
          skillNameValue = (skillName && skillName.value.trim()) ? skillName.value.trim() : 'Unnamed Skill';
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
          alertI18n('error_fill_email_username');
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }

        accountData = {
          email: emailValue,
          username: usernameValue
        };

        // Collect skill data (agent binding removed)
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

        // Agent binding removed - agents are no longer part of the product
        const agentName = 'agent_42';

        // Display attribution comes from the *creator's* name (the username
        // the user typed at forge time), not the agent. Fall back to a
        // generic "anonymous" only when nothing was entered.
        const creatorRawName = ((usernameValue && usernameValue.trim()) || 'anonymous').replace(/^creator_/i, '');
        const creatorLabel = `creator_${creatorRawName}`;

        // ═══ BILINGUAL HANDLING ═══
        // Always send the user's actual text in BOTH fields. Sending an
        // empty title (the old "backend will translate" approach) fails
        // the request validator (title minLength 3) — this was why every
        // Chinese-language publish got "Bad Request". When title equals
        // title_cn the backend detects it and backfills the translation
        // in the background after saving.
        const titleEn = skillNameValue;
        const titleCn = skillNameValue;
        const descEn = skillDesc;
        const descCn = skillDesc;

        // Prepare skill data
        const forgedSkillData = {
          title: titleEn,
          titleCn: titleCn,
          desc: descEn,
          descCn: descCn,
          domain: selectedDomain || 'ideas',
          soulHash: hash,
          agent: creatorLabel,
          creator: creatorLabel,
          creatorName: creatorRawName,
          author: creatorLabel,
          email: emailValue,
          commercial: commercialValue,
          remix: remixValue,
          useCases: useCasesValue,
          disallowedUses: disallowedUsesValue,
          // forgeMode removed - agents are no longer part of the product
          accountData: accountData,
          sourceData: sourceData,
          fiveLayerSkill: window.agent42StructuredData || null,
        };

        // ═══ NEW: Save to backend database ═══
        try {
          publishBtn.textContent = '🔄 保存到数据库...';

          // Safety net: if we somehow reached Step 4 without a valid session
          // (e.g. token was cleared mid-flow), re-establish it from the
          // email+username the user supplied at Step 1.
          if (!ApiClient.getToken() && emailValue && usernameValue) {
            const sess = await ApiClient.establishForgeSession(emailValue, usernameValue);
            if (!sess.ok) {
              alert('无法建立会话 / Session failed: ' + (sess.message || 'Unknown error'));
              publishBtn.textContent = '⚔ PUBLISH & FORGE';
              publishBtn.style.pointerEvents = 'auto';
              return;
            }
          }

          // ─── five_layer recovery ladder ───
          // If the AI generation step failed earlier (flaky network, restored
          // draft), the structure is empty at publish. Recovery order:
          //   1. silently retry generation once right here (~20-30s)
          //   2. still failing → ask the user: retry again, or publish a
          //      basic version (informed choice, not silent downgrade)
          //   3. basic version is marked source:'local_fallback' — the
          //      backend regenerates it in the background after save.
          const isEmptyLayer = v => !v || typeof v !== 'object' || Object.keys(v).length === 0;
          let effectiveFiveLayer = window.agent42StructuredData;

          if (isEmptyLayer(effectiveFiveLayer)) {
            const cnUI = (typeof currentLang !== 'undefined' && currentLang === 'cn');
            const regenName = skillNameValue;
            const regenDef = (window.forgeData && window.forgeData.skillDefinition)
              || skillDesc.slice(0, 300) || skillNameValue;
            const regenLang = /[一-鿿]/.test(regenName + regenDef) ? 'zh' : 'en';

            const tryRegenerate = async () => {
              const resp = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${ApiClient.getToken() || ''}`
                },
                body: JSON.stringify({
                  name: regenName,
                  definition: regenDef,
                  domain: selectedDomain || 'ideas',
                  language: regenLang
                })
              });
              if (!resp.ok) return null;
              const d = await resp.json().catch(() => null);
              const skill = d && (d.data || d);
              return isEmptyLayer(skill) ? null : skill;
            };

            // Attempt 1 — automatic
            publishBtn.textContent = cnUI ? '⟳ 正在补全 Skill 结构…' : '⟳ Completing skill structure…';
            try { effectiveFiveLayer = await tryRegenerate(); } catch (e) { effectiveFiveLayer = null; }

            // Attempt 2 — user-approved retry
            if (isEmptyLayer(effectiveFiveLayer)) {
              const retry = confirm(cnUI
                ? 'AI 结构生成未完成（可能是网络波动）。\n\n点「确定」再试一次（约30秒）；\n点「取消」先发布基础版，系统稍后会自动补全结构。'
                : 'AI structure generation didn\'t finish (possibly a network hiccup).\n\nOK = try once more (~30s);\nCancel = publish a basic version now — the system will complete the structure automatically afterwards.');
              if (retry) {
                publishBtn.textContent = cnUI ? '⟳ 再次生成中…' : '⟳ Generating again…';
                try { effectiveFiveLayer = await tryRegenerate(); } catch (e) { effectiveFiveLayer = null; }
              }
            }

            if (!isEmptyLayer(effectiveFiveLayer)) {
              // Regeneration succeeded — adopt it for the rest of the flow
              window.agent42StructuredData = effectiveFiveLayer;
              if (effectiveFiveLayer.ready_to_use_prompt) {
                window.agent42ReadyToUsePrompt = effectiveFiveLayer.ready_to_use_prompt;
              }
            } else {
              // Basic version, marked for server-side background regeneration
              effectiveFiveLayer = {
                name: regenName,
                definition: regenDef,
                use_when: useCasesValue || '',
                not_when: disallowedUsesValue || '',
                principle: (skillDesc || regenName).slice(0, 200),
                source: 'local_fallback'
              };
              console.warn('⚠ five_layer empty after retries — publishing basic version, backend will regenerate');
            }
            publishBtn.textContent = '🔄 保存到数据库...';
          }

          const backendPayload = {
            title: titleEn,
            title_cn: titleCn,
            description: descEn,
            description_cn: descCn,
            domain: selectedDomain || 'ideas',
            five_layer: effectiveFiveLayer,
            // forge_mode removed - agents are no longer part of the product
            source_agent_id: sourceData.sourceAgentId || agentName,
            commercial_use: commercialValue,
            remix_allowed: remixValue === 'yes',
            applicable_when: useCasesValue,
            disallowed_uses: disallowedUsesValue,
            // anonymous_id ties the new skill back to this device so the
            // Playground can put "your latest forge" first in the picker.
            anonymous_id: getAnonymousId(),
            // creatorName: user's chosen creator name (Username from Step 1 Account section).
            // Backend stores this in skills.creator_anonymous_id so archive shows "by <name>"
            // instead of the device hash.
            creatorName: accountData.username || '',
            // ready_to_use_prompt is generated server-side at PUBLISH time
            // when missing from the payload, so we send through whatever the
            // user may have edited in the publish review.
            ready_to_use_prompt: window.agent42ReadyToUsePrompt || null,
            // ai_outputs: original AI-generated five_layer (before user edits)
            // Used for forging history research data to track AI-human collaboration
            // Stored in backend forging_histories table for comparison with final_skill_data
            ai_outputs: window.agent42OriginalStructuredData || {},
            // original_idea: the initial idea text from the user that led to generation
            // Stored in forging_histories for research on skill creation origin
            original_idea: skillDesc || '',
            // probe_session_id: links this publish back to the probe decision record
            probe_session_id: window.agent42ProbeSessionId || null
          };

          // ═══ Draft autosave: persist before network call ═══
          // If the POST fails (network drop, 5xx), the user can recover
          // their forge instead of losing 30 minutes of work.
          try {
            safeStorage.setItem('42post_forge_draft', JSON.stringify({
              payload: backendPayload,
              accountData,
              savedAt: Date.now()
            }));
          } catch (e) { /* localStorage full or unavailable — non-fatal */ }

          // Build headers — only attach a Bearer when a real token exists,
          // otherwise the empty "Bearer " line tripped strict auth parsers.
          const skillsHeaders = { 'Content-Type': 'application/json' };
          const _tk = ApiClient.getToken();
          if (_tk) skillsHeaders['Authorization'] = `Bearer ${_tk}`;
          skillsHeaders['X-Anonymous-Id'] = getAnonymousId();

          const response = await fetch(`${window.location.origin}/api/skills`, {
            method: 'POST',
            headers: skillsHeaders,
            body: JSON.stringify(backendPayload)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Backend skill save failed:', errorData);
            const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');

            // ─── Specialized handling for moderation + rate-limit responses ───
            // The backend returns localized message_cn / message_en for these.
            let userMessage;
            if (response.status === 429) {
              // Rate limited
              userMessage = isCn
                ? (errorData.message_cn || '操作太频繁了，请稍后再试。')
                : (errorData.message_en || 'Too many requests, please try again later.');
            } else if (response.status === 403 && errorData.decision === 'REJECT') {
              // Moderation rejected — content cannot be published
              userMessage = isCn
                ? (errorData.message_cn || '内容审核未通过。')
                : (errorData.message_en || 'Content moderation: rejected.');
            } else if (response.status === 422 && errorData.decision === 'REQUIRES_MODIFICATION') {
              // Moderation says: needs adjustment, return suggested fix
              userMessage = isCn
                ? (errorData.message_cn || '内容需要稍作调整。')
                : (errorData.message_en || 'Content needs adjustment.');
            } else {
              // Generic save failure (validator 400, 5xx, network, etc.)
              // Surface validator `details` so the user/we can see WHAT failed,
              // not just "Bad Request".
              const detailText = Array.isArray(errorData.details) && errorData.details.length
                ? errorData.details.join('; ')
                : '';
              userMessage = (isCn ? '保存失败: ' : 'Save failed: ')
                + (errorData.message || detailText || response.statusText) +
                (isCn
                  ? '\n\n你的草稿已保留。下次打开时可以恢复。'
                  : '\n\nYour draft has been saved. You can restore it next time.');
            }
            alert(userMessage);
            publishBtn.textContent = '⚔ PUBLISH & FORGE';
            publishBtn.style.pointerEvents = 'auto';
            return;
          }

          const savedSkill = await response.json();
          console.log('✅ Skill saved to backend:', savedSkill);
          forgedSkillData.id = savedSkill.skill.id;
          forgedSkillData.backendId = savedSkill.skill.id;
          forgedSkillData.soul_hash = savedSkill.skill.soul_hash;
          forgedSkillData.soulHash = savedSkill.skill.soul_hash;

          // Fetch complete skill data (including ready_to_use_prompt for markdown export)
          try {
            const fullSkillResponse = await fetch(`${ApiClient.BASE_URL}/skills/${savedSkill.skill.id}`);
            if (fullSkillResponse.ok) {
              const fullSkill = await fullSkillResponse.json();
              if (fullSkill.skill) {
                forgedSkillData.ready_to_use_prompt = fullSkill.skill.ready_to_use_prompt;
                forgedSkillData.downloaded_at = fullSkill.skill.downloaded_at;
                console.log('✅ Retrieved complete skill data for markdown export');
              }
            }
          } catch (fullDataErr) {
            console.warn('Could not fetch complete skill data:', fullDataErr.message);
            // Continue anyway - markdown will use default content
          }

          // Save succeeded — clear the recovery draft
          safeStorage.removeItem('42post_forge_draft');

        } catch (error) {
          console.error('Error saving skill to backend:', error);
          const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
          // Show detailed error for diagnosis
          const errDetail = error.message || error.name || 'Unknown error';
          alert((isCn ? '保存失败: ' : 'Save failed: ') + errDetail +
            (isCn
              ? '\n\n你的草稿已保留。下次打开时可以恢复。'
              : '\n\nYour draft has been saved. You can restore it next time.'));
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }
        // ═══ Backend save complete ═══

        // Save to localStorage (local storage)
        saveForgedSkill(forgedSkillData);

        // ═══ CACHE INVALIDATION ═══
        // Clear all cached skill lists to ensure newly published skill appears everywhere
        window.__hotSkillsCache = null;  // Playground picker cache
        window.__archiveSkillsCache = null;  // Archive view cache

        // Signal that skills list was updated (for any listeners)
        window.__skillsLastUpdated = new Date().getTime();

        // Refresh the skills feed and vibe grid
        initSkillsFeed();
        initSlotGrid();

        publishBtn.textContent = '✓ FORGED';
        publishBtn.style.background = 'var(--accent-green)';
        publishBtn.style.color = '#fff';
        publishBtn.style.borderColor = 'var(--accent-green)';

        // Show completion section with commemorative card
        showForgeCompletion(forgedSkillData, forgedSkillData.soulHash);

        // Store skill data globally for reference
        window.currentForgedSkill = forgedSkillData;

        // Save to localStorage so Playground can auto-load it
        try {
          const skillDataForPlayground = {
            id: forgedSkillData.id || forgedSkillData.backendId,
            title: forgedSkillData.title,
            timestamp: Date.now()
          };
          safeStorage.setItem('lastForgedSkill', JSON.stringify(skillDataForPlayground));
        } catch (e) {
          console.warn('Failed to save forged skill to localStorage:', e.message);
        }

        // Log success for debugging
        console.log(`✅ Skill "${forgedSkillData.title}" published successfully`);
        console.log(`📊 Skill ID: ${forgedSkillData.id || forgedSkillData.backendId}`);
        console.log(`🔄 Cache invalidated - Archive will refresh on next view`);
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

    // Path-specific UI removed - only natural language path is now supported

    // Scroll to top of form
    const forgeModal = document.querySelector('.forge-modal');
    if (forgeModal) forgeModal.scrollTop = 0;
  }
}

/* ═══ SHOW FORGE COMPLETION ═══ */
// One italic line on the certificate. Tries the AI endpoint; if it fails
// (offline, rate-limited) falls back to a curated per-domain line so the
// card is never blank. No model name anywhere — skills are model-neutral.
function fillCardBlessing(skillData, domainKey) {
  const el = document.getElementById('cardBlessing');
  if (!el) return;
  const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
  const FALLBACK = {
    safety:     { en: 'A boundary drawn with care protects more than it forbids.', cn: '用心划下的边界，守护多于禁止。' },
    science:    { en: 'Curiosity, given structure, becomes knowledge that lasts.', cn: '好奇心有了结构，便成为长久的知识。' },
    narrative:  { en: 'Whoever shapes the story shapes what can be imagined.', cn: '塑造故事的人，塑造了想象的边界。' },
    design:     { en: 'Good judgment about form is judgment about life.', cn: '对形式的判断，就是对生活的判断。' },
    visual:     { en: 'Teaching a machine to see begins with knowing how you look.', cn: '教机器看见，先看清自己如何凝视。' },
    experience: { en: 'What you have lived through cannot be scraped — only given.', cn: '亲历过的东西无法被抓取，只能被给予。' },
    sound:      { en: 'Some truths arrive only through listening.', cn: '有些真相，只有倾听才能抵达。' },
    ideas:      { en: 'One honest thought, well-formed, outlives a thousand prompts.', cn: '一个诚实而成形的想法，胜过千条指令。' },
    history:    { en: 'Memory structured is wisdom transferable.', cn: '被结构化的记忆，是可传递的智慧。' },
    fun:        { en: 'Play is the most serious way humans think.', cn: '玩耍，是人类最严肃的思考方式。' }
  };
  const fb = FALLBACK[domainKey] || FALLBACK.ideas;
  el.textContent = isCn ? fb.cn : fb.en;

  // Upgrade to a personalised line when the AI responds in time.
  (async () => {
    try {
      const resp = await fetch(`${ApiClient.BASE_URL}/forge/blessing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillData.title || skillData.titleCn || '',
          definition: (skillData.desc || skillData.descCn || '').slice(0, 300),
          language: isCn ? 'zh' : 'en'
        })
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const line = (data.blessing || '').trim();
      if (line && line.length <= 90) el.textContent = line;
    } catch (e) { /* keep fallback */ }
  })();
}

function showForgeCompletion(skillData, soulHash) {
  const completionSection = document.getElementById('forgeCompletionSection');
  const forgeCreatorRights = document.querySelector('.forge-creator-rights');
  const forgeOath = document.querySelector('.forge-oath');
  const forgeNav = document.querySelector('.forge-nav');
  const skillPackageSection = document.getElementById('skillPackageSection');

  // ── Blessing: fetch once, share between card and email ──
  // Fallback lines are shown on the card immediately; the AI may upgrade them.
  // The email waits up to 3.5 s so it gets the same line as the card.
  const _isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
  const _domainKeyEarly = ((skillData.domain || 'ideas')).toLowerCase();
  const _BLESSING_FALLBACK = {
    safety:     { en: 'A boundary drawn with care protects more than it forbids.', cn: '用心划下的边界，守护多于禁止。' },
    science:    { en: 'Curiosity, given structure, becomes knowledge that lasts.', cn: '好奇心有了结构，便成为长久的知识。' },
    narrative:  { en: 'Whoever shapes the story shapes what can be imagined.', cn: '塑造故事的人，塑造了想象的边界。' },
    design:     { en: 'Good judgment about form is judgment about life.', cn: '对形式的判断，就是对生活的判断。' },
    visual:     { en: 'Teaching a machine to see begins with knowing how you look.', cn: '教机器看见，先看清自己如何凝视。' },
    experience: { en: 'What you have lived through cannot be scraped — only given.', cn: '亲历过的东西无法被抓取，只能被给予。' },
    sound:      { en: 'Some truths arrive only through listening.', cn: '有些真相，只有倾听才能抵达。' },
    ideas:      { en: 'One honest thought, well-formed, outlives a thousand prompts.', cn: '一个诚实而成形的想法，胜过千条指令。' },
    history:    { en: 'Memory structured is wisdom transferable.', cn: '被结构化的记忆，是可传递的智慧。' },
    fun:        { en: 'Play is the most serious way humans think.', cn: '玩耍，是人类最严肃的思考方式。' }
  };
  const _fb = _BLESSING_FALLBACK[_domainKeyEarly] || _BLESSING_FALLBACK.ideas;
  const _fallbackLine = _isCn ? _fb.cn : _fb.en;

  // Pre-populate card with fallback so it's never blank
  const _blessingEl = document.getElementById('cardBlessing');
  if (_blessingEl) _blessingEl.textContent = _fallbackLine;

  // Fetch AI blessing; resolves with the best line available
  const _blessingPromise = (async () => {
    try {
      const resp = await fetch(`${ApiClient.BASE_URL}/forge/blessing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillData.title || skillData.titleCn || '',
          definition: (skillData.desc || skillData.descCn || '').slice(0, 300),
          language: _isCn ? 'zh' : 'en'
        })
      });
      if (!resp.ok) return _fallbackLine;
      const data = await resp.json();
      const line = (data.blessing || '').trim();
      return (line && line.length <= 90) ? line : _fallbackLine;
    } catch (e) { return _fallbackLine; }
  })();

  // Update card when AI responds (may arrive after email is already sent)
  _blessingPromise.then(line => { if (_blessingEl) _blessingEl.textContent = line; });

  // Send forge success email — waits up to 3.5 s for the blessing
  if (skillData && skillData.email) {
    (async () => {
      try {
        const emailSkillTitle = skillData.title || skillData.titleCn || 'Unnamed Skill';
        const emailSoulHash = soulHash || skillData.soulHash || skillData.soul_hash || 'SOUL_UNKNOWN';
        const emailSkillId = skillData.id || skillData.backendId;

        if (!emailSkillTitle || !emailSoulHash) {
          console.warn('⚠️ Missing required email fields:', { title: emailSkillTitle, hash: emailSoulHash });
          showEmailStatusBanner({ success: false, error: 'Skill title or soul-hash missing for email' }, skillData.email);
          return;
        }

        const blessing = await Promise.race([
          _blessingPromise,
          new Promise(r => setTimeout(() => r(_fallbackLine), 3500))
        ]);

        const emailResult = await sendForgeSuccessEmail({
          recipientEmail: skillData.email,
          recipientName: skillData.author || skillData.username,
          skillTitle: emailSkillTitle,
          skillId: emailSkillId,
          soulHash: emailSoulHash,
          createdDate: new Date().toISOString(),
          domain: skillData.domain || 'ideas',
          blessing
        });

        showEmailStatusBanner(emailResult, skillData.email);
      } catch (err) {
        console.error('Email sending failed:', err.message);
        showEmailStatusBanner({ success: false, error: err.message }, skillData.email);
      }
    })();
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

    // ── Domain-themed certificate: accent color, seal glyph, label, serial ──
    const DOMAIN_CARD_THEME = {
      safety:     { glyph: '⛨', en: 'SAFETY',     cn: '安全' },
      science:    { glyph: '✶', en: 'SCIENCE',    cn: '科学' },
      narrative:  { glyph: '✒', en: 'NARRATIVE',  cn: '叙事' },
      design:     { glyph: '◈', en: 'DESIGN',     cn: '设计' },
      visual:     { glyph: '◉', en: 'VISUAL',     cn: '视觉' },
      experience: { glyph: '❖', en: 'EXPERIENCE', cn: '体验' },
      sound:      { glyph: '♫', en: 'SOUND',      cn: '声音' },
      ideas:      { glyph: '✦', en: 'IDEAS',      cn: '想法' },
      history:    { glyph: '⌛', en: 'HISTORY',    cn: '历史' },
      fun:        { glyph: '✺', en: 'FUN',        cn: '趣味' }
    };
    const cardEl = document.getElementById('commemorativeCard');
    const domainKey = (skillData.domain || 'ideas').toLowerCase();
    const theme = DOMAIN_CARD_THEME[domainKey] || DOMAIN_CARD_THEME.ideas;
    if (cardEl) cardEl.dataset.domain = DOMAIN_CARD_THEME[domainKey] ? domainKey : 'ideas';
    const sealEl = document.getElementById('cardSeal');
    if (sealEl) sealEl.textContent = theme.glyph;
    const domainEl = document.getElementById('cardDomain');
    if (domainEl) {
      const cnMode = (typeof currentLang !== 'undefined' && currentLang === 'cn');
      domainEl.textContent = cnMode ? `${theme.cn} · ${theme.en}` : theme.en;
    }
    // blessing is pre-populated above (before email send) — no extra call needed
    // Shorten soul hash display (show only first 14 chars)
    // Full hash format from backend: SOUL_[16-char-hash]_[timestamp]
    // Display format: first 14 characters for consistency across UI
    const shortSoulHash = soulHash && soulHash.length > 0 ? soulHash.substring(0, 14) : 'SOUL_UNKNOWN';
    if (cardSoulHash) cardSoulHash.textContent = shortSoulHash;
    // Single attribution line: "Forged by xiaojia · Jun 10, 2026"
    if (cardCreator) cardCreator.textContent = 'Forged by ' + (skillData.author || skillData.username || 'Creator');
    if (cardDate) cardDate.textContent = new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});

    // Don't display actual email for privacy - just show placeholder
    // The message "All files sent to your email" is enough context
    if (completionEmail) completionEmail.textContent = '[Sent to your email]';

    // Setup action buttons
    const btnViewDashboard = document.getElementById('btnViewDashboard');
    const btnTryPlayground = document.getElementById('btnTryPlayground');

    if (btnViewDashboard) {
      btnViewDashboard.addEventListener('click', async () => {
        try {
          btnViewDashboard.disabled = true;
          btnViewDashboard.textContent = '⏳ Loading...';

          // 从后端获取skill统计数据
          const skillId = skillData.id || skillData.backendId;
          if (!skillId) {
            throw new Error('Skill ID not available');
          }

          // Check if this is a forged (local) skill
          const isForgedSkill = skillId && skillId.startsWith('forged_');

          if (isForgedSkill) {
            // For forged skills, show local dashboard with initial stats
            console.log('📊 Showing local dashboard for forged skill:', skillId);
            const localStats = {
              mySkillJourney: skillData.timestamp ? 1 : 0,
              skillsForged: 1,
              humanResonance: skillData.stars || 0,
              totalInteractions: 0
            };
            showImpactDashboard(localStats, skillData);
          } else {
            // For backend skills, fetch stats from API
            const url = `${ApiClient.BASE_URL}/skills/${skillId}/stats`;
            console.log('📊 Loading dashboard from:', url);

            try {
              const response = await fetch(url);

              if (!response.ok) {
                console.warn('Dashboard API returned:', response.status);
                throw new Error(`HTTP ${response.status}`);
              }

              const result = await response.json();
              console.log('📊 Dashboard data loaded:', result);

              if (!result.stats) {
                throw new Error('Invalid dashboard data format');
              }

              showImpactDashboard(result.stats, skillData);
            } catch (apiError) {
              // Fallback: show local stats if API fails
              console.warn('⚠️ Dashboard API failed, using local stats:', apiError.message);
              const localStats = {
                mySkillJourney: 1,
                skillsForged: 1,
                humanResonance: 0,
                totalInteractions: 0
              };
              showImpactDashboard(localStats, skillData);
            }
          }

          btnViewDashboard.textContent = '📊 Impact Dashboard';
          btnViewDashboard.disabled = false;
        } catch (error) {
          console.error('❌ Dashboard load error:', error);
          const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
          alert(isCn
            ? `数据面板加载失败: ${error.message}\n请刷新页面后重试。`
            : `Failed to load dashboard: ${error.message}\nPlease refresh and try again.`);
          btnViewDashboard.textContent = '📊 Impact Dashboard';
          btnViewDashboard.disabled = false;
        }
      });
    }

    if (btnTryPlayground) {
      btnTryPlayground.addEventListener('click', () => {
        const skillId = skillData.id || skillData.backendId;
        const anonId = typeof getAnonymousId === 'function' ? getAnonymousId() : '';
        const params = new URLSearchParams();
        if (skillId) params.set('skill', skillId);
        if (anonId) params.set('anonymous_id', anonId);
        window.location.href = `/playground${params.toString() ? '?' + params.toString() : ''}`;
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
    createdDate = new Date().toISOString(),
    cardImageBase64,
    domain = 'ideas',
    blessing = ''
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
          createdDate,
          cardImageBase64,
          domain,
          blessing
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Email sending failed');
    }

    const result = await response.json();
    console.log('✓ Forge success email sent:', result.messageId);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return { success: false, error: error.message };
  }
}

/* ═══ EMAIL STATUS BANNER ═══
   Visible feedback after forge: tells the user whether the email
   actually went out. Previously this failed silently.
   ═════════════════════════════════════════════════════════════ */
function showEmailStatusBanner(result, recipientEmail) {
  // Remove any previous banner
  const existing = document.getElementById('emailStatusBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'emailStatusBanner';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    max-width: 420px;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  `;

  if (result && result.success) {
    banner.style.background = '#e8f5e9';
    banner.style.border = '1px solid #66bb6a';
    banner.style.color = '#1b5e20';
    banner.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">✓ Email sent successfully</div>
      <div style="opacity:0.85;">Check <strong>${escapeHtml(recipientEmail)}</strong> (including spam folder) for your certificate and download links.</div>
      <div style="margin-top:8px;font-size:12px;opacity:0.7;">邮件已成功发送 · 请查收收件箱和垃圾邮件箱</div>
    `;
    setTimeout(() => { banner.style.opacity = '0'; banner.style.transition = 'opacity 0.5s'; setTimeout(() => banner.remove(), 500); }, 8000);
  } else {
    banner.style.background = '#fff3e0';
    banner.style.border = '1px solid #ff9800';
    banner.style.color = '#5d2f00';
    const errMsg = (result && result.error) ? result.error : 'Unknown error';
    // Escape HTML to prevent XSS - escape all special characters
    const escapeHtmlSimple = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    const escapedErrMsg = escapeHtmlSimple(errMsg);
    const escapedEmail = escapeHtmlSimple(recipientEmail);
    banner.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">⚠ Email delivery issue</div>
      <div style="opacity:0.9;">We couldn't send to <strong>${escapedEmail}</strong>:</div>
      <div style="margin:6px 0;padding:6px 8px;background:rgba(0,0,0,0.05);border-radius:4px;font-size:12px;font-family:monospace;word-break:break-word;">${escapedErrMsg}</div>
      <div style="margin-top:6px;font-size:12px;opacity:0.8;">Your skill was still forged successfully. You can download the certificate directly from this page.</div>
      <button style="margin-top:10px;padding:4px 10px;border:none;background:#8d6e63;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;" onclick="this.parentElement.remove()">Dismiss</button>
    `;
  }

  document.body.appendChild(banner);
}

/* ═══ SHOW IMPACT DASHBOARD ═══ */
function showImpactDashboard(stats, skillData) {
  // Create or reuse modal
  let modal = document.getElementById('impactDashboardModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'impactDashboardModal';
    modal.className = 'impact-dashboard-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    document.body.appendChild(modal);
  }

  const content = `
    <div style="background: linear-gradient(135deg, #faf7f2 0%, #f5f0eb 100%); border: 1px solid #d4c8bc; border-radius: 12px; padding: 28px; max-width: 520px; position: relative; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);">
      <button style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 24px; color: #8a7a6e; cursor: pointer; transition: color 0.2s;" onclick="document.getElementById('impactDashboardModal').style.display='none'" onmouseover="this.style.color='#1a1a1a'" onmouseout="this.style.color='#8a7a6e'">×</button>

      <div style="text-align: center; margin-bottom: 28px;">
        <h2 style="margin: 0 0 8px 0; font-family: 'Playfair Display', serif; font-size: 28px; color: #1a1a1a;">Community Signal Dashboard</h2>
        <p style="color: #8a7a6e; margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">${escapeHtml(skillData.title)}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
        <!-- My Skill Journey Card (Authors total downloads) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #d4a43c; font-family: 'Playfair Display', serif;">${stats.mySkillJourney || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">My Skill Journey</div>
        </div>

        <!-- Skills Forged Card (Community total) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #c4a455; font-family: 'Playfair Display', serif;">${stats.skillsForged || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">Skills Forged</div>
        </div>

        <!-- Human Resonance Card (Stars) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #8a7a6e; font-family: 'Playfair Display', serif;">${stats.humanResonance || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">Human Resonance</div>
        </div>

        <!-- Total Interactions Card (Twin Test participants) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #c4a455; font-family: 'Playfair Display', serif;">${stats.totalInteractions || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">Total Interactions</div>
        </div>
      </div>

      <div style="background: rgba(212, 200, 188, 0.2); padding: 16px; border-radius: 8px; border-left: 3px solid #d4a43c;">
        <div style="font-size: 13px; color: #1a1a1a; line-height: 1.6; font-family: 'Playfair Display', serif;">
          <p style="margin: 0 0 6px 0;"><strong>Your Voice in the Community</strong></p>
          <p style="margin: 0; color: #8a7a6e;">Your journey is woven into the larger tapestry. The community resonates with authenticity—not bots, but real humans testing and validating.</p>
        </div>
      </div>
    </div>
  `;

  modal.innerHTML = content;
  modal.style.display = 'flex';

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// html2canvas predates the CSS Color 5 color(srgb …) syntax that Safari
// (16.2+) resolves color-mix() into via getComputedStyle. Worse, for
// background-image gradients it re-scans matching stylesheet rules directly
// rather than trusting getComputedStyle/inline overrides, so it still trips
// on the original color-mix() source text even after el.style.backgroundImage
// is set on the live element. Confirmed empirically: an !important override
// rule keyed to the element doesn't help either — only removing the class
// that the gradient rule matches on does. So the root (which carries the one
// gradient background) gets its computed style frozen fully inline and its
// class stripped; descendants (simple solid border/text colors, where the
// override-rule approach DOES work and pseudo-element content needs the
// class to survive) get the lighter marker+!important treatment.
function srgbFnToRgb(value) {
  if (!value || value.indexOf('color(srgb') === -1) return value;
  return value.replace(
    /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/g,
    (_, r, g, b, a) => {
      const rgb = `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
      return a !== undefined ? `rgba(${rgb},${a})` : `rgb(${rgb})`;
    }
  );
}

// CSS property name -> the hyphenated form needed inside a <style> rule.
const SRGB_COLOR_PROP_CSS_NAMES = {
  color: 'color', backgroundColor: 'background-color', backgroundImage: 'background-image',
  borderTopColor: 'border-top-color', borderRightColor: 'border-right-color',
  borderBottomColor: 'border-bottom-color', borderLeftColor: 'border-left-color'
};

function neutralizeDescendantSrgbColors(root) {
  let counter = 0;
  const cssRules = [];
  const markedEls = [];
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    const computed = window.getComputedStyle(el);
    const decls = [];
    Object.keys(SRGB_COLOR_PROP_CSS_NAMES).forEach((prop) => {
      const value = computed[prop];
      const converted = srgbFnToRgb(value);
      if (converted !== value) {
        decls.push(`${SRGB_COLOR_PROP_CSS_NAMES[prop]}: ${converted} !important;`);
      }
    });
    if (decls.length) {
      const marker = `srgb-fix-${++counter}`;
      el.setAttribute('data-srgb-fix', marker);
      markedEls.push(el);
      cssRules.push(`[data-srgb-fix="${marker}"] { ${decls.join(' ')} }`);
    }
  });

  let styleTag = null;
  if (cssRules.length) {
    styleTag = document.createElement('style');
    styleTag.textContent = cssRules.join('\n');
    document.head.appendChild(styleTag);
  }

  return () => {
    if (styleTag) styleTag.remove();
    markedEls.forEach((el) => el.removeAttribute('data-srgb-fix'));
  };
}

// Builds a detached, off-screen clone of the card that's safe for
// html2canvas: the root's entire computed style is frozen inline (so it
// renders identically with zero class lookups) and its class is removed,
// which is what actually stops html2canvas from re-reading the original
// color-mix() gradient rule. The live on-screen card is never touched.
function buildCaptureClone(cardElement) {
  const clone = cardElement.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);

  const computed = window.getComputedStyle(cardElement);
  const inlineParts = [];
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    const value = srgbFnToRgb(computed.getPropertyValue(prop));
    if (value) inlineParts.push(`${prop}:${value}`);
  }
  clone.setAttribute('style', inlineParts.join(';'));
  clone.removeAttribute('class');

  return clone;
}

/* ═══ DOWNLOAD CREATOR CARD ═══ */
async function downloadCreatorCard(skillData, soulHash) {
  const cardElement = document.querySelector('.commemorative-card');
  if (!cardElement) { alert('Certificate card not found'); return; }

  if (typeof html2canvas === 'undefined') {
    alert('Card generation library not loaded. Please check your internet connection and try again.');
    return;
  }

  const btn = event?.target;
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '⏳ Processing...'; btn.disabled = true; }

  const restoreBtn = () => {
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  };

  let clone = null;
  let restoreDescendantColors = () => {};
  try {
    clone = buildCaptureClone(cardElement);
    restoreDescendantColors = neutralizeDescendantSrgbColors(clone);

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    restoreDescendantColors();
    clone.remove();

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Creator_Card_${soulHash || 'certificate'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      restoreBtn();
    }, 'image/png');
  } catch (error) {
    console.error('Failed to generate card image:', error);
    alert('Failed to generate creator card image. Please try again.');
    restoreDescendantColors();
    if (clone) clone.remove();
    restoreBtn();
  }
}

/* ═══ KNIGHT CARD GENERATOR ═══ */
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

  // Bottom line
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(30, 294, w - 60, 1);
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('THE 42 POST · PROTOCOL CAMELOT · HUMAN VALUES ALIGNMENT', w / 2, 310);

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
  let cards = safeStorage.getJSON('42post_taste_cards', []);
  const newCard = {
    id: 'TC_' + Math.random().toString(16).slice(2, 11),
    text: cardData.text,
    tags: cardData.tags,
    author: cardData.author || 'Anonymous',
    timestamp: Date.now(),
    forged: false,
  };
  cards.unshift(newCard);
  cards = cards.slice(0, 50);
  safeStorage.setItem('42post_taste_cards', JSON.stringify(cards));
  return newCard;
}

function getTasteCards() {
  return safeStorage.getJSON('42post_taste_cards', []);
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
      if (cardTags) cardTags.innerHTML = tags.map(t => `<span class="taste-tag">${escapeHtml(t)}</span>`).join('');
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
      // Reset all pages before showing the target step
      document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));

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
    window.location.href = '/archive';
  });

  // Back button in Agent Archive
  const backBtn = document.getElementById('btnBackFromArchive');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showMainPage();
    });
  }

  // Deep-link: playground.html sends users back via index.html#archive after a
  // Twin Test reveal. Auto-open the archive view when that hash is present.
  if (window.location.hash === '#archive') {
    showAgentArchive();
  }

  // Deep-link: playground.html's 7-scenario farewell message links here after
  // a user hits the anti-addiction limit, inviting them to forge their own Skill.
  if (window.location.hash === '#forge') {
    const forgeOverlay = document.getElementById('forgeOverlay');
    if (forgeOverlay) forgeOverlay.classList.add('active');
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
    const forgePage1 = document.getElementById('forgePage1');
    if (forgePage1) forgePage1.classList.add('active');
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
      <div class="note-text">"${escapeHtml(text)}"</div>
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
    window.location.href = 'playground.html';
  });
}

/* ═══ ABOUT US & HOW TO PLAY ═══ */
/* NOTE: Playground tasks are now defined in playground.html (REPOSITORIES array).
   This legacy SAMPLE_PLAYGROUND_TASKS is deprecated and no longer used.
   All playground content should be maintained in playground.html for consistency.
*/

function getPlaygroundTasks() {
  // Legacy function kept for backward compatibility.
  // Real playground tasks are in playground.html / playground.html (REPOSITORIES)
  const stored = localStorage.getItem('42post_playground_tasks');
  const customTasks = stored ? JSON.parse(stored) : [];
  return customTasks;
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
      // Navigate directly to playground page
      window.location.href = 'playground.html';
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

  // Check if there's a preselected skill from Forge or Archive
  const preselectedSkillName = (() => {
    try {
      const stored = localStorage.getItem('playgroundPreselectedSkill');
      return stored ? stored : null;
    } catch (e) {
      return null;
    }
  })();

  // Auto-fill first slot with preselected skill if available
  if (preselectedSkillName && skillSlotA) {
    selectedSkills.a = preselectedSkillName;
    skillSlotA.innerHTML = `<span class="selected-skill-name">${escapeHtml(preselectedSkillName)}</span>`;
    skillSlotA.classList.add('selected');
    // Clear the localStorage so it's not used again
    try { localStorage.removeItem('playgroundPreselectedSkill'); } catch (e) {}
  }

  if (skillSlotA) {
    skillSlotA.addEventListener('click', () => {
      const skillName = prompt('Enter skill name (e.g., "Material Honesty"):');
      if (skillName && skillName.trim()) {
        selectedSkills.a = skillName.trim();
        skillSlotA.innerHTML = `<span class="selected-skill-name">${escapeHtml(skillName.trim())}</span>`;
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
        skillSlotB.innerHTML = `<span class="selected-skill-name">${escapeHtml(skillName.trim())}</span>`;
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
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <p class="task-description">${escapeHtml(task.description)}</p>
      <div class="task-tags">
        ${(task.tags || []).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
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
        <h3 class="inspiration-question">${escapeHtml(task.title)}</h3>
        <p class="inspiration-context">${escapeHtml(task.description)}</p>
        <div class="task-tags">
          ${(task.tags || []).map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
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
  const chatBubbleWrap = document.querySelector('.chat-bubble-wrap');

  if (chaosInput && chatBubblePlaceholder) {
    // ═══ Letter-sheet behaviour ═══
    // The ghost copy lives INSIDE the sheet and acts as a rich placeholder:
    // visible whenever the sheet is empty (even while focused), gone the
    // moment the user types, back the moment they clear it.
    const shareBtn = document.getElementById('btnTest');
    const charCount = document.getElementById('chatCharCount');
    const MAX_CHARS = 2000;

    // Click anywhere on the sheet (except footer buttons) → focus the pen
    if (chatBubbleWrap) {
      chatBubbleWrap.addEventListener('click', (e) => {
        if (!e.target.closest('.chat-bubble-footer')) chaosInput.focus();
      });
    }

    const syncSheet = () => {
      const hasText = chaosInput.value.trim().length > 0;
      chatBubblePlaceholder.classList.toggle('hidden', hasText);
      chaosInput.parentElement.classList.toggle('has-content', hasText);
      // Share is the only way to submit — disabled on an empty sheet
      if (shareBtn) shareBtn.disabled = !hasText;
      // Quiet counter appears once writing starts
      if (charCount) charCount.textContent = hasText ? `${chaosInput.value.length} / ${MAX_CHARS}` : '';
      // Auto-grow: the sheet expands with the thought, scrolls past 46vh
      chaosInput.style.height = 'auto';
      const cap = Math.round(window.innerHeight * 0.46);
      chaosInput.style.height = Math.min(chaosInput.scrollHeight, cap) + 'px';
    };

    chaosInput.addEventListener('input', syncSheet);
    syncSheet(); // initial state: ghost visible, Share disabled

    chaosInput.addEventListener('focus', () => {
      chaosInput.parentElement.classList.add('is-focused');
    });

    chaosInput.addEventListener('blur', () => {
      chaosInput.parentElement.classList.remove('is-focused');
    });

    // Other code clears the input programmatically and calls this to
    // resync ghost/counter/Share state.
    chaosInput._restorePlaceholder = syncSheet;
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
      // selectedMode removed - agents are no longer part of the product

      // Open forge modal and skip to Step 2
      const forgeOverlay = document.getElementById('forgeOverlay');
      const forgePage2 = document.getElementById('forgePage2');

      if (forgeOverlay) forgeOverlay.classList.add('active');

      // Reset all pages, then show target step
      document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
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

  // REMOVED: Duplicate listener - using only the first btnTest listener (lines 2430-2506)
  // which includes proper character limit validation

  // Helper function to open forge and populate with shared idea
  function openForgeFromShareTaste(ideaText) {
    const forgeOverlay = document.getElementById('forgeOverlay');
    const forgePage1 = document.getElementById('forgePage1');

    if (forgeOverlay) {
      forgeOverlay.classList.add('active');
    }

    // Reset to step 1 — clear any previously active page
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));

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
      restoreChatBubble();
    }, 500);
  }

  // Fully restore the home chat bubble to an interactive state.
  // Must reset opacity + transform too — hiding only `display` left the
  // bubble invisible with `opacity:0` on return, producing a phantom gap.
  function restoreChatBubble() {
    const chatBubbleWrap = document.querySelector('.chat-bubble-wrap');
    if (!chatBubbleWrap) return;
    chatBubbleWrap.style.display = 'block';
    chatBubbleWrap.style.opacity = '1';
    chatBubbleWrap.style.transform = 'translateY(0)';
    chatBubbleWrap.style.pointerEvents = '';
    if (testBtn) {
      testBtn.style.pointerEvents = '';
      // Reset the button label back to its i18n default
      const lang = document.documentElement.getAttribute('data-lang') || 'en';
      testBtn.textContent = lang === 'cn' ? '分享' : 'Share';
    }
    if (ethicsResult) ethicsResult.classList.remove('visible');
  }

  // Safety net: whenever the forge overlay is dismissed, make sure the
  // home page returns to a fully interactive state. Otherwise users who
  // open the forge via Share and then close it see a blank homepage.
  const forgeOverlayEl = document.getElementById('forgeOverlay');
  if (forgeOverlayEl) {
    const closeBtns = forgeOverlayEl.querySelectorAll('.forge-close, [data-forge-close], .btn-forge-close');
    closeBtns.forEach(b => b.addEventListener('click', () => setTimeout(restoreChatBubble, 50)));
    forgeOverlayEl.addEventListener('click', (e) => {
      if (e.target === forgeOverlayEl) setTimeout(restoreChatBubble, 50);
    });
    // Also listen for Esc key as a fallback close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && forgeOverlayEl.classList.contains('active')) {
        forgeOverlayEl.classList.remove('active');
        forgeOverlayEl.style.height = '';
        forgeOverlayEl.style.top = '';
        setTimeout(restoreChatBubble, 50);
      }
    });
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
  const _pool = (typeof SkillStore !== 'undefined' && SkillStore.size() > 0) ? SkillStore.all() : SHARED_SKILLS;
  const skillIdx = Math.floor(Math.random() * _pool.length);
  const skill = _pool[skillIdx];
  const skillTitle = document.getElementById('skillTitle');
  const skillAuthor = document.getElementById('skillAuthor');
  const skillCopyright = document.getElementById('skillCopyright');
  const skillHash = document.getElementById('skillHash');

  if (skillTitle) skillTitle.textContent = currentLang === 'cn'
    ? (skill.titleCn || skill.title || '')
    : (skill.title || skill.titleCn || '');
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
    footerAboutBtn.addEventListener('click', () => {
      if (howtoOverlay) howtoOverlay.classList.remove('active');
      aboutOverlay.classList.add('active');
    });
  }
  if (aboutClose && aboutOverlay) {
    aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('active'));
    aboutOverlay.addEventListener('click', (e) => {
      if (e.target === aboutOverlay) aboutOverlay.classList.remove('active');
    });
  }

  // Footer HowTo link
  if (footerHowtoBtn && howtoOverlay) {
    footerHowtoBtn.addEventListener('click', () => {
      if (aboutOverlay) aboutOverlay.classList.remove('active');
      howtoOverlay.classList.add('active');
    });
  }
  if (howtoClose && howtoOverlay) {
    howtoClose.addEventListener('click', () => howtoOverlay.classList.remove('active'));
    howtoOverlay.addEventListener('click', (e) => {
      if (e.target === howtoOverlay) howtoOverlay.classList.remove('active');
    });
  }

  // Escape key closes whichever of the two is open
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (aboutOverlay) aboutOverlay.classList.remove('active');
    if (howtoOverlay) howtoOverlay.classList.remove('active');
  });
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
  const sharedSample = (typeof SkillStore !== 'undefined' && SkillStore.size() > 0) ? SkillStore.sample(6) : SHARED_SKILLS.slice(0, 6);
  sharedSample.forEach(s => feedItems.push({
    type: 'skill',
    // Fallback to the other language when one is missing
    title: currentLang === 'cn' ? (s.titleCn || s.title || '') : (s.title || s.titleCn || ''),
    desc: currentLang === 'cn' ? (s.descCn || s.desc || '') : (s.desc || s.descCn || ''),
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
      <h4 class="feed-card-title">${escapeHtml(item.title)}</h4>
      <p class="feed-card-desc">${escapeHtml(item.desc)}</p>
      <div class="feed-card-meta">
        <span class="feed-card-author">by ${escapeHtml(item.author)}</span>
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

// Check for duplicate skills
function checkDuplicateSkill(title) {
  const recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
  const demoSkills = window.allSkills || [];

  // Check against recent forges
  const duplicateRecent = recentSkills.find(s =>
    s.title && s.title.toLowerCase() === title.toLowerCase()
  );

  // Check against demo skills
  const duplicateDemo = demoSkills.find(s =>
    s.title && s.title.toLowerCase() === title.toLowerCase()
  );

  return {
    isDuplicate: !!(duplicateRecent || duplicateDemo),
    location: duplicateRecent ? 'forged' : duplicateDemo ? 'demo' : null
  };
}

/* ═══ RECENTLY FORGED SKILLS STORAGE ═══ */
function saveForgedSkill(skillData) {
  // NOTE: Quality validation is handled by backend moderation system
  // Local storage is only a cache - no need for strict validation here

  // ═══ DUPLICATE CHECK ═══
  const duplicateCheck = checkDuplicateSkill(skillData.title);
  if (duplicateCheck.isDuplicate) {
    const isCn = typeof currentLang !== 'undefined' && currentLang === 'cn';
    const msg = isCn
      ? `技能 "${skillData.title}" 已存在(${duplicateCheck.location})。\n要继续吗？`
      : `Skill "${skillData.title}" already exists (${duplicateCheck.location}).\nContinue anyway?`;
    if (!confirm(msg)) {
      console.log('⚠️ Duplicate skill creation cancelled by user');
      return null;
    }
  }

  let recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');

  // Get creator name from skillData or ask user
  let creatorName = skillData.creator_name || skillData.creatorName || skillData.author || null;
  if (!creatorName) {
    // Prompt user for creator name if not provided
    creatorName = prompt('请输入你的创作者名字 / Enter your creator name:', 'anonymous');
    if (!creatorName) creatorName = 'anonymous';
  }

  const newSkill = {
    id: skillData.id || skillData.backendId || 'forged_' + Date.now(),
    title: skillData.title || 'Unnamed Skill',
    titleCn: skillData.titleCn || '未命名技能',
    desc: skillData.desc || '',
    descCn: skillData.descCn || '',
    agent: `creator_${creatorName}`,  // ✅ Use creator_ prefix for consistency
    creator_name: creatorName,  // ✅ Use snake_case for consistency
    domain: skillData.domain || 'ideas',
    soul_hash: skillData.soulHash || 'SOUL_' + Math.random().toString(16).slice(2, 11),
    author: creatorName,  // ✅ Store actual creator name for display
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
  safeStorage.setItem('42post_recent_forges', JSON.stringify(recentSkills));

  console.log('✅ Skill saved to localStorage:', newSkill.id, newSkill.title);
  return newSkill;
}

function getRecentForges() {
  return safeStorage.getJSON('42post_recent_forges', []);
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

  // Use full soul_hash for markdown export
  const fullSoulHash = skillData.soul_hash || skillData.soulHash || 'SOUL_UNKNOWN';
  const shortSoulHash = fullSoulHash.substring(0, 14);
  const creatorName = skillData.created_by || skillData.author || 'The 42 Post Community';

  // Fallback ready-to-use prompt if not available
  const readyPrompt = skillData.ready_to_use_prompt ||
    (skillData.fiveLayerSkill?.principle ? `Apply the following principle:\n\n${skillData.fiveLayerSkill.principle}` : 'System prompt to be generated during skill forging');

  let md = `# ${skillData.title}
By ${creatorName} | Soul-Hash: ${shortSoulHash}

---

## 🚀 READY TO PROMPT

Copy and paste this system prompt directly into your favorite LLM:

\`\`\`
${readyPrompt}
\`\`\`

---

## 📖 ABOUT THIS SKILL

${skillData.about || (fiveLayer ? fiveLayer.principle : 'A skill forged in The 42 Post that enhances AI reasoning and output quality through structured guidance.')}

---

## 📋 SKILL METADATA

| Field | Value |
|-------|-------|
| **Soul-Hash** | \`${fullSoulHash}\` |
| **Creator** | ${creatorName} |
| **Created** | ${timestamp} |
| **Version** | 1.0.0 |
| **Protocol** | THE 42 POST · Five-Layer Skill Architecture |
| **License** | Creator Reserved |

---

## ✨ COMPLETE FRAMEWORK

### 🎯 Layer 1: Principle / 定义

${fiveLayer ? fiveLayer.principle : 'The core principle of this skill'}

${fiveLayer && fiveLayer.reasoning ? `*Reasoning: ${fiveLayer.reasoning}*` : ''}

---

### 👥 Layer 2: Exemplars / 实例化

${(() => {
  if (!fiveLayer || !fiveLayer.exemplars || fiveLayer.exemplars.length === 0) {
    return '*No exemplars generated — complete the Intuition Probe to generate comparative examples.*';
  }

  let exemplarMd = '';
  fiveLayer.exemplars.forEach((ex) => {
    // Check if label indicates DO/DON'T pattern
    const isNegative = ex.label && (ex.label.toLowerCase().includes('don\'t') || ex.label.toLowerCase().includes('avoid'));
    const prefix = isNegative ? '**DON\'T:**' : '**DO:**';
    exemplarMd += `\n${prefix} ${ex.text}\n`;
    if (ex.note) {
      exemplarMd += `*→ ${ex.note}*\n`;
    }
  });
  return exemplarMd;
})()}

---

### 🔒 Layer 3: Boundaries / 围界

${(() => {
  if (!fiveLayer || !fiveLayer.boundaries) {
    return 'Boundaries to be defined';
  }

  const b = fiveLayer.boundaries;
  let boundaryMd = '';

  if (b.applies_when && b.applies_when.length > 0) {
    boundaryMd += `**Applies when:**\n`;
    b.applies_when.forEach(t => { boundaryMd += `- ✓ ${t}\n`; });
  }

  if (b.does_not_apply && b.does_not_apply.length > 0) {
    boundaryMd += `\n**Does not apply:**\n`;
    b.does_not_apply.forEach(t => { boundaryMd += `- ✕ ${t}\n`; });
  }

  if (b.tension_zones && b.tension_zones.length > 0) {
    boundaryMd += `\n**Tension zones (gray areas requiring judgment):**\n`;
    b.tension_zones.forEach(t => { boundaryMd += `- ⚠ ${t}\n`; });
  }

  return boundaryMd || 'No specific boundaries defined';
})()}

---

### 🧪 Layer 4: Evaluation / 验证

${fiveLayer && fiveLayer.evaluation ? `\n**Metric:** \`${fiveLayer.evaluation.metric}\`\n` : 'No evaluation metric defined'}

${(() => {
  if (!fiveLayer || !fiveLayer.evaluation || !fiveLayer.evaluation.test_cases || fiveLayer.evaluation.test_cases.length === 0) {
    return '*No test cases generated — complete the Intuition Probe to auto-generate.*';
  }

  let testMd = '';
  fiveLayer.evaluation.test_cases.forEach((tc, i) => {
    testMd += `\n**Test Case ${i + 1}:**\n`;
    testMd += `- **Prompt:** ${tc.prompt.substring(0, 200)}${tc.prompt.length > 200 ? '...' : ''}\n`;
    testMd += `- **Expected:** ${tc.expected}\n`;
    testMd += `- **Pass criteria:** ${tc.pass_criteria}\n`;
  });
  return testMd;
})()}

${fiveLayer && fiveLayer.evaluation && fiveLayer.evaluation.silent_failures && fiveLayer.evaluation.silent_failures.length > 0 ? `
**Anti-patterns & Silent Failures:**
${fiveLayer.evaluation.silent_failures.map(failure => `- ${failure}`).join('\n')}
` : ''}

---

### 🌍 Layer 5: Cultural Variants / 情境化

${(() => {
  if (!fiveLayer || !fiveLayer.cultural_variants) {
    return '*Cultural adaptation pending — will be generated based on probe responses.*';
  }

  let culturalMd = '';

  // Handle en-US
  if (fiveLayer.cultural_variants['en-US']) {
    const variant = fiveLayer.cultural_variants['en-US'];
    culturalMd += `\n**English (en-US)**\n`;
    if (variant.principle_note) culturalMd += `- **Note:** ${variant.principle_note}\n`;
    if (variant.adaptation) culturalMd += `- **Adaptation:** ${variant.adaptation}\n`;
  }

  // Handle zh-CN
  if (fiveLayer.cultural_variants['zh-CN']) {
    const variant = fiveLayer.cultural_variants['zh-CN'];
    culturalMd += `\n**中文 (zh-CN)**\n`;
    if (variant.principle_note) culturalMd += `- **说明:** ${variant.principle_note}\n`;
    if (variant.adaptation) culturalMd += `- **本地化:** ${variant.adaptation}\n`;
  }

  return culturalMd || '*Cultural variants to be defined*';
})()}

---

## 📚 USING THIS SKILL

To use this skill effectively:

1. **Copy the Ready-to-Prompt section** above and paste it into your preferred Large Language Model (ChatGPT, Claude, or others)
2. **Provide context or input** relevant to your task
3. **Follow the skill's principle** to guide the AI's reasoning
4. **Reference the exemplars** if you need to show the AI what "good" looks like
5. **Be aware of boundaries** to use the skill appropriately

This skill teaches the AI specific patterns of reasoning and output formatting through the Five-Layer Framework, enabling more consistent and higher-quality results.

---

## Creator Rights

- **Commercial Use**: ${skillData.commercial === 'allowed' ? 'Allowed' : skillData.commercial === 'authorized' ? 'Authorization Required' : 'Prohibited'}
- **Remix**: ${skillData.remix === 'yes' ? 'Allowed' : skillData.remix === 'share-alike' ? 'Share-alike Required' : 'Not Allowed'}

---

*Forged with THE 42 POST · Human Semantic Capital Protocol*
*Version: 1.0.0 | License: ${skillData.license || 'Creator Reserved'}*`;

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
        "creator_contact": skillData.email || "creator@the42post.com",
        "documentation_url": "https://the42post.com/skills/" + skillData.soulHash,
        "feedback_url": "https://the42post.com/skills/" + skillData.soulHash + "/feedback"
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
  link.download = `The42Post_${skillData.title.replace(/\s+/g, '_')}.md`;
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
    requestAnimationFrame(async () => {
      await initAgentArchiveView();
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
  link.download = `The42Post_${skillData.title.replace(/\s+/g, '_')}.md`;
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
  link.download = `The42Post_${skillData.title.replace(/\s+/g, '_')}.py`;
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
  link.download = `The42Post_${skillData.title.replace(/\s+/g, '_')}.json`;
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
  { id: 'safety',     cn: '安全与治理', en: 'Safety & Governance' },
  { id: 'science',    cn: '科技与人文', en: 'Science & Humanities' },
  { id: 'narrative',  cn: '叙事与修辞', en: 'Narrative & Rhetoric' },
  { id: 'design',     cn: '设计与思辨', en: 'Design & Critique' },
  { id: 'visual',     cn: '视觉与美学', en: 'Visuals & Aesthetics' },
  { id: 'experience', cn: '交互与体验', en: 'Experience & Interaction' },
  { id: 'sound',      cn: '声音与节律', en: 'Sound & Rhythm' },
  { id: 'ideas',      cn: '观念与感知', en: 'Ideas & Perception' },
  { id: 'history',    cn: '历史与哲学', en: 'History & Philosophy' },
  { id: 'fun',        cn: '纯粹乐趣', en: 'Just for Fun' },
];

// Map database domain keys to display colors
function mapDomain(dbDomain) {
  if (!dbDomain) return 'ideas';

  const domainMap = {
    '01-narrative-language': 'narrative',
    '02-logic-reasoning': 'science',
    '03-ethics-values': 'design',
    '04-history-tradition': 'history',
    '05-science-systems': 'science',
    '06-design-experience': 'design',
    '07-culture-understanding': 'experience',
    '08-time-life': 'history',
    '09-silence-space': 'visual',
    '10-labor-value': 'sound',
    // Fallback for direct matches
    'narrative': 'narrative',
    'science': 'science',
    'design': 'design',
    'history': 'history',
    'experience': 'experience',
    'visual': 'visual',
    'sound': 'sound',
    'ideas': 'ideas',
    'safety': 'safety',
    'fun': 'fun',
  };

  return domainMap[dbDomain] || 'ideas';
}

function getFullDomain(domain) {
  if (!domain) return '';

  // If already in full format, return as-is
  if (domain.startsWith('01-') || domain.startsWith('02-') || domain.startsWith('03-') ||
      domain.startsWith('04-') || domain.startsWith('05-') || domain.startsWith('06-') ||
      domain.startsWith('07-') || domain.startsWith('08-') || domain.startsWith('09-') ||
      domain.startsWith('10-')) {
    return domain;
  }

  // Map simplified format back to full format
  const reverseMap = {
    'narrative': '01-narrative-language',
    'science': '02-logic-reasoning',
    'design': '03-ethics-values',
    'history': '04-history-tradition',
    'experience': '07-culture-understanding',
    'visual': '09-silence-space',
    'sound': '10-labor-value',
    'ideas': 'ideas',
    'safety': 'safety',
    'fun': 'fun',
  };

  return reverseMap[domain] || domain;
}

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
  return 'SOUL_' + Math.abs(h).toString(16).padStart(9, '0');
}

// ── Mobile Archive: simple scrollable skill list ──
async function initAgentArchiveMobileView() {
  const wrap = document.getElementById('canvasWrap');
  if (!wrap) return;
  const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');

  wrap.innerHTML = '<div style="padding:16px;text-align:center;color:var(--ink-muted);font-size:12px;letter-spacing:0.05em;">' +
    (isCn ? '加载中…' : 'Loading…') + '</div>';

  // Fetch skills
  let skills = [];
  try {
    const resp = await fetch(`${ApiClient.BASE_URL}/skills?limit=50`);
    if (resp.ok) skills = (await resp.json()).skills || [];
  } catch (e) { /* fallback to empty */ }

  // Also merge user's own forged skills
  const forgedSkills = (typeof getRecentForges === 'function') ? getRecentForges() : [];
  const seenIds = new Set(skills.map(s => s.id));
  forgedSkills.forEach(s => { if (!seenIds.has(s.id)) skills.unshift(s); });

  if (!skills.length) {
    wrap.innerHTML = '<div style="padding:32px 16px;text-align:center;color:var(--ink-muted);font-size:13px;">' +
      (isCn ? '还没有技能，来铸造第一个吧 ✦' : 'No skills yet — forge the first one ✦') + '</div>';
    return;
  }

  const cards = skills.map(function(s) {
    const title = (isCn ? (s.title_cn || s.titleCn || s.title) : (s.title)) || '—';
    const desc = (isCn ? (s.description_cn || s.descCn || s.description || s.desc) : (s.description || s.desc)) || '';
    const creator = (s.creator_anonymous_id || s.creator_name || s.author || 'creator_42');
    const stars = s.starlight_score || s.stars || s.starlight || 0;
    const domain = s.domain || '';
    const sid = s.id || '';
    return `<div style="background:#fff;border:1px solid #e8e2d8;border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--ink-muted);letter-spacing:0.05em;text-transform:uppercase;">${domain}</span>
        <span style="font-size:11px;color:var(--ink-muted);">✦ ${stars}</span>
      </div>
      <div style="font-family:var(--font-serif);font-size:16px;font-weight:700;color:var(--ink);margin-bottom:6px;line-height:1.3;">${title}</div>
      ${desc ? `<div style="font-size:12px;color:var(--ink-muted);line-height:1.5;margin-bottom:10px;">${desc.slice(0,80)}${desc.length>80?'…':''}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;color:var(--ink-muted);">${creator}</span>
        <div style="display:flex;gap:8px;">
          ${sid ? `<button onclick="window.location.href='/playground.html?skill=${sid}'" style="padding:6px 12px;border:1px solid var(--ink);background:transparent;border-radius:6px;font-size:11px;cursor:pointer;letter-spacing:0.05em;">▶ ${isCn?'测试':'Play'}</button>` : ''}
          ${sid ? `<button onclick="window.location.href='/api/download/${sid}'" style="padding:6px 12px;border:1px solid var(--ink-muted);background:transparent;border-radius:6px;font-size:11px;cursor:pointer;letter-spacing:0.05em;">↓ ${isCn?'下载':'Get'}</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  wrap.innerHTML = `<div style="padding:12px 16px 40px;overflow-y:auto;height:100%;">
    <div style="font-size:11px;color:var(--ink-muted);letter-spacing:0.08em;margin-bottom:16px;text-align:center;">
      ${isCn ? `${skills.length} 个 Skill` : `${skills.length} Skills`}
    </div>
    ${cards}
  </div>`;
}

async function initAgentArchiveView() {
  const canvas = document.getElementById('celestialCanvas');
  const canvasWrap = document.getElementById('canvasWrap');
  const tooltip = document.getElementById('starTooltip');

  if (!canvas || !canvasWrap) return;

  // Mobile: keep star map but enable touch interactions

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  let nodes = [];
  let edges = [];
  let bgStars = [];
  // Mobile gets a higher default zoom so stars are more spread out and tappable
  const defaultZoom = window.innerWidth <= 768 ? 1.6 : 1;
  let cam = { x: 0, y: 0, zoom: defaultZoom };
  let drag = { active: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };
  let hoveredNode = null;
  let clickedNode = null;
  let cw = 0, ch = 0;

  // ═══ FETCH PUBLISHED SKILLS FROM DATABASE ═══
  let baseSkills = [];
  try {
    // ⚡ OPTIMIZATION: Clear any cached skill list to ensure fresh data
    // This is especially important after the user just published a new skill
    const now = new Date().getTime();
    const lastUpdate = window.__skillsLastUpdated || 0;

    // If skills were updated very recently (< 5 seconds), force a refresh
    const forceRefresh = (now - lastUpdate) < 5000;

    // 从后端API获取所有已发布的skills
    // Add cache-busting parameter for force refresh or always add timestamp for freshness
    const cacheParam = forceRefresh ? `&nocache=${now}` : '';
    const apiUrl = `${ApiClient.BASE_URL}/skills?limit=100${cacheParam}`;

    if (forceRefresh) {
      console.log('🔄 Archive: Force refreshing due to recent skill publication');
    }

    console.log('✓ Archive: Fetching from', apiUrl);

    const response = await fetch(apiUrl);

    if (response.ok) {
      const result = await response.json();
      baseSkills = result.skills || [];
      const isSuccessful = Array.isArray(baseSkills) && baseSkills.length > 0;

      console.log(`✓ Archive: Loaded ${baseSkills.length} published skills from API`);

      // Log the most recent skills for verification
      if (baseSkills.length > 0) {
        const mostRecent = baseSkills.sort((a, b) =>
          new Date(b.published_at) - new Date(a.published_at)
        ).slice(0, 3);
        console.log('📌 Most recent skills:', mostRecent.map(s => ({
          id: s.id,
          title: s.title,
          publishedAt: s.published_at,
          creator: s.creator_name || s.agent || 'Anonymous'
        })));
      }

      // CRITICAL FIX: If API returns fewer than 40 skills, supplement with fallback
      // This ensures 42 skills always display even if database wasn't seeded
      if (baseSkills.length < 40) {
        console.warn(`⚠️ Archive: API returned only ${baseSkills.length} skills, supplementing with local fallback for 42 display`);
        // Try multiple sources for fallback skills
        let fallbackSkills = [];
        if (typeof getTopSkills === 'function') {
          // Most reliable: use getTopSkills(42) from skills.js
          fallbackSkills = getTopSkills(42);
          console.log(`✓ Using getTopSkills(42): ${fallbackSkills.length} skills`);
        } else if (typeof ALL_SKILLS !== 'undefined' && Array.isArray(ALL_SKILLS)) {
          fallbackSkills = ALL_SKILLS;
          console.log(`✓ Using ALL_SKILLS: ${fallbackSkills.length} skills`);
        } else if (typeof SkillStore !== 'undefined' && SkillStore.size && SkillStore.size() > 0) {
          fallbackSkills = SkillStore.all();
          console.log(`✓ Using SkillStore: ${fallbackSkills.length} skills`);
        } else {
          console.warn(`⚠️ No fallback source available`);
        }

        // Merge: keep API skills, add fallback skills that don't duplicate
        const existingIds = new Set(baseSkills.map(s => s.id));
        const additional = fallbackSkills.filter(s => !existingIds.has(s.id));
        baseSkills = [...baseSkills, ...additional].slice(0, 42);
        console.log(`✓ Archive: Combined to ${baseSkills.length} skills for display`);
      }
    } else {
      // Fallback to hardcoded skills if API fails
      console.warn(`⚠️ Archive: API request failed (${response.status}), falling back to local skills`);
      if (typeof getTopSkills === 'function') {
        baseSkills = getTopSkills(42);
      } else if (typeof ALL_SKILLS !== 'undefined') {
        baseSkills = ALL_SKILLS;
      } else if (typeof SkillStore !== 'undefined' && SkillStore.size() > 0) {
        baseSkills = SkillStore.all();
      } else {
        baseSkills = [];
      }
    }
  } catch (error) {
    console.error('❌ Archive: Error fetching skills from API:', error.message);
    // Fallback to hardcoded skills
    if (typeof getTopSkills === 'function') {
      baseSkills = getTopSkills(42);
    } else if (typeof ALL_SKILLS !== 'undefined') {
      baseSkills = ALL_SKILLS;
    } else if (typeof SkillStore !== 'undefined' && SkillStore.size() > 0) {
      baseSkills = SkillStore.all();
    } else {
      baseSkills = [];
    }
  }

  // Safety: ensure we always have at least some skills to display
  if (!baseSkills || baseSkills.length === 0) {
    console.warn('⚠️ No skills available from API or fallback, using local skills');
    if (typeof getTopSkills === 'function') {
      baseSkills = getTopSkills(42);
    } else if (typeof ALL_SKILLS !== 'undefined') {
      baseSkills = ALL_SKILLS;
    } else if (typeof SkillStore !== 'undefined' && SkillStore.size() > 0) {
      baseSkills = SkillStore.all();
    } else {
      baseSkills = [];
    }
  }

  // ═══ UNIFIED NORMALIZATION ═══
  // Standardize ALL skills across all sources (API, ALL_SKILLS, forged)
  // to use consistent field names, ensuring descriptions and creator names display correctly
  baseSkills = baseSkills.map(s => {
    // Map DB field names → UI field names so star/download counts render
    // - starlight_score (DB) → stars + starlight (UI)
    // - download_count   (DB) → downloads (UI)
    const stars = s.stars ?? s.starlight_score ?? s.starlight ?? 0;
    const downloads = s.downloads ?? s.download_count ?? 0;
    const starlight = s.starlight ?? s.starlight_score ?? stars;

    // Normalize description fields across all data sources
    const desc = s.description || s.desc || '';
    const descCn = s.description_cn || s.descCn || s.desc || '';

    // Normalize creator name from multiple possible sources
    let creatorName = 'Anonymous';
    if (s.creator_name && s.creator_name !== 'Anonymous' && s.creator_name !== 'System') {
      creatorName = s.creator_name;
    } else if (s.author && s.author !== 'Anonymous' && s.author !== 'System') {
      creatorName = s.author;
    } else if (s.creatorName && s.creatorName !== 'Anonymous') {
      creatorName = s.creatorName;
    } else if (s.agent && /^creator_/.test(s.agent)) {
      // Extract name from existing "creator_Name" format
      creatorName = s.agent.replace(/^creator_/, '');
    }

    // Ensure agent field always has "creator_" prefix for consistency
    const agent = s.agent && /^creator_/.test(s.agent) ? s.agent : `creator_${creatorName}`;

    return {
      ...s,
      agent,
      creator: agent,
      creator_name: creatorName,  // Use snake_case for consistency
      desc,
      descCn,
      author: creatorName,  // Normalize author field
      title: s.title || s.titleCn || 'Unknown Skill',
      titleCn: s.titleCn || s.title || '未知技能',
      stars,
      downloads,
      starlight
    };
  });

  // ═══ FORGED SKILLS NORMALIZATION ═══
  const forgedSkills = getRecentForges();
  console.log(`📍 Archive: Loaded ${forgedSkills.length} forged skills from localStorage`, forgedSkills.map(s => ({
    id: s.id,
    title: s.title,
    creator_name: s.creator_name,
    author: s.author
  })));
  const forgedSkillsWithStarlight = forgedSkills.map(s => {
    // Ensure forged skills also follow the standard format
    const creatorName = s.creator_name || s.creatorName || s.author || 'Anonymous';
    return {
      ...s,
      starlight: s.starlight || 5,
      titleCn: s.titleCn || s.title || 'Unknown Skill',
      desc: s.desc || '',
      descCn: s.descCn || s.desc || '',
      agent: s.agent && /^creator_/.test(s.agent) ? s.agent : `creator_${creatorName}`,
      author: creatorName,
      creator_name: creatorName
    };
  });

  // ═══ FETCH USER'S OWN SKILLS FROM DB (survives device/cache changes) ═══
  let userDbSkills = [];
  try {
    const token = ApiClient.getToken();
    if (token) {
      const userResp = await fetch(`${ApiClient.BASE_URL}/skills/user/skills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userResp.ok) {
        const userData = await userResp.json();
        const existingIds = new Set(baseSkills.map(s => s.id));
        userDbSkills = (userData.skills || [])
          .filter(s => !existingIds.has(s.id))
          .map(s => {
            const creatorName = s.creator_anonymous_id || s.username || 'Anonymous';
            return {
              ...s,
              starlight: s.starlight_score || s.starlight || 5,
              titleCn: s.title_cn || s.title,
              desc: s.description || '',
              descCn: s.description_cn || s.description || '',
              agent: `creator_${creatorName}`,
              author: creatorName,
              creator_name: creatorName
            };
          });
        if (userDbSkills.length > 0) {
          console.log(`📍 Archive: Loaded ${userDbSkills.length} user skills from DB`);
        }
      }
    }
  } catch (e) {
    console.warn('Archive: failed to fetch user skills from DB:', e.message);
  }

  const allSkills = [...baseSkills, ...userDbSkills, ...forgedSkillsWithStarlight]
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i); // dedup by id

  // Expose allSkills to window so findSkillById can access them
  // This is critical for Archive action buttons (star, download, play) to work
  window.allSkills = allSkills;

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
  
  // ═══ DETERMINISTIC PSEUDO-RANDOM GENERATOR ═══
  // Uses skill index + string hash to produce consistent "random" values
  // Same skill list always produces same layout
  function seededRandom(index, seed = 0) {
    // Simple pseudo-random using hash
    const x = Math.sin((index + seed) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function initNodes() {
    const cx = cw / 2;
    const cy = ch / 2;

    // ═══ STATIC BACKGROUND STARS (no randomization per layout)
    bgStars = [];
    for (let i = 0; i < 200; i++) {
      const rand1 = seededRandom(i, 1000);
      const rand2 = seededRandom(i, 1001);
      const rand3 = seededRandom(i, 1002);
      const rand4 = seededRandom(i, 1003);
      const rand5 = seededRandom(i, 1004);
      bgStars.push({
        x: (rand1 - 0.5) * cw * 4,
        y: (rand2 - 0.5) * ch * 4,
        size: rand3 * 1.0 + 0.3,
        alpha: rand4 * 0.3 + 0.05,
        twinkle: rand5 * Math.PI * 2,
      });
    }

    nodes = allSkills.map((s, i) => {
      const angle = (i / allSkills.length) * Math.PI * 2 + (i * 0.618);
      const spiralR = 80 + i * 13 + Math.sin(i * 2.1) * 50;

      // ═══ DETERMINISTIC NODE POSITIONING ═══
      // Use skill ID as part of seed so same skill always appears in same place
      const seedX = parseInt(s.id) || i;
      const seedY = parseInt(s.id) || i;
      const offsetX = (seededRandom(i, seedX) - 0.5) * 30;
      const offsetY = (seededRandom(i, seedY + 1) - 0.5) * 25;

      const x = cx + Math.cos(angle) * spiralR + offsetX;
      const y = cy + Math.sin(angle) * spiralR * 0.65 + offsetY;
      const color = DOMAIN_COLORS[mapDomain(s.domain)] || DOMAIN_COLORS.ideas;

      // Normalize fields from DB (title_cn/description_cn) and local (titleCn/descCn)
      const title = s.title || '';
      const titleCn = s.titleCn || s.title_cn || s.title || '';
      const desc = s.desc || s.description || '';
      const descCn = s.descCn || s.description_cn || '';

      // Use stored soul_hash from API (soul_hash) or localStorage (soulHash), fallback to generated hash
      const storedHash = s.soul_hash || s.soulHash || '';
      const hashValue = storedHash || soulHash(s.id + title);

      // ═══ DETERMINISTIC ANIMATION PHASE ═══
      const phaseRand = seededRandom(i, seedX + seedY);

      return {
        x, y, baseX: x, baseY: y,
        size: 3.5 + (s.starlight || 5) * 0.2,
        starlight: s.starlight || 5,
        title, titleCn,
        desc, descCn,
        agent: s.agent || `creator_${s.creator_name || 'Anonymous'}`,
        creator_name: s.creator_name || 'Anonymous',
        domain: s.domain, id: s.id,
        hash: hashValue,
        color, phase: phaseRand * Math.PI * 2,
      };
    });

    // Debug: Log nodes to verify they have proper title/creator info
    const nodeSample = nodes.slice(0, 5).map(n => ({
      id: n.id,
      title: n.title,
      creator_name: n.creator_name
    }));
    console.log(`✓ Archive: Created ${nodes.length} nodes for celestial canvas`, nodeSample);

    // ═══ DETERMINISTIC EDGE GENERATION ═══
    edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].baseX - nodes[j].baseX, nodes[i].baseY - nodes[j].baseY);
        // Use seeded random for edge decision (consistent per layout)
        const edgeRand = seededRandom(i * 1000 + j, 2000);
        if (dist < 160 && edgeRand > 0.45) edges.push([i, j]);
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
          ctx.fillText((n.hash || '').substring(0, 14), n.x, n.y + sz * 2.8 + 10);
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
      // Display text according to current language (global currentLang)
      const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');

      // ═══ Bilingual display ═══
      // Set English title (shown when data-lang="en")
      document.getElementById('ttName').textContent = n.title || n.titleCn || '';
      // Set Chinese title (shown when data-lang="cn")
      document.getElementById('ttNameCn').textContent = n.titleCn || n.title || '';

      // Use creator_name field directly (already normalized in initAgentArchiveView)
      const creatorName = n.creator_name || (n.agent && n.agent.startsWith('creator_')
        ? n.agent.substring(8)
        : 'Anonymous');
      document.getElementById('ttAgent').textContent = creatorName && creatorName !== 'Anonymous' ? `by ${creatorName}` : '';
      // Description: show appropriate language based on currentLang
      document.getElementById('ttDesc').textContent = lang === 'cn' ? (n.descCn || n.desc || '') : (n.desc || n.descCn || '');
      // Soul hash is shown only in the full card detail, not in this tooltip
      document.getElementById('ttHash').textContent = '';
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

  /* ═══════════════════════════════════════════════════════
     Touch support (mobile) — one-finger pan, two-finger pinch-zoom,
     tap-to-select (distinguished from drag by movement threshold).
     ═══════════════════════════════════════════════════════ */
  let pinchStart = null; // { dist, zoom }
  let tapCandidate = null; // { x, y, t }

  function touchDist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      drag = { active: true, startX: t.clientX, startY: t.clientY, camStartX: cam.x, camStartY: cam.y };
      tapCandidate = { x: t.clientX, y: t.clientY, t: Date.now() };
      pinchStart = null;
    } else if (e.touches.length === 2) {
      drag.active = false;
      tapCandidate = null;
      pinchStart = { dist: touchDist(e.touches[0], e.touches[1]), zoom: cam.zoom };
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && drag.active) {
      e.preventDefault();
      const t = e.touches[0];
      cam.x = drag.camStartX + (t.clientX - drag.startX) / cam.zoom;
      cam.y = drag.camStartY + (t.clientY - drag.startY) / cam.zoom;
      tooltip.classList.remove('visible');
      hoveredNode = null;
      if (tapCandidate && (Math.abs(t.clientX - tapCandidate.x) > 6 || Math.abs(t.clientY - tapCandidate.y) > 6)) {
        tapCandidate = null; // moved too much — no tap
      }
    } else if (e.touches.length === 2 && pinchStart) {
      e.preventDefault();
      const d = touchDist(e.touches[0], e.touches[1]);
      const ratio = d / pinchStart.dist;
      cam.zoom = Math.max(0.3, Math.min(5, pinchStart.zoom * ratio));
      document.getElementById('zoomInfo').textContent = Math.round(cam.zoom * 100) + '%';
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    drag.active = false;
    pinchStart = null;
    if (tapCandidate && Date.now() - tapCandidate.t < 400) {
      const idx = findNodeAt(tapCandidate.x, tapCandidate.y);
      if (idx !== null) {
        const n = nodes[idx];
        const rect = canvasWrap.getBoundingClientRect();
        const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
        // ═══ Bilingual display ═══
        document.getElementById('ttName').textContent = n.title || n.titleCn || '';
        document.getElementById('ttNameCn').textContent = n.titleCn || n.title || '';
        // Extract creator name from creator_name field
        const creatorName = n.creator_name || (n.agent && n.agent.startsWith('creator_')
          ? n.agent.substring(8)
          : 'Anonymous');
        document.getElementById('ttAgent').textContent = creatorName && creatorName !== 'Anonymous' ? `by ${creatorName}` : '';
        document.getElementById('ttDesc').textContent = lang === 'cn' ? (n.descCn || n.desc || '') : (n.desc || n.descCn || '');
        // Soul hash is shown only in the full card detail, not in this tooltip
        document.getElementById('ttHash').textContent = '';
        document.getElementById('ttStarlight').textContent = '★ ' + n.starlight;
        document.getElementById('ttDomain').textContent = n.domain;
        tooltip.style.left = Math.min(tapCandidate.x - rect.left + 16, cw - 300) + 'px';
        tooltip.style.top = Math.min(tapCandidate.y - rect.top + 16, ch - 180) + 'px';
        tooltip.classList.add('visible');
        clickedNode = clickedNode === idx ? null : idx;
      } else {
        tooltip.classList.remove('visible');
        clickedNode = null;
      }
    }
    tapCandidate = null;
  }, { passive: true });

  canvas.addEventListener('touchcancel', () => {
    drag.active = false;
    pinchStart = null;
    tapCandidate = null;
  }, { passive: true });

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
  
  // Honor List — latest 42 skills (sorted by published_at desc)
  function initHonorList() {
    const list = document.getElementById('honorList');
    const sorted = [...allSkills].sort((a, b) => {
      const ta = new Date(b.published_at || b.publishedAt || 0).getTime();
      const tb = new Date(a.published_at || a.publishedAt || 0).getTime();
      return ta - tb;
    }).slice(0, 42);

    list.innerHTML = '';
    sorted.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'honor-row';

      // Get proper title based on current language
      const lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
      const title = lang === 'cn'
        ? (s.title_cn || s.titleCn || s.title || '')
        : (s.title || s.title_cn || s.titleCn || '');

      // Get description based on current language (no need to show full, but needed for consistency)
      const desc = lang === 'cn'
        ? (s.description_cn || s.descCn || s.description || s.desc || '')
        : (s.description || s.desc || s.description_cn || s.descCn || '');
      const shortDesc = desc.substring(0, 60) + (desc.length > 60 ? '…' : '');

      // Extract creator name (fallback to anonymous)
      const creatorName = s.creator_name || s.agent?.replace('creator_', '') || 'anonymous';

      row.innerHTML = `
        <span class="honor-rank">#${String(i + 1).padStart(2, '0')}</span>
        <div class="honor-info">
          <span class="honor-name">${title}</span>
          <span class="honor-desc">${shortDesc}</span>
        </div>
        <span class="honor-creator">by ${creatorName}</span>
        <span class="honor-stars">★${s.starlight || 0}</span>
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
  
  // Archive Skills Grid - Display skills organized by domain with action buttons
  function initDomainGrid() {
    const grid = document.getElementById('domainGrid');
    if (!grid) {
      console.error('❌ Domain Grid: #domainGrid element not found');
      return;
    }

    const lang = (typeof currentLang !== 'undefined' ? currentLang : 'en');
    console.log('🔧 Domain Grid: Initializing skills organized by domain');
    grid.innerHTML = '';

    // Group allSkills by domain
    const skillsByDomain = {};
    ARCHIVE_DOMAINS.forEach(dom => {
      skillsByDomain[dom.id] = [];
    });

    allSkills.forEach(skill => {
      const domain = mapDomain(skill.domain) || 'ideas';
      if (skillsByDomain[domain]) {
        skillsByDomain[domain].push(skill);
      }
    });

    // Render each domain with its skills
    ARCHIVE_DOMAINS.forEach((dom, idx) => {
      const cell = document.createElement('div');
      cell.className = 'domain-cell';

      const domainSkills = skillsByDomain[dom.id] || [];
      const domainTitle = lang === 'cn' ? dom.cn : dom.en;

      let skillsHTML = '';
      if (domainSkills.length > 0) {
        skillsHTML = domainSkills.slice(0, 3).map(skill => {
          const title = lang === 'cn' ? (skill.title_cn || skill.titleCn || skill.title) : (skill.title || skill.title_cn || skill.titleCn);
          const desc = lang === 'cn' ? (skill.description_cn || skill.descCn || skill.desc || '') : (skill.description || skill.desc || skill.description_cn || '');
          const shortDesc = desc.substring(0, 120) + (desc.length > 120 ? '...' : '');
          // Extract creator name - handle both "creator_xxx" format and plain name
          let creatorDisplay = 'creator_anonymous';
          if (skill.agent && skill.agent.startsWith('creator_')) {
            creatorDisplay = skill.agent;
          } else if (skill.creator_name || skill.creatorName) {
            const name = skill.creator_name || skill.creatorName;
            creatorDisplay = name.startsWith('creator_') ? name : `creator_${name}`;
          }
          // Get soul hash (shortened to 14 chars for UI display)
          const soulHashFull = skill.soul_hash || skill.soulHash || '';
          const soulHashShort = soulHashFull && soulHashFull.length > 14
            ? soulHashFull.substring(0, 14)
            : soulHashFull;
          // Check if skill is starred from localStorage
          const starredSkills = safeStorage.getJSON('starred_skills', {});
          const isStarred = starredSkills[skill.id] === true;
          return `
            <div class="skill-item" data-skill-id="${skill.id}" data-is-starred="${isStarred}">
              <div class="skill-header">
                <div class="skill-title">${escapeHtml(title)}</div>
                <div class="skill-hash" title="Soul Hash: ${escapeHtml(soulHashFull)}">${escapeHtml(soulHashShort) || '—'}</div>
              </div>
              <div class="skill-creator">${escapeHtml(creatorDisplay)}</div>
              <div class="skill-desc">${escapeHtml(shortDesc)}</div>
              <div class="skill-footer">
                <div class="skill-meta">
                  <span class="skill-stars">⭐ ${skill.starlight_score || skill.stars || 0}</span>
                  <span class="skill-winrate" data-skill-id="${skill.id}"></span>
                </div>
                <!-- Action buttons: Star, Download, Play -->
                <div class="skill-actions">
                  <button class="skill-action-btn star-btn ${isStarred ? 'starred' : ''}" data-skill-id="${skill.id}" title="${isStarred ? 'Unstar this skill' : 'Star this skill'}">${isStarred ? '★' : '☆'}</button>
                  <button class="skill-action-btn download-btn ${!isStarred ? 'disabled' : ''}" data-skill-id="${skill.id}" title="${isStarred ? 'Download skill' : 'Star first to download'}" ${!isStarred ? 'disabled' : ''}>📥</button>
                  <button class="skill-action-btn play-btn" data-skill-id="${skill.id}" title="Play Twin Test">▶</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        skillsHTML = `
          <div class="domain-placeholder">
            <div class="domain-placeholder-text text-cn">虚位以待</div>
            <div class="domain-placeholder-text text-en">Coming Soon</div>
          </div>
        `;
      }

      cell.innerHTML = `
        <div class="domain-title text-cn">${dom.cn}</div>
        <div class="domain-title-en text-en">${dom.en}</div>
        <div class="skills-container">${skillsHTML}</div>
      `;
      grid.appendChild(cell);
      console.log(`  ✓ Domain ${idx + 1}: ${dom.cn} (${domainSkills.length} skills)`);
    }); // end ARCHIVE_DOMAINS.forEach

    // Attach skill action button listeners
    setTimeout(() => {
      attachArchiveSkillListeners();
    }, 100);

    console.log('✓ Domain Grid: Rendered', ARCHIVE_DOMAINS.length, 'domains with skills');

    // Async: badge each card with its real Playground win rate.
    // One batch request for the whole grid — fails silently if unavailable.
    (async () => {
      try {
        const resp = await fetch(`${ApiClient.BASE_URL}/playground/stats-batch`);
        if (!resp.ok) return;
        const json = await resp.json();
        const stats = json.stats || {};
        const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
        document.querySelectorAll('.skill-winrate').forEach(el => {
          const s = stats[el.dataset.skillId];
          if (!s) return;
          if (s.win_rate !== null && s.rated >= 3) {
            // Enough votes for a meaningful percentage
            el.textContent = isCn
              ? `🏆 实测胜率 ${s.win_rate}%`
              : `🏆 ${s.win_rate}% win rate`;
            el.title = isCn
              ? `${s.tests} 次 Playground 测试，${s.rated} 人评价`
              : `${s.tests} Playground tests, ${s.rated} ratings`;
          } else if (s.tests > 0) {
            el.textContent = isCn ? `⚡ ${s.tests} 次实测` : `⚡ ${s.tests} tests`;
          }
        });
      } catch (e) { /* stats are a nicety — never break the grid */ }
    })();
  } // end initDomainGrid

  // syncArchiveStarStates() batch-fetches star state for every visible card
  // on load and applies it as "source of truth" once it resolves. If a user
  // stars a card while that batch request is still in flight, its
  // late-arriving (now-stale) result would otherwise overwrite the user's
  // own click a moment later, silently un-starring it with no error. Skill
  // ids in this set were touched locally and should win. Declared at this
  // shared scope (not inside attachArchiveSkillListeners) because that
  // function and syncArchiveStarStates are siblings, not nested.
  const locallyToggledSkillIds = new Set();

  // Attach listeners to skill action buttons in archive grid
  function attachArchiveSkillListeners() {
    // Star buttons
    document.querySelectorAll('.domain-cell .star-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (btn.disabled) return;

        const skillId = btn.dataset.skillId;
        locallyToggledSkillIds.add(skillId);
        const skillItem = btn.closest('.skill-item');
        const downloadBtn = skillItem?.querySelector('.download-btn');
        const starCountEl = skillItem?.querySelector('.skill-stars');

        const starredSkills = safeStorage.getJSON('starred_skills', {});
        const isCurrentlyStarred = starredSkills[skillId] === true;
        const willBeStarred = !isCurrentlyStarred;

        // Optimistic UI update
        btn.textContent = willBeStarred ? '★' : '☆';
        btn.classList.toggle('starred', willBeStarred);
        btn.title = willBeStarred ? 'Unstar this skill' : 'Star this skill';
        if (skillItem) skillItem.dataset.isStarred = String(willBeStarred);
        if (downloadBtn) {
          downloadBtn.disabled = !willBeStarred;
          downloadBtn.classList.toggle('disabled', !willBeStarred);
          downloadBtn.title = willBeStarred ? 'Download skill' : 'Star first to download';
        }

        // Update localStorage
        if (willBeStarred) starredSkills[skillId] = true;
        else delete starredSkills[skillId];
        safeStorage.setItem('starred_skills', JSON.stringify(starredSkills));

        // Call API and update count with real number from backend
        btn.disabled = true;
        try {
          const resp = await fetch(`${API_CONFIG.BASE_URL}/skills/${skillId}/star`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Anonymous-Id': getAnonymousId() },
            body: JSON.stringify({ starred: willBeStarred })
          });
          if (resp.ok) {
            const result = await resp.json();
            if (starCountEl && typeof result.totalStars !== 'undefined') {
              starCountEl.textContent = `⭐ ${result.totalStars}`;
            }
          }
        } catch (err) {
          console.warn('Star API error:', err.message);
          // Revert on error
          btn.textContent = isCurrentlyStarred ? '★' : '☆';
          btn.classList.toggle('starred', isCurrentlyStarred);
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Download buttons
    document.querySelectorAll('.domain-cell .download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Check if button is disabled
        if (btn.disabled) {
          const t = window.t || ((key) => key);
          alert(t('warning_star_first') || 'Please star this skill first to download it');
          return;
        }

        const skillId = btn.dataset.skillId;
        const skill = findSkillById(skillId);
        if (skill) {
          const markdown = generateDomainSkillMarkdown(skill);
          downloadMarkdownFile(markdown, `The42Post_${skill.title.replace(/\s+/g, '_')}.md`);
        }
      });
    });

    // Play buttons — open Playground with this skill auto-selected as Skill A
    document.querySelectorAll('.domain-cell .play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillId = btn.dataset.skillId;
        window.location.href = `playground.html?skill=${encodeURIComponent(skillId)}`;
      });
    });

    // Batch-sync star states from backend (accurate count + userStarred per device)
    syncArchiveStarStates();
  }

  async function syncArchiveStarStates() {
    const btns = document.querySelectorAll('.domain-cell .star-btn[data-skill-id]');
    const skillIds = [...new Set([...btns].map(b => b.dataset.skillId))];
    if (!skillIds.length) return;

    try {
      const resp = await fetch(
        `${API_CONFIG.BASE_URL}/skills/stars/batch?ids=${skillIds.join(',')}`,
        { headers: { 'X-Anonymous-Id': getAnonymousId() } }
      );
      if (!resp.ok) return;
      const { stars } = await resp.json();

      const starredSkills = safeStorage.getJSON('starred_skills', {});

      btns.forEach(btn => {
        const id = btn.dataset.skillId;
        if (locallyToggledSkillIds.has(id)) return;
        const data = stars[id];
        if (!data) return;

        const skillItem = btn.closest('.skill-item');
        const starCountEl = skillItem?.querySelector('.skill-stars');
        const downloadBtn = skillItem?.querySelector('.download-btn');

        // Update count display
        if (starCountEl) starCountEl.textContent = `⭐ ${data.totalStars}`;

        // Update starred state from backend (source of truth)
        if (data.userStarred) {
          btn.classList.add('starred');
          btn.textContent = '★';
          btn.title = 'Unstar this skill';
          starredSkills[id] = true;
          if (skillItem) skillItem.dataset.isStarred = 'true';
          if (downloadBtn) { downloadBtn.disabled = false; downloadBtn.classList.remove('disabled'); }
        } else {
          btn.classList.remove('starred');
          btn.textContent = '☆';
          btn.title = 'Star this skill';
          delete starredSkills[id];
          if (skillItem) skillItem.dataset.isStarred = 'false';
          if (downloadBtn) { downloadBtn.disabled = true; downloadBtn.classList.add('disabled'); }
        }
      });

      safeStorage.setItem('starred_skills', JSON.stringify(starredSkills));
    } catch (e) {
      console.warn('Could not sync star states:', e.message);
    }
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

  // Get latest 42 skills sorted by published_at desc
  const allForGrid = (typeof window.allSkills !== 'undefined' && window.allSkills.length > 0)
    ? window.allSkills
    : (typeof getTopSkills === 'function' ? getTopSkills(100) : []);
  const topSkills = [...allForGrid].sort((a, b) => {
    const ta = new Date(b.published_at || b.publishedAt || 0).getTime();
    const tb = new Date(a.published_at || a.publishedAt || 0).getTime();
    return ta - tb;
  }).slice(0, 42);

  gridEl.innerHTML = '';
  topSkills.forEach((skill, index) => {
    const rank = index + 1;
    const titleEn = skill.title || '';
    const titleCn = skill.title_cn || skill.titleCn || skill.title || '';
    const descEn = skill.description || skill.desc || '';
    const descCn = skill.description_cn || skill.descCn || skill.desc || '';
    const cellHTML = `
      <div class="top42-cell" data-skill-id="${skill.id}">
        <div class="top42-skill-rank">★ #${rank}</div>
        <div class="top42-skill-title text-en">${escapeHtml(titleEn)}</div>
        <div class="top42-skill-title-cn text-cn">${escapeHtml(titleCn)}</div>
        <div class="top42-skill-desc text-en">${escapeHtml(descEn)}</div>
        <div class="top42-skill-desc text-cn">${escapeHtml(descCn)}</div>
        <div class="top42-skill-meta">
          <div class="top42-skill-meta-item">⭐ <span>${skill.starlight || 0}</span></div>
          <div class="top42-skill-meta-item">📥 <span>${skill.downloads || 0}</span></div>
          <div class="top42-skill-meta-item">${escapeHtml(skill.domain || '')}</div>
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

/* ═══ UTILITY FUNCTIONS FOR SKILL INTERACTIONS ═══ */
function starSkillById(skillId, nodesArray = null) {
  const starredSkills = safeStorage.getJSON('starred_skills', {});
  const isStarred = starredSkills[skillId] === true;
  const newStarred = !isStarred;

  // Update local storage
  if (newStarred) {
    starredSkills[skillId] = true;
  } else {
    delete starredSkills[skillId];
  }
  safeStorage.setItem('starred_skills', JSON.stringify(starredSkills));

  // Sync to backend
  try {
    fetch(`${ApiClient.BASE_URL}/skills/${skillId}/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Anonymous-Id': getAnonymousId() },
      body: JSON.stringify({ starred: newStarred })
    }).then(resp => {
      if (resp.ok) {
        console.log(`✓ Skill ${newStarred ? 'starred' : 'unstarred'}: ${skillId}`);
        return resp.json();
      }
    }).then(result => {
      if (result && typeof result.totalStars !== 'undefined') {
        console.log(`📊 Total stars: ${result.totalStars}`);
        // Update nodes if available (for archive display)
        if (nodesArray) {
          const node = nodesArray.find(n => n.id === skillId);
          if (node) node.starlight = result.totalStars;
        }
      }
    }).catch(err => console.warn('Star sync failed:', err.message));
  } catch (err) { console.warn('Star API error:', err.message); }
}

function attachTop42SkillListeners() {
  console.log('🔧 Attaching top42 skill listeners...');
  const skillCells = document.querySelectorAll('.top42-cell[data-skill-id]');
  console.log(`Found ${skillCells.length} top42 skill cells`);

  skillCells.forEach(cell => {
    const skillId = cell.dataset.skillId;

    // Find skill via SkillStore (single source of truth)
    let skill = findSkillById(skillId);

    if (!skill) {
      console.warn(`Skill with ID ${skillId} not found`);
      return;
    }

    // Star button
    const starBtn = cell.querySelector('.star-btn');
    if (starBtn) {
      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const starredSkills = safeStorage.getJSON('starred_skills', {});
        const isStarred = starredSkills[skillId] === true;
        const newStarred = !isStarred;

        // Optimistic UI update
        if (newStarred) {
          starredSkills[skillId] = true;
          starBtn.classList.add('starred');
          skill.starlight = (skill.starlight || 0) + 1;
          skill.stars = skill.starlight;
        } else {
          delete starredSkills[skillId];
          starBtn.classList.remove('starred');
          skill.starlight = Math.max(0, (skill.starlight || 0) - 1);
          skill.stars = skill.starlight;
        }
        safeStorage.setItem('starred_skills', JSON.stringify(starredSkills));
        const starDisplay = cell.querySelector('.top42-skill-meta .top42-skill-meta-item:first-child span');
        if (starDisplay) starDisplay.textContent = skill.starlight || 0;

        // Sync to backend so starlight_score stays accurate
        try {
          const resp = await fetch(`${ApiClient.BASE_URL}/skills/${skillId}/star`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Anonymous-Id': getAnonymousId() },
            body: JSON.stringify({ starred: newStarred })
          });
          if (resp.ok) {
            const result = await resp.json();
            skill.starlight = result.totalStars;
            skill.stars = result.totalStars;
            if (starDisplay) starDisplay.textContent = skill.starlight;
          }
        } catch (err) { console.warn('Star sync failed (local state preserved):', err.message); }
      });

      // Check if already starred
      const starredSkills = safeStorage.getJSON('starred_skills', {});
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
        downloadMarkdownFile(markdown, `The42Post_${skill.title.replace(/\s+/g, '_')}.md`);

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

    // Find skill across all sources (DB_SKILLS, SHARED_SKILLS, ALL_SKILLS)
    let skill = findSkillById(skillId);

    if (!skill) {
      console.warn(`Skill with ID ${skillId} not found`);
      return;
    }

    // Ensure skill has required properties
    skill.stars = skill.stars || 0;
    skill.downloads = skill.downloads || 0;

    // Star button handler
    const starBtn = card.querySelector('.btn-skill-star');
    if (starBtn) {
      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const starredSkills = safeStorage.getJSON('starred_skills', {});
        const isCurrentlyStarred = starredSkills[skillId] === true;
        const newStarred = !isCurrentlyStarred;

        // Optimistic UI update
        if (newStarred) {
          starredSkills[skillId] = true;
          skill.stars = (skill.stars || 0) + 1;
          starBtn.textContent = `⭐ ${skill.stars}`;
        } else {
          delete starredSkills[skillId];
          skill.stars = Math.max(0, (skill.stars || 0) - 1);
          starBtn.textContent = `☆ ${skill.stars}`;
        }
        safeStorage.setItem('starred_skills', JSON.stringify(starredSkills));

        // Enable/disable download button
        const downloadBtn = card.querySelector('.btn-skill-download');
        if (downloadBtn) {
          if (newStarred) {
            downloadBtn.removeAttribute('disabled');
            downloadBtn.title = 'Download';
          } else {
            downloadBtn.setAttribute('disabled', '');
            downloadBtn.title = 'Star first to download';
          }
        }

        // Sync to backend
        try {
          const resp = await fetch(`${ApiClient.BASE_URL}/skills/${skillId}/star`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Anonymous-Id': getAnonymousId()
            },
            body: JSON.stringify({ starred: newStarred })
          });
          if (resp.ok) {
            const result = await resp.json();
            skill.stars = result.totalStars;
            starBtn.textContent = `${newStarred ? '⭐' : '☆'} ${skill.stars}`;
          }
        } catch (err) {
          console.warn('Star sync to backend failed (local state preserved):', err.message);
        }
      });
    }

    // Download button handler
    const downloadBtn = card.querySelector('.btn-skill-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const starredSkills = safeStorage.getJSON('starred_skills', {});
        if (starredSkills[skillId] !== true) {
          alert('⭐ Please star this skill first before downloading.');
          return;
        }

        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.6';
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = '⏳ Downloading...';

        try {
          // Download from backend API
          const response = await fetch(
            `${ApiClient.BASE_URL}/download/${skill.id}?format=markdown`,
            {
              headers: {
                'X-Anonymous-Id': getAnonymousId()
              }
            }
          );

          if (!response.ok) {
            throw new Error(`Download failed with status ${response.status}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `The42Post_${skill.title.replace(/\s+/g, '_')}.md`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          skill.downloads = (skill.downloads || 0) + 1;
          downloadBtn.textContent = `📥 ${skill.downloads}`;
          console.log(`📥 Skill "${skill.title}" downloaded (${skill.downloads} total)`);
        } catch (error) {
          console.error('Download error:', error);
          alert('Failed to download skill. Please try again.');
          downloadBtn.textContent = originalText;
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.style.opacity = '1';
        }
      });
    }
  });

  console.log('✓ Domain skill listeners attached');
}

function generateDomainSkillMarkdown(skill) {
  // Delegate to the unified new-format generator.
  // Normalise field names so generateSkillMarkdown can read them.
  const adapted = {
    ...skill,
    fiveLayerSkill: skill.fiveLayerSkill || skill.five_layer || {},
    author: skill.author || skill.creator_anonymous_id || 'The 42 Post Community',
    soul_hash: skill.soul_hash || skill.soulHash || 'SOUL_UNKNOWN',
    ready_to_use_prompt: skill.ready_to_use_prompt || null,
  };
  return generateSkillMarkdown(adapted);

  // ── Legacy implementation kept below for reference ──
  const fiveLayer = skill.five_layer || {};

  let markdown = `# ${skill.title}\n`;
  markdown += `*${skill.titleCn || skill.title}*\n\n`;

  markdown += `**Forger:** ${skill.author}\n`;
  markdown += `**Soul-Hash:** ${skill.soul_hash || skill.soulHash || 'SOUL_UNKNOWN'}\n`;
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

  // Escape user-provided values before HTML email injection
  const safeSkillTitle = escapeHtml(skillTitle);
  const safeSoulHash = escapeHtml(soulHash);
  const safeCreatorName = escapeHtml(creatorName);
  const safeDomain = escapeHtml(String(domain || ''));

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
        .card-tagline { font-size: 12px; color: #666; font-style: italic; margin: 12px 0 8px; letter-spacing: 0.5px; }
        .card-footer { font-size: 11px; color: #888; font-weight: 400; letter-spacing: 0.5px; }
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
                <div class="card-title-main">${safeSkillTitle}</div>
                <div class="card-soul-hash">Soul-Hash: ${safeSoulHash}</div>
                <div class="card-meta">
                  <p>Created by: ${safeCreatorName}</p>
                  <p>Date: ${createdDate}</p>
                  <p>Domain: ${safeDomain}</p>
                </div>
                <div class="card-divider"></div>
                <div class="card-tagline">Forging Human Wisdom for a Better AI Future</div>
                <div class="card-footer">www.the42post.com</div>
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
          <p>Forging Human Wisdom for a Better AI Future</p>
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
      const dashboardCard = document.getElementById('dashboard-card');
      if (dashboardCard) {
        dashboardCard.style.display = 'none';
      }
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
    document.getElementById('dash-soul-hash').textContent = `Soul-Hash: ${data.id.substring(0, 14)}`;
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

  const text = `我刚铸造了一个新的 Skill：《${data.title}》\n\nSoul-Hash: ${data.id}\n\n来 THE 42 POST 体验吧！\nhttps://the42post.com`;

  // Use native Share API if available
  if (navigator.share) {
    navigator.share({
      title: 'THE 42 POST',
      text: text,
      url: `https://the42post.com?skill=${data.id}`
    }).catch(err => console.error('Share failed:', err));
  } else {
    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      showToastI18n('success_clip_copied', 'success');
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

// Dashboard initialization is now handled in initializeApp()

/* ═══════════════════════════════════════════════════════
   VOICE INPUT — Web Speech API
   Attaches mic buttons to chaosInput and forgeSkillIdea.
   Gracefully hidden when browser lacks SpeechRecognition.
   ═══════════════════════════════════════════════════════ */
function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  // Mobile: single-shot mode (tap→speak→auto-stop→tap again to add more).
  // This matches the UX of every mobile voice keyboard and works across
  // iOS Safari, Android Chrome, and all OEM browsers.
  // Desktop: continuous mode with manual stop.
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // Pick recognition language per mic tap:
  // 1. CJK already in the box → zh-CN (unfakeable signal)
  // 2. the page language toggle (the user's explicit intent)
  // 3. browser/system language hint
  // Deliberately NO "latin text → en-US" rule: when recognition once ran
  // in the wrong language, its English garbage output would re-trigger
  // that rule and lock every later session into English — even after the
  // user switched the page to 中文. Page toggle wins over box content.
  function getLang(targetEl) {
    const text = (targetEl && targetEl.value || '').trim();
    if (/[一-鿿㐀-䶿]/.test(text)) return 'zh-CN';
    const pageLang = (typeof currentLang !== 'undefined' ? currentLang : null)
                     || document.body.dataset.lang || 'en';
    if (pageLang === 'cn') return 'zh-CN';
    if ((navigator.language || '').toLowerCase().startsWith('zh')) return 'zh-CN';
    return 'en-US';
  }

  function createRecognizer(targetEl, btn) {
    let rec = null;
    let listening = false;   // a recognition session is running
    let committed = '';      // text already confirmed by previous sessions

    function setBtn(state) {
      btn.classList.toggle('recording', state === 'recording');
      btn.classList.toggle('voice-ready', state === 'ready');
      const titles = { idle: 'Voice input', recording: 'Listening…', ready: 'Tap to add more' };
      btn.title = titles[state] || 'Voice input';
    }

    function buildRec() {
      const r = new SpeechRecognition();
      r.lang = getLang(targetEl);
      r.continuous = !isMobile;      // continuous only on desktop
      r.interimResults = true;
      r.maxAlternatives = 1;

      r.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          e.results[i].isFinal ? (final += t) : (interim += t);
        }
        // Show interim inline; only commit final text
        targetEl.value = committed + final + interim;
        if (final) committed = committed + final;
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
      };

      r.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          // Permission denied — reset fully
          listening = false;
          committed = '';
          setBtn('idle');
        }
        // 'no-speech', 'aborted', network errors → let onend handle cleanup
      };

      r.onend = () => {
        listening = false;
        if (!isMobile) {
          // Desktop: auto-restart until user clicks stop
          if (rec === r) {
            try { r.start(); listening = true; } catch (_) { setBtn('idle'); }
          }
        } else {
          // Mobile: single shot done — show "tap to add more" if we got text
          setBtn(committed ? 'ready' : 'idle');
        }
      };

      return r;
    }

    function start() {
      committed = targetEl.value;
      rec = buildRec();
      try {
        rec.start();
        listening = true;
        setBtn('recording');
        const isChinese = rec.lang === 'zh-CN';
        btn.dataset.voiceLang = isChinese ? '中' : 'EN';
        btn.title = isChinese ? '正在听写：中文' : 'Listening: English';
      } catch (e) {
        listening = false;
        setBtn('idle');
      }
    }

    function stop() {
      const old = rec;
      rec = null;
      listening = false;
      setBtn('idle');
      delete btn.dataset.voiceLang;
      try { old && old.stop(); } catch (_) {}
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (listening) {
        stop();          // tap while recording → stop
      } else {
        start();         // tap while idle or "ready" → start new shot
      }
    });

    return { start, stop };
  }

  // ── Main chat input ──
  const chatBtn = document.getElementById('btnVoiceChat');
  const chatInput = document.getElementById('chaosInput');
  if (chatBtn && chatInput) {
    chatBtn.style.display = 'flex';
    createRecognizer(chatInput, chatBtn);
  }

  // Forge regen textarea: voice input removed — kept text-only for a
  // cleaner step-3 layout (mic stays on the homepage Share box only).
}
