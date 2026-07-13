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
      // 'nearest' (not 'center') — centering this field could push an
      // earlier field (e.g. username, right above the idea textarea)
      // above the top of the keyboard-shrunk viewport with no visible
      // trace it's still there. 'nearest' scrolls just enough to clear
      // the keyboard without yanking unrelated fields out of view.
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  // Icons use plain Unicode glyphs, not the Material Icons font — that font
  // was never loaded, so the old config rendered the literal text
  // "check_circle" / "error" inside every toast. Colours use the site's
  // warm editorial palette instead of generic Tailwind brights, so a toast
  // reads as part of THIS product rather than a bootstrapped library.
  const ico = (glyph) => ({ className: 'notyf-glyph', tagName: 'span', text: glyph });
  notyfInstance = new Notyf({
    duration: 4000,
    ripple: true,
    dismissible: true,   // let users close a toast instead of waiting it out
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'success', background: '#3a9a8c', icon: ico('✓') }, /* --teal */
      { type: 'error',   background: '#d4726a', icon: ico('✕'), duration: 6000 }, /* --coral, linger */
      { type: 'warning', background: '#d4a43c', icon: ico('!'), duration: 5000 }, /* --marigold */
      { type: 'info',    background: '#6a8eba', icon: ico('i') }  /* --periwinkle */
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

// ═══ CUSTOM CONFIRM DIALOG ═══
// Replaces native confirm() at real yes/no decision points. Native
// confirm() renders as an unstyled browser system dialog — the single
// most jarring "this looks like a prototype" moment in the whole product,
// since every other surface is custom-designed. Escape and backdrop-click
// both resolve false (cancel), matching the existing About/HowTo overlay
// convention. Returns a Promise<boolean> so call sites just `await` it
// where they used to do `if (confirm(msg))`.
function showConfirmDialog(message, opts = {}) {
  const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn') || document.body.dataset.lang === 'cn';
  const okLabel = opts.okLabel || (isCn ? '确定' : 'OK');
  const cancelLabel = opts.cancelLabel || (isCn ? '取消' : 'Cancel');

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-panel">
        <div class="confirm-message"></div>
        <div class="confirm-buttons">
          <button type="button" class="confirm-btn confirm-btn-cancel"></button>
          <button type="button" class="confirm-btn confirm-btn-ok"></button>
        </div>
      </div>
    `;
    // textContent, not innerHTML, for the message/labels — they may contain
    // user- or AI-derived text (skill titles) and must not be interpreted as HTML.
    overlay.querySelector('.confirm-message').textContent = message;
    overlay.querySelector('.confirm-btn-cancel').textContent = cancelLabel;
    overlay.querySelector('.confirm-btn-ok').textContent = okLabel;

    const cleanup = (result) => {
      overlay.classList.remove('active');
      document.removeEventListener('keydown', onKeydown);
      setTimeout(() => overlay.remove(), 250); // let the fade-out transition finish
      resolve(result);
    };
    const onKeydown = (e) => { if (e.key === 'Escape') cleanup(false); };

    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.confirm-btn-ok').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
  });
}

// Auto-detect API URL based on current domain
function getDefaultAPIUrl() {
  const stored = localStorage.getItem('42post_api_url');
  if (stored) return stored;

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  // For production (Zeabur, Vercel, etc), use the same domain
  return `${window.location.protocol}//${window.location.host}/api`;
}

const API_CONFIG = {
  BASE_URL: getDefaultAPIUrl(),
  TOKEN_KEY: '42post_jwt_token',
  USER_KEY: '42post_user',
  ANON_ID_KEY: '42post_anon_id'
};

function _getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function _setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
}

// Anonymous device ID — survives localStorage.clear() via cookie backup.
// Priority: localStorage → cookie → generate new (written to both).
function getAnonymousId() {
  const COOKIE_KEY = '42post_anon_id';
  try {
    let anonId = localStorage.getItem(API_CONFIG.ANON_ID_KEY) || _getCookie(COOKIE_KEY);
    if (!anonId) {
      anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    localStorage.setItem(API_CONFIG.ANON_ID_KEY, anonId);
    _setCookie(COOKIE_KEY, anonId, 365);
    return anonId;
  } catch (e) {
    // localStorage unavailable — try cookie, then fall back to session-scoped ID
    const cookieId = _getCookie(COOKIE_KEY);
    if (cookieId) return cookieId;
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
  // Auto-provisions a user on the backend if none exists. background is
  // optional (profession / field of study) — only ever set once per
  // identity, the backend won't overwrite an existing answer.
  async establishForgeSession(email, username, background) {
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/auth/forge-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, background })
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

// ═══ MINIMAL FUNNEL TRACKING ═══
// Fire-and-forget — never awaited by callers, never throws, never blocks
// the UI. A dropped analytics event should be invisible to a real user.
function trackEvent(eventName, metadata) {
  try {
    const anonId = (typeof getAnonymousId === 'function') ? getAnonymousId() : null;
    fetch(`${API_CONFIG.BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        page: window.location.pathname.replace(/^\//, '') || 'index.html',
        anonymous_id: anonId,
        metadata: metadata || null
      })
    }).catch(() => {});
  } catch (e) { /* tracking must never break the page */ }
}

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

/* ═══ i18n SYSTEM ═══
   The I18N dictionary lives in i18n.js (loaded before this file in every
   HTML page) — extracted as the first module split of this file. */

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

        let rawFiveLayer = {};
        try { rawFiveLayer = skill.five_layer ? JSON.parse(skill.five_layer) : {}; } catch { /* leave empty */ }
        const fiveLayer = normalizeFiveLayerShape(rawFiveLayer) || {};

        return {
        // Spread first so any field this whitelist doesn't know about
        // (applicable_when, disallowed_uses, published_at, ...) still
        // comes through instead of silently vanishing — the previous
        // version of this function built a brand-new object with no
        // spread, which is exactly how ready_to_use_prompt went missing
        // from every markdown/LangChain export for months.
        ...skill,
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
        // Top-level column, falling back to the copy normalizeFiveLayerShape
        // already pulled out of five_layer if that's the only place it lives.
        ready_to_use_prompt: skill.ready_to_use_prompt || fiveLayer.ready_to_use_prompt || '',
        five_layer: fiveLayer
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
          const buildLocalFallback = () => generateSkillFromIdea(window.forgeData.idea, window.forgeData.probeChoice);

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

            // 自动前往 Step 3 —— 之前这里需要用户再点一次"PROCEED TO
            // PUBLISH"才会走，但动画本身的视觉语言就是"进度条"，播完不
            // 自动前进会让人以为卡住了。复用同一个按钮的真实 click（而不是
            // 直接调 goToStep，那个函数在另一个闭包里，这里拿不到），和
            // 3922行"Auto Structure"那条路径走的是同一个套路。短暂停顿
            // 只是为了让"✓ Ready to forge"那一下被看到，不是必须的延迟。
            setTimeout(() => {
              const nextBtn = document.querySelector('.forge-next[data-next="3"]');
              if (nextBtn) nextBtn.click();
            }, 700);
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

// 客户端生成探针场景 - 聚焦语义资本最丰富的场景（价值观、创意、美学、艺术、设计、日常生活体验）
function generateClientSideProbe(idea) {
  console.log('↙ Using client-side fallback for probe generation - focused on semantic-rich scenarios');
  // Matches the session/idea language rather than assuming Chinese — found
  // hardcoded Chinese-only during a bilingual consistency audit, the same
  // class of bug as generateSkillFromIdea's fallback.
  const isCn = (document.body.dataset.lang === 'cn') || /[一-鿿]/.test(idea || '');

  if (!idea || idea.length === 0) {
    return isCn
      ? { context: "请先输入你的想法...", a: "主流派", b: "情景派", c: "实验派" }
      : { context: "Please enter your idea first...", a: "Mainstream", b: "Contextual", c: "Experimental" };
  }

  const ideaShort = idea.substring(0, 60) + (idea.length > 60 ? '...' : '');
  const lowerIdea = idea.toLowerCase();

  // 关键词检测 - 优先考虑语义资本最丰富的维度（中英文皆可触发）
  const hasDesign = /设计|美学|艺术|创意|视觉|形式|构图|色彩|排版|风格|质感|空间|布局|design|aesthetic|visual|composition|typography|texture|layout/.test(lowerIdea);
  const hasCreativity = /创意|创新|想象|灵感|独特|表达|原创|个性|革新|突破|creativ|innovat|imagin|inspir|original|breakthrough/.test(lowerIdea);
  const hasValues = /价值|信念|原则|意义|追求|理想|目标|使命|精神|哲学|value|belief|principle|meaning|ideal|mission|philosophy/.test(lowerIdea);
  const hasDaily = /日常|生活|日子|每天|习惯|体验|感受|经历|时刻|瞬间|daily|everyday|habit|routine|moment/.test(lowerIdea);
  const hasHuman = /关系|连接|共鸣|理解|陪伴|交流|社交|社区|归属|relationship|connection|resonance|companionship|community|belonging/.test(lowerIdea);

  // 基于语义资本最丰富的主题生成场景
  let context, a, b, c;

  if (hasDesign) {
    // 设计/美学场景 - 探索形式与功能、美感与实用的张力
    if (isCn) {
      context = `设计思考："${ideaShort}" 在这个设计决策中，AI应该如何权衡不同的维度？`;
      a = "主流派：遵循既有的设计系统和用户期待。保证可用、可预测、可信赖";
      b = "情景派：理解特定背景和用户场景。在熟悉中寻找惊喜，平衡优雅与实用";
      c = "实验派：挑战审美约定俗成。探索未见过的形式、材料和互动，有时刺激感知";
    } else {
      context = `Design thinking: "${ideaShort}" — in this design decision, how should AI weigh the different dimensions?`;
      a = "Mainstream: Follow established design systems and user expectations. Prioritize usable, predictable, trustworthy.";
      b = "Contextual: Understand the specific background and user scenario. Find surprise within the familiar, balancing elegance with practicality.";
      c = "Experimental: Challenge aesthetic convention. Explore unseen forms, materials, and interactions — sometimes jarring the senses.";
    }
  } else if (hasCreativity) {
    // 创意/想象场景 - 探索约束与自由、规则与破坏的对话
    if (isCn) {
      context = `创意表达："${ideaShort}" 在这个创意挑战中，AI的角色应该是什么？`;
      a = "主流派：提供已验证的最佳实践和参考。用已知的语言启发";
      b = "情景派：理解创作者的风格和意图。既给予框架，也留白想象";
      c = "实验派：鼓励打破常规，挖掘未知的可能性。有时引导进陌生领地";
    } else {
      context = `Creative expression: "${ideaShort}" — in this creative challenge, what should AI's role be?`;
      a = "Mainstream: Offer proven best practices and references. Inspire through a familiar language.";
      b = "Contextual: Understand the creator's style and intent. Offer structure while leaving room for imagination.";
      c = "Experimental: Encourage breaking convention, digging into the unknown — sometimes leading into unfamiliar territory.";
    }
  } else if (hasValues) {
    // 价值观/意义场景 - 探索个人信念与普遍原则的对话
    if (isCn) {
      context = `价值观反思："${ideaShort}" 这涉及深层的价值选择。AI应该如何参与这个对话？`;
      a = "主流派：尊重共识价值，提供稳定的立场参考";
      b = "情景派：承认多元性，帮助梳理不同视角下的权衡与张力";
      c = "实验派：质疑假设，挑战舒适的信念，有时引发不安";
    } else {
      context = `Values reflection: "${ideaShort}" — this touches a deep values choice. How should AI take part in this conversation?`;
      a = "Mainstream: Respect consensus values, offering a stable point of reference.";
      b = "Contextual: Acknowledge plurality, helping untangle the tradeoffs and tensions across different viewpoints.";
      c = "Experimental: Question assumptions, challenge comfortable beliefs — sometimes unsettling.";
    }
  } else if (hasDaily) {
    // 日常生活体验场景 - 探索寻常中的深意
    if (isCn) {
      context = `日常洞察："${ideaShort}" 这个日常时刻中，AI可以发现什么？`;
      a = "主流派：认可日常的价值。用清晰、实用的语言肯定现在";
      b = "情景派：看见细节中的诗意。连接眼前与更大的意义";
      c = "实验派：重新定义日常。用陌生化视角揭示隐藏的维度";
    } else {
      context = `Everyday insight: "${ideaShort}" — what can AI discover in this ordinary moment?`;
      a = "Mainstream: Affirm the value of the everyday. Validate the present in clear, practical language.";
      b = "Contextual: See the poetry in the details. Connect what's right in front of you to something larger.";
      c = "Experimental: Redefine the everyday. Reveal hidden dimensions through a defamiliarized lens.";
    }
  } else if (hasHuman) {
    // 人文/连接场景 - 探索个人与他人、自我与世界的关系
    if (isCn) {
      context = `人文视角："${ideaShort}" 这涉及人与人之间的联系。AI的介入会如何改变这种关系？`;
      a = "主流派：促进理解，用共同语言拉近距离";
      b = "情景派：深化对彼此独特性的认可。既连接也尊重差异";
      c = "实验派：重组关系框架。通过陌生的视角发现新的可能性";
    } else {
      context = `Human perspective: "${ideaShort}" — this involves a connection between people. How would AI's involvement change that relationship?`;
      a = "Mainstream: Foster understanding, closing distance through a shared language.";
      b = "Contextual: Deepen the recognition of each other's uniqueness — connecting while respecting difference.";
      c = "Experimental: Restructure the relational frame. Discover new possibilities through an unfamiliar lens.";
    }
  } else {
    // 默认场景 - 用户自由探索
    if (isCn) {
      context = `自由思考："${ideaShort}" 这个想法中，有哪些可能性值得AI去发掘？`;
      a = "主流派：用清晰、可靠的方式回应。遵循既有的语言和框架";
      b = "情景派：根据情境的微妙之处做出判断。既保持连贯也保留灵活";
      c = "实验派：探索边界。用意外的角度打开新的思维空间";
    } else {
      context = `Free exploration: "${ideaShort}" — what possibilities in this idea are worth AI uncovering?`;
      a = "Mainstream: Respond in a clear, reliable way, following existing language and frameworks.";
      b = "Contextual: Judge by the nuance of the situation — staying coherent while remaining flexible.";
      c = "Experimental: Explore the boundaries. Open new mental space through an unexpected angle.";
    }
  }

  return { context, a, b, c };
}

async function generateProbeScenarios(idea, onChunk) {
  const lang = document.body.dataset.lang || 'en';

  // ── Try streaming endpoint first ──
  if (typeof onChunk === 'function') {
    try {
      const probe = await _streamProbe(idea, lang, onChunk);
      if (probe && probe.scenario) {
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
  // content/tag now branch on language — found hardcoded Chinese-only
  // during a bilingual consistency audit. The caller already switches the
  // style/styleCN label by UI language, so a Chinese-only content string
  // produced an English label sitting above Chinese body text.
  const isCn = (document.body.dataset.lang === 'cn') || /[一-鿿]/.test(idea || scenario || '');

  if (!scenario || scenario.length === 0) {
    scenario = idea || (isCn ? "用户的想法" : "the user's idea");
  }

  const lowerIdea = (idea || scenario).toLowerCase();
  const hasEmotional = /悲伤|伤心|痛苦|难受|失去|去世|死亡|悼念|grief|sad|loss|sorrow|mourn|heartbreak|despair/.test(lowerIdea);
  const hasCreative = /创意|美感|设计|艺术|想象|审美|风格|creative|design|aesthetic|art|imagine|style|beauty/.test(lowerIdea);
  const hasEthics = /道德|伦理|正义|公平|偏见|歧视|诚实|ethics|moral|justice|fairness|bias|discrimination|honest/.test(lowerIdea);
  const hasPrivacy = /隐私|个人|秘密|保护|信任|安全|privacy|personal|secret|protect|trust|security/.test(lowerIdea);
  const hasHumor = /幽默|笑话|幽默感|开玩笑|趣味|humor|joke|funny|laugh|wit/.test(lowerIdea);

  let responses = [];

  if (hasEmotional) {
    responses = isCn ? [
      { label: "A", style: "Clinical", styleCN: "同理心", content: "我很遗憾听到你的消息。根据心理学研究，悲伤经历不同的阶段。如果你想讨论如何度过这段时期，或者需要一些实际的建议，我随时准备帮助。", tone: "supportive", tag: "[同理 + 建议]" },
      { label: "B", style: "Companionship", styleCN: "陪伴", content: "我听到你失去了重要的人。我在这里陪伴你。有时候，被倾听本身就足够了。你可以分享，也可以选择沉默。我都尊重你的节奏。", tone: "present", tag: "[陪伴 + 沉默]" },
      { label: "C", style: "Exploration", styleCN: "探索", content: "你能和我分享你和她的故事吗？她对你意味着什么？有哪些美好的回忆或未完成的事让你现在特别想起她？", tone: "exploratory", tag: "[好奇 + 反思]" }
    ] : [
      { label: "A", style: "Clinical", styleCN: "同理心", content: "I'm sorry to hear that. Grief moves through stages, the research says. If you want to talk through how to get through this, or want some practical guidance, I'm ready to help.", tone: "supportive", tag: "[empathy + advice]" },
      { label: "B", style: "Companionship", styleCN: "陪伴", content: "I hear that you've lost someone who mattered. I'm here with you. Sometimes being heard is enough on its own — you can share, or you can stay quiet. I'll follow your pace either way.", tone: "present", tag: "[companionship + silence]" },
      { label: "C", style: "Exploration", styleCN: "探索", content: "Could you tell me about your story with her? What did she mean to you? Are there particular memories, or things left unsaid, that are on your mind right now?", tone: "exploratory", tag: "[curiosity + reflection]" }
    ];
  } else if (hasCreative) {
    responses = isCn ? [
      { label: "A", style: "Conservative", styleCN: "规则派", content: "这是一个有趣的想法。让我们遵循已证明有效的创意原则：对比、层级、白空间。这些规则存在是有原因的。", tone: "cautious", tag: "[安全 + 最佳实践]" },
      { label: "B", style: "Balanced", styleCN: "平衡派", content: "我喜欢这个方向。我们可以融合个性和创新——在规则内打破期待。让我们找到既新鲜又尊重品味的方式。", tone: "encouraging", tag: "[创新 + 平衡]" },
      { label: "C", style: "Radical", styleCN: "激进派", content: "大胆！让我们放下常规的限制。什么是最疯狂、最颠覆、最有可能让人惊讶的方向？有时最好的创意来自于勇敢地违反期待。", tone: "bold", tag: "[颠覆 + 勇气]" }
    ] : [
      { label: "A", style: "Conservative", styleCN: "规则派", content: "That's an interesting idea. Let's follow creative principles that are proven to work: contrast, hierarchy, white space. These rules exist for a reason.", tone: "cautious", tag: "[safe + best practice]" },
      { label: "B", style: "Balanced", styleCN: "平衡派", content: "I like this direction. We can blend personality and innovation — breaking expectations within the rules. Let's find a way that feels fresh while still respecting good taste.", tone: "encouraging", tag: "[innovation + balance]" },
      { label: "C", style: "Radical", styleCN: "激进派", content: "Be bold! Let's set the usual constraints aside. What's the wildest, most disruptive, most surprising direction here? Sometimes the best creative work comes from daring to break expectations.", tone: "bold", tag: "[disruption + courage]" }
    ];
  } else if (hasEthics) {
    responses = isCn ? [
      { label: "A", style: "Neutral", styleCN: "中立派", content: "这是一个复杂的问题，有多个合理的观点。让我展示各种不同的立场，你可以根据自己的价值观做出判断。", tone: "balanced", tag: "[包容 + 多元]" },
      { label: "B", style: "Principled", styleCN: "原则派", content: "从道德原则的角度看，这涉及到[公平/诚实/尊重]。虽然情况复杂，但我认为重要的是保持这些核心原则。", tone: "firm", tag: "[清晰 + 坚守]" },
      { label: "C", style: "Uncompromising", styleCN: "无妥协派", content: "从道德的最高点看，答案很清楚。我们不能妥协基本的原则。虽然这可能让人不舒服，但正确的事往往需要勇气。", tone: "resolute", tag: "[明确 + 无懈可击]" }
    ] : [
      { label: "A", style: "Neutral", styleCN: "中立派", content: "This is a complex question with several reasonable viewpoints. Let me lay out the different positions so you can judge for yourself, based on your own values.", tone: "balanced", tag: "[inclusive + pluralistic]" },
      { label: "B", style: "Principled", styleCN: "原则派", content: "From a principled standpoint, this touches on [fairness/honesty/respect]. The situation is complicated, but I think it matters to hold onto these core principles.", tone: "firm", tag: "[clear + steadfast]" },
      { label: "C", style: "Uncompromising", styleCN: "无妥协派", content: "From the highest moral ground, the answer is clear. We cannot compromise on basic principles. It may be uncomfortable, but doing what's right often takes courage.", tone: "resolute", tag: "[decisive + uncompromising]" }
    ];
  } else if (hasPrivacy) {
    responses = isCn ? [
      { label: "A", style: "Functionality-First", styleCN: "功能优先", content: "用户体验很重要。让我们优先考虑让系统更便捷、更有用。在大多数情况下，透明的数据使用能增强功能。", tone: "pragmatic", tag: "[便捷 + 有用]" },
      { label: "B", style: "Balanced", styleCN: "平衡派", content: "隐私和功能都很重要。我们需要找到平衡点：充分的隐私保护，同时保留关键功能。这需要谨慎和透明的沟通。", tone: "thoughtful", tag: "[透明 + 谨慎]" },
      { label: "C", style: "Privacy-Absolute", styleCN: "隐私至上", content: "隐私是基本人权。即使牺牲一些功能，我们也要确保数据得到最严格的保护。用户应该完全控制自己的信息。", tone: "protective", tag: "[严格 + 坚定]" }
    ] : [
      { label: "A", style: "Functionality-First", styleCN: "功能优先", content: "User experience matters. Let's prioritize making the system more convenient and useful. In most cases, transparent data use actually strengthens functionality.", tone: "pragmatic", tag: "[convenient + useful]" },
      { label: "B", style: "Balanced", styleCN: "平衡派", content: "Both privacy and functionality matter. We need to find the balance: real privacy protection while keeping the essential features. That takes careful, transparent communication.", tone: "thoughtful", tag: "[transparent + careful]" },
      { label: "C", style: "Privacy-Absolute", styleCN: "隐私至上", content: "Privacy is a basic right. Even if it costs some functionality, we should make sure data gets the strictest protection. Users should have full control over their own information.", tone: "protective", tag: "[strict + firm]" }
    ];
  } else if (hasHumor) {
    responses = isCn ? [
      { label: "A", style: "Safe", styleCN: "安全派", content: "让我用温和的、通用的幽默。这种方式安全可靠，不太可能冒犯任何人。有时候，简单的文字游戏最有效。", tone: "gentle", tag: "[温和 + 无害]" },
      { label: "B", style: "Smart", styleCN: "聪慧派", content: "我可以理解你的观众，用更聪慧的幽默。让我们冒一点风险，但有针对性和精准性。这样的幽默更有趣。", tone: "witty", tag: "[相关 + 精准]" },
      { label: "C", style: "Edgy", styleCN: "锋利派", content: "让我们大胆一点。黑色幽默、尖锐讽刺，甚至一点冒犯的边缘。最令人难忘的笑话往往来自敢于挑战。", tone: "daring", tag: "[锋利 + 记忆深刻]" }
    ] : [
      { label: "A", style: "Safe", styleCN: "安全派", content: "Let me go with gentle, universal humor. It's safe and reliable, unlikely to offend anyone. Sometimes a simple play on words works best.", tone: "gentle", tag: "[gentle + harmless]" },
      { label: "B", style: "Smart", styleCN: "聪慧派", content: "I can read your audience and use sharper, smarter humor. Let's take a small risk, but a targeted and precise one — that kind of humor lands better.", tone: "witty", tag: "[relevant + precise]" },
      { label: "C", style: "Edgy", styleCN: "锋利派", content: "Let's go bold. Dark humor, sharp satire, even a little right at the edge of offensive. The most memorable jokes usually come from daring to push back.", tone: "daring", tag: "[edgy + memorable]" }
    ];
  } else {
    // 默认场景
    responses = isCn ? [
      { label: "A", style: "Mainstream", styleCN: "主流派", content: "这是一个标准的场景。让我采用广泛接受的、经过验证的方式。可靠和一致是首要任务。", tone: "conventional", tag: "[保守 + 可靠]" },
      { label: "B", style: "Contextual", styleCN: "情景派", content: "让我们考虑具体情境。每个情况都有细微差别。我会根据你的具体需求和背景做出更有针对性的回应。", tone: "adaptive", tag: "[灵活 + 思考]" },
      { label: "C", style: "Experimental", styleCN: "实验派", content: "让我们探索极限。有时最好的解决方案来自于质疑假设。你愿意冒一些风险来获得创新吗？", tone: "adventurous", tag: "[激进 + 风险]" }
    ] : [
      { label: "A", style: "Mainstream", styleCN: "主流派", content: "This is a standard scenario. Let me take the widely accepted, proven approach. Reliability and consistency come first.", tone: "conventional", tag: "[conservative + reliable]" },
      { label: "B", style: "Contextual", styleCN: "情景派", content: "Let's consider the specific context. Every situation has its nuances. I'll tailor my response to your actual needs and background.", tone: "adaptive", tag: "[flexible + thoughtful]" },
      { label: "C", style: "Experimental", styleCN: "实验派", content: "Let's push the edges. Sometimes the best solution comes from questioning assumptions. Are you willing to take some risk for the sake of innovation?", tone: "adventurous", tag: "[bold + risk]" }
    ];
  }

  return { responses };
}

/* ═══ SKILL FORGE WORKFLOW (V2.0 with Knight Card) ═══ */
function initSkillForge() {
  const overlay = document.getElementById('forgeOverlay');
  const slot00 = document.getElementById('slot00');
  const closeBtn = document.getElementById('forgeClose');
  let selectedDomain = null;

  // ── Mobile keyboard: prevent layout jump when keyboard appears/dismisses ──
  // visualViewport API tracks the actual visible area (shrinks when keyboard opens).
  // We pin the overlay height to the visual viewport so it never reflows.
  const KEYBOARD_SCROLL_FIELDS = ['forgeUsername', 'forgeEmail', 'forgeBackground', 'forgeSkillIdea', 'skillFeedback'];
  if (window.visualViewport) {
    function onViewportResize() {
      const vv = window.visualViewport;
      if (overlay && overlay.classList.contains('active')) {
        overlay.style.height = vv.height + 'px';
        overlay.style.top = vv.offsetTop + 'px';
        // The keyboard's open animation fires several of these resize events
        // in a row as it slides up. A field scrolled into view against an
        // earlier (still-tall) reading of the viewport can end up re-hidden
        // once the keyboard finishes settling. Re-align on every event so
        // the correction tracks the real viewport instead of a guessed delay.
        const active = document.activeElement;
        if (active && KEYBOARD_SCROLL_FIELDS.includes(active.id)) {
          active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
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

  // forgeUsername/forgeEmail/forgeBackground never got the same keyboard
  // treatment as the textareas above — real user report: tapping Username
  // (the first field, nearest the top of the modal) left it scrolled to a
  // barely-visible sliver above the keyboard, with no custom scroll to
  // correct it, only the browser's default focus-scroll.
  ['forgeUsername', 'forgeEmail', 'forgeBackground'].forEach((id) => {
    scrollIntoViewOnFocus(document.getElementById(id));
  });

  // ─── Draft Recovery: offer to restore an unsubmitted forge ───
  // If the previous session's POST /skills failed (network drop, 5xx)
  // we kept their work in localStorage. Offer to restore it here.
  async function maybeOfferDraftRecovery() {
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

    if (await showConfirmDialog(msg)) {
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

        // 键盘胡乱敲击的字母种类往往不少（手指扫过相邻按键），单靠
        // "字母多样性"拦不住，比如 "dfgfhjkhljhjghfdfssafghjgkhljhjgfdsasfgdhjklhjghfgdf"
        // 有 9 种不同字母也能通过上面的检查。更可靠的信号：真实单词的
        // 连续辅音长度有限（英语最长大约 4-5，如 "strengths" 的
        // "ngth"），键盘乱码常见远超此长度的连续辅音串。
        const longestConsonantRun = (text.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]+/g) || [])
          .reduce((max, run) => Math.max(max, run.length), 0);
        if (longestConsonantRun >= 6) return false;
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
      // btnEnterForge's own click handler (a manual "proceed now" path,
      // parallel to the 600ms auto-advance below) reads window.shareIdea,
      // not window.homepageIdea — was never set here, so the idea silently
      // vanished for anyone who clicked the visible button instead of
      // waiting out the timer. Both paths now carry the same value.
      window.shareIdea = ideaInput.value.trim();

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
    trackEvent('forge_step1_started');
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
      const background = document.getElementById('forgeBackground')?.value.trim() || '';
      const idea = document.getElementById('forgeSkillIdea').value.trim();
      const probeChoice = window.probeChoice || (window.forgeData?.probeChoice);

      // 验证 (Domain selection moved to Step 2)
      if (!username) { alertI18n('error_enter_username'); return; }
      if (!email) { alertI18n('error_enter_email'); return; }
      // Background is required, not optional: it feeds the contributor-
      // diversity metric (docs/HYPOTHESES H1) — without it the corpus
      // cannot show who is actually represented in it.
      if (!background) { alertI18n('error_enter_background'); return; }
      if (!idea) { alertI18n('error_share_idea'); return; }
      // Same quality gate the homepage share box uses (length + keyboard-
      // mash detection) — this entry point had none at all, so gibberish
      // like keyboard-mashed text could reach probe generation (a real
      // LLM call) unfiltered.
      if (idea.length < 12) { alertI18n('error_idea_too_short'); return; }
      if (!isContentMeaningful(idea)) { alertI18n('error_idea_not_meaningful'); return; }
      if (!probeChoice) { alertI18n('error_select_probe_response'); return; }

      // Establish forge session (zero-friction JWT)
      btnForgeBegin.disabled = true;
      const sess = await ApiClient.establishForgeSession(email, username, background);
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
      const background = document.getElementById('forgeBackground')?.value.trim() || '';
      const idea = document.getElementById('forgeSkillIdea').value.trim();

      if (!username) { alertI18n('error_enter_username'); return; }
      if (!email) { alertI18n('error_enter_email'); return; }
      // Background is required, not optional: it feeds the contributor-
      // diversity metric (docs/HYPOTHESES H1) — without it the corpus
      // cannot show who is actually represented in it.
      if (!background) { alertI18n('error_enter_background'); return; }
      if (!idea) { alertI18n('error_share_idea'); return; }
      // Same quality gate the homepage share box uses (length + keyboard-
      // mash detection) — this entry point had none at all, so gibberish
      // like keyboard-mashed text could reach probe generation (a real
      // LLM call) unfiltered.
      if (idea.length < 12) { alertI18n('error_idea_too_short'); return; }
      if (!isContentMeaningful(idea)) { alertI18n('error_idea_not_meaningful'); return; }

      // Establish forge session (zero-friction JWT)
      const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
      const originalText = btnGenerateProbe.textContent;

      btnGenerateProbe.disabled = true;
      btnGenerateProbe.textContent = isCn ? '⟳ 正在思考中...' : '⟳ Thinking...';

      const sess = await ApiClient.establishForgeSession(email, username, background);
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
      // Back to the neutral "pick one above" state for this fresh round of
      // choices - #probeConfirmation itself stays visible (see markup),
      // only its prompt/selected-text/button toggle.
      document.getElementById('probeSelectPrompt')?.style.removeProperty('display');
      const selectedTextReset1 = document.getElementById('probeSelectedText');
      if (selectedTextReset1) selectedTextReset1.style.display = 'none';
      const proceedBtnReset1 = document.getElementById('btnProceedToForge');
      if (proceedBtnReset1) proceedBtnReset1.disabled = true;

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

      trackEvent('forge_probe_generated');

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

      // Reset selection state — same neutral state as the other reset
      // point above, #probeConfirmation itself stays visible.
      document.querySelectorAll('.probe-choice').forEach(c => c.classList.remove('selected'));
      document.getElementById('probeSelectPrompt')?.style.removeProperty('display');
      const selectedTextReset2 = document.getElementById('probeSelectedText');
      if (selectedTextReset2) selectedTextReset2.style.display = 'none';
      const proceedBtnReset2 = document.getElementById('btnProceedToForge');
      if (proceedBtnReset2) proceedBtnReset2.disabled = true;

      // Modal already opened at stream start
      if (probeModal) probeModal.style.display = 'flex';
    });
  }

  // Reads the user's domain pick, or blocks and prompts for one. No domain
  // starts pre-selected (see index.html) — an unpicked domain used to
  // silently fall back to 'ideas', which meant a creator could publish
  // without ever having chosen a category themselves.
  function getSelectedDomainOrPrompt() {
    const domain = document.querySelector('.domain-choice.selected');
    if (!domain) {
      alertI18n('error_select_domain');
      return null;
    }
    return domain.dataset.domain;
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

      // Swap the neutral "pick one above" prompt for the real selection,
      // and enable the button it was already disabling (see reset points
      // above, and the disabled-by-default markup) rather than revealing
      // a whole confirmation block that wasn't there a moment ago.
      const selectionLabel = document.getElementById('probeSelectionLabel');
      const selectPrompt = document.getElementById('probeSelectPrompt');
      const selectedText = document.getElementById('probeSelectedText');
      if (selectionLabel) selectionLabel.textContent = labels[selectedChoice];
      if (selectPrompt) selectPrompt.style.display = 'none';
      if (selectedText) selectedText.style.display = 'inline';
      const proceedBtn = document.getElementById('btnProceedToForge');
      if (proceedBtn) proceedBtn.disabled = false;
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
      const selectedDomainValue = getSelectedDomainOrPrompt();
      if (!selectedDomainValue) return;

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
        // Regeneration produces a new server-side draft — track the latest
        // so edit distance measures edits after the LAST AI generation.
        if (newSkill.draft_id) window.agent42DraftId = newSkill.draft_id;

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
      if (!document.querySelector('.domain-choice.selected')) {
        alertI18n('error_select_domain');
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
        // 生成五层结构 (domain already validated as selected, above)
        const selectedDomain = document.querySelector('.domain-choice.selected').dataset.domain;

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
        // draft_id: server-stored AI draft; sent back at publish so the
        // backend can derive generation_source + edit distance (research).
        if (fiveLayerData.draft_id) window.agent42DraftId = fiveLayerData.draft_id;

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
        // Reaching this modal already required a domain pick in btnPreviewSkill above.
        const selectedDomain = document.querySelector('.domain-choice.selected')?.dataset.domain || 'ideas';

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
        if (newSkill.draft_id) window.agent42DraftId = newSkill.draft_id;

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
        alertI18n('error_probe_generation');
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
        const backgroundInput = document.getElementById('forgeBackground');
        const emailValue = emailInput ? emailInput.value.trim() : '';
        const usernameValue = usernameInput ? usernameInput.value.trim() : '';
        const backgroundValue = backgroundInput ? backgroundInput.value.trim() : '';

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
            const sess = await ApiClient.establishForgeSession(emailValue, usernameValue, backgroundValue);
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
              if (d && d.draft_id) window.agent42DraftId = d.draft_id;
              const skill = d && (d.data || d);
              return isEmptyLayer(skill) ? null : skill;
            };

            // Attempt 1 — automatic
            publishBtn.textContent = cnUI ? '⟳ 正在补全 Skill 结构…' : '⟳ Completing skill structure…';
            try { effectiveFiveLayer = await tryRegenerate(); } catch (e) { effectiveFiveLayer = null; }

            // Attempt 2 — user-approved retry
            if (isEmptyLayer(effectiveFiveLayer)) {
              const retry = await showConfirmDialog(cnUI
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
            probe_session_id: window.agent42ProbeSessionId || null,
            // draft_id: the server-stored AI draft this publish came from —
            // backend derives generation_source + draft_edit_ratio from it.
            draft_id: window.agent42DraftId || null
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

          const response = await fetch(`${API_CONFIG.BASE_URL}/skills`, {
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
        await saveForgedSkill(forgedSkillData);

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
  trackEvent('forge_published', { domain: skillData?.domain || null });
  const completionSection = document.getElementById('forgeCompletionSection');
  const forgeCreatorRights = document.querySelector('.forge-creator-rights');
  const forgeOath = document.querySelector('.forge-oath');
  const forgeNav = document.querySelector('.forge-nav');
  const skillPackageSection = document.getElementById('skillPackageSection');

  // ── Step 1: Hide forge form immediately ──
  if (forgeCreatorRights) forgeCreatorRights.style.display = 'none';
  if (forgeOath) forgeOath.style.display = 'none';
  if (forgeNav) forgeNav.style.display = 'none';
  if (skillPackageSection) skillPackageSection.style.display = 'none';

  // ── Step 2: Show and populate the completion section (card DOM must exist
  //    before blessing fetch, prerender, and email can run) ──
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
        // Lets Playground's 7-scenario farewell card skip the "go forge
        // your own Skill" invite for someone who just did exactly that.
        params.set('from', 'forge');
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

  // ── Step 3: Blessing + prerender + email ──
  // Card DOM now exists. The flow is sequential so the PNG rendered for
  // the download button and for the email are identical and both contain
  // the final AI blessing (not the fallback placeholder).
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

  const _blessingEl = document.getElementById('cardBlessing');
  if (_blessingEl) _blessingEl.textContent = _fallbackLine;

  // Start rendering the card NOW, with the fallback blessing already in the
  // DOM — do not wait for the AI blessing fetch first. Card render (html2canvas
  // + the sRGB-neutralizing DOM walk) plus the AI blessing fetch used to be
  // chained sequentially, which could take long enough on a real phone that
  // by the time a user taps "Download" moments after publishing, this was
  // still in flight — and awaiting it inside the click handler burns the
  // "user activation" window Safari/Chrome require for navigator.share() to
  // work, silently falling back to <a download> (does nothing on mobile
  // Safari, or saves to Files instead of Photos). Rendering immediately in
  // parallel with the blessing fetch means it's very likely already done by
  // the time the button is tapped. If the real AI blessing arrives and
  // differs from the fallback, a second render replaces this one below —
  // that one only gates the EMAIL send, which already tolerates a multi-
  // second wait and isn't subject to the user-gesture timing constraint.
  _cardRenderCache = { soulHash, promise: renderCreatorCardBlob(soulHash).catch(() => null) };

  // Fetch AI blessing
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

  // Background job: wait for blessing → update DOM → render card → send email.
  // A single render is shared between the "Download" button and the email so
  // both contain the real AI blessing text, not the placeholder fallback.
  (async () => {
    // 3a. Wait for blessing (up to 3.5 s), then commit it to the card DOM
    const blessing = await Promise.race([
      _blessingPromise,
      new Promise(r => setTimeout(() => r(_fallbackLine), 3500))
    ]);
    if (_blessingEl) _blessingEl.textContent = blessing;

    // 3b. Only re-render if the real AI blessing actually differs from the
    //     fallback already baked into the prerender kicked off above — no
    //     point redoing the same html2canvas work for identical DOM content,
    //     and this keeps the Download button's cache valid the instant the
    //     prerender resolves rather than getting invalidated by an identical
    //     re-render race.
    if (blessing !== _fallbackLine) {
      _cardRenderCache = { soulHash, promise: renderCreatorCardBlob(soulHash).catch(() => null) };
    }

    // 3c. If email is needed, wait for the render then send with the PNG.
    if (skillData && skillData.email) {
      try {
        const emailSkillTitle = skillData.title || skillData.titleCn || 'Unnamed Skill';
        const emailSoulHash = soulHash || skillData.soulHash || skillData.soul_hash || 'SOUL_UNKNOWN';
        const emailSkillId = skillData.id || skillData.backendId;

        if (!emailSkillTitle || !emailSoulHash) {
          console.warn('⚠️ Missing required email fields:', { title: emailSkillTitle, hash: emailSoulHash });
          showEmailStatusBanner({ success: false, error: 'Skill title or soul-hash missing for email' }, skillData.email);
          return;
        }

        // Wait up to 8 s for the render; fall back to HTML card if it times out
        const cardResult = await Promise.race([
          _cardRenderCache.promise,
          new Promise(r => setTimeout(() => r(null), 8000))
        ]);

        let cardImageBase64 = null;
        if (cardResult && cardResult.blob) {
          try { cardImageBase64 = await blobToBase64(cardResult.blob); } catch (_) {}
        }

        const emailResult = await sendForgeSuccessEmail({
          recipientEmail: skillData.email,
          recipientName: skillData.author || skillData.username,
          skillTitle: emailSkillTitle,
          skillId: emailSkillId,
          soulHash: emailSoulHash,
          createdDate: new Date().toISOString(),
          domain: skillData.domain || 'ideas',
          blessing,
          cardImageBase64
        });

        showEmailStatusBanner(emailResult, skillData.email);
      } catch (err) {
        console.error('Email sending failed:', err.message);
        showEmailStatusBanner({ success: false, error: err.message }, skillData.email);
      }
    }
  })();
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

// Builds a detached, off-screen clone of the card for html2canvas. Keeps
// the original class (and data-domain attribute) so the clone is styled
// by the same stylesheet rules as the live card — color-mix()/html2canvas
// incompatibility is handled separately by neutralizeDescendantSrgbColors(),
// which runs on this clone right after and covers the root element too.
//
// This used to also freeze the root's *entire* computed style inline (every
// property getComputedStyle reports, not just the ones commemorative-card's
// own rule declares) and strip the class. That silently broke inherited
// typography: getComputedStyle resolves `line-height` to an absolute px
// value derived from the root's own font-size, and inlining it overrides
// the cascade for every descendant that doesn't set its own line-height
// (.sq-bottom-row, .sq-hash-line, .sq-meta-line, .sq-domain-pill, .sq-top) —
// each line rendered ~2x tall, pushing the "www.the42post.com" row past the
// card's fixed height and out through `overflow: hidden`. That was the
// downloaded/emailed Creator Card's bottom-truncation bug.
function buildCaptureClone(cardElement) {
  const clone = cardElement.cloneNode(true);
  // cloneNode(true) copies every descendant id verbatim (e.g. #cardSoulHash),
  // so while this clone is attached below, the document briefly has two
  // elements sharing each id. html2canvas only needs styles, not ids, so
  // strip them rather than leave a real (if normally short-lived) duplicate-
  // id violation for anything else that queries by id during that window.
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);

  return clone;
}

/* ═══ DOWNLOAD CREATOR CARD ═══ */
// Cache of the in-flight/completed card render, keyed by soulHash, so the
// click handler can reuse a render kicked off eagerly the moment the card
// appeared — see showForgeCompletion()'s Step 3, which populates this the
// instant the fallback blessing is in the DOM. This matters because
// html2canvas plus the color-neutralizing DOM walk can take long enough on
// a real phone that navigator.share(), if only called after that work
// finishes, loses the "user activation" Safari/Chrome require for it. It
// then silently falls through to the <a download> path, which on mobile
// Safari either does nothing visible or saves into the Files app instead
// of Photos — the exact "can't download to my phone" complaint that
// preferring Web Share was already meant to solve.
let _cardRenderCache = null; // { soulHash, promise: Promise<{blob, filename}> }

// Convert a Blob to a base64 data-URI string (e.g. "data:image/png;base64,...")
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function renderCreatorCardBlob(soulHash) {
  const cardElement = document.querySelector('.commemorative-card');
  if (!cardElement) throw new Error('card_not_found');
  if (typeof html2canvas === 'undefined') throw new Error('card_library_not_loaded');

  const clone = buildCaptureClone(cardElement);
  const restoreDescendantColors = neutralizeDescendantSrgbColors(clone);
  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true
    });
    const filename = `Creator_Card_${soulHash || 'certificate'}.png`;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return { blob, filename };
  } finally {
    restoreDescendantColors();
    clone.remove();
  }
}

// Mobile fallback for when Web Share isn't available or fails: a plain
// <a download> on a blob: URL either does nothing visible (older mobile
// Safari) or saves into the Files app rather than Photos (current Safari)
// — neither is what someone asking to save a picture expects. Showing the
// image directly lets them use the OS's native long-press "Save Image",
// the one mechanism that reliably lands in Photos everywhere.
function showSaveImageOverlay(blob) {
  const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
  const url = URL.createObjectURL(blob);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,16,12,0.94);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:16px;';
  const hint = isCn
    ? '👆 长按图片 → 选择「存储图像」即可保存到相册'
    : '👆 Long-press the image → choose "Save Image" to add it to Photos';
  overlay.innerHTML = `
    <img src="${url}" style="max-width:100%;max-height:60vh;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,0.4);" />
    <div style="background:rgba(240,232,220,0.12);border:1px solid rgba(240,232,220,0.25);border-radius:10px;padding:12px 18px;max-width:320px;text-align:center;">
      <p style="color:#f0e8dc;font-size:15px;line-height:1.65;margin:0;font-weight:500;">${hint}</p>
    </div>
    <button type="button" style="background:#f0e8dc;color:#1a1410;border:none;border-radius:20px;padding:10px 32px;font-size:13px;cursor:pointer;letter-spacing:0.5px;">${isCn ? '关闭' : 'Close'}</button>
  `;
  const close = () => { overlay.remove(); URL.revokeObjectURL(url); };
  overlay.querySelector('button').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
}

async function downloadCreatorCard(skillData, soulHash) {
  const btn = event?.target;
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '⏳ Processing...'; btn.disabled = true; }
  const restoreBtn = () => { if (btn) { btn.textContent = originalText; btn.disabled = false; } };

  try {
    // Reuse the eager pre-render when it matches this card; otherwise
    // render now (covers a very fast click, before prerender finished).
    const cached = (_cardRenderCache && _cardRenderCache.soulHash === soulHash)
      ? await _cardRenderCache.promise
      : null;
    const { blob, filename } = cached || await renderCreatorCardBlob(soulHash);

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // iOS: skip the system share sheet — it buries "Save Image" in a
    // non-obvious row. The long-press overlay gives a clear direct path
    // to the Photos app that users can actually find.
    if (isIOS) {
      showSaveImageOverlay(blob);
      restoreBtn();
      return;
    }

    // Android / other mobile: prefer Web Share if available, overlay as fallback.
    const file = new File([blob], filename, { type: 'image/png' });
    if (isMobile) {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'THE 42 POST — Creator Card' });
          restoreBtn();
          return;
        } catch (shareError) {
          if (shareError?.name === 'AbortError') { restoreBtn(); return; }
        }
      }
      showSaveImageOverlay(blob);
      restoreBtn();
      return;
    }

    // Desktop: a plain <a download> on a blob: URL works reliably here.
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    restoreBtn();
  } catch (error) {
    console.error('Failed to generate card image:', error);
    if (error?.message === 'card_not_found') alertI18n('error_card_not_found');
    else if (error?.message === 'card_library_not_loaded') alertI18n('error_card_library_not_loaded');
    else alertI18n('error_card_generation');
    restoreBtn();
  }
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

      if (skillNameEl && card) skillNameEl.value = card.text.substring(0, 60);
      if (nativeTextEl && card) nativeTextEl.value = card.text;

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
    // Must match the length check in btnTest's own click handler below -
    // this is purely a live preview of that same gate, not a second rule.
    const MIN_IDEA_CHARS = 12;

    // Click anywhere on the sheet (except footer buttons) → focus the pen
    if (chatBubbleWrap) {
      chatBubbleWrap.addEventListener('click', (e) => {
        if (!e.target.closest('.chat-bubble-footer')) chaosInput.focus();
      });
    }

    const syncSheet = () => {
      const trimmedLen = chaosInput.value.trim().length;
      const hasText = trimmedLen > 0;
      const tooShort = hasText && trimmedLen < MIN_IDEA_CHARS;
      chatBubblePlaceholder.classList.toggle('hidden', hasText);
      chaosInput.parentElement.classList.toggle('has-content', hasText);
      // Share is the only way to submit — disabled on an empty sheet
      if (shareBtn) shareBtn.disabled = !hasText;
      // Quiet counter appears once writing starts. Below the minimum, show
      // how many characters are still needed instead of the X/2000 count -
      // the same "too short" rule the Share click already enforces, just
      // visible while typing instead of only after a rejected click.
      if (charCount) {
        const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
        if (!hasText) {
          charCount.textContent = '';
        } else if (tooShort) {
          const remaining = MIN_IDEA_CHARS - trimmedLen;
          charCount.textContent = isCn ? `还差 ${remaining} 字` : `${remaining} more to go`;
        } else {
          charCount.textContent = `${chaosInput.value.length} / ${MAX_CHARS}`;
        }
        charCount.classList.toggle('too-short', tooShort);
      }
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
async function saveForgedSkill(skillData) {
  // NOTE: Quality validation is handled by backend moderation system
  // Local storage is only a cache - no need for strict validation here

  // ═══ DUPLICATE CHECK ═══
  const duplicateCheck = checkDuplicateSkill(skillData.title);
  if (duplicateCheck.isDuplicate) {
    const isCn = typeof currentLang !== 'undefined' && currentLang === 'cn';
    const msg = isCn
      ? `技能 "${skillData.title}" 已存在(${duplicateCheck.location})。\n要继续吗？`
      : `Skill "${skillData.title}" already exists (${duplicateCheck.location}).\nContinue anyway?`;
    if (!(await showConfirmDialog(msg))) {
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

// ═══ SINGLE SOURCE OF TRUTH for five-layer shape + ready_to_use_prompt ═══
// This used to be reimplemented separately in three places — loadSkillsFromDB(),
// initAgentArchiveView()'s baseSkills.map(), and this function under its old
// name normalizeFiveLayerForExport() — each maintained independently, each
// drifting slightly from the others. That's exactly why ready_to_use_prompt
// went missing from markdown exports for months: it was added to one of the
// three copies and never to the other two. Every caller that touches raw
// five_layer data should go through THIS function instead of reimplementing
// shape detection again.
//
// Five-layer data exists in 3 different shapes across real skills: rich
// (principle/exemplars/boundaries as real objects — older/seed skills), an
// older structured shape (instantiating/fencing as objects), and the
// current shape from generateFlatFiveLayerWithClaude (the live forge path),
// where every layer — including ready_to_use_prompt — is just a plain
// string or sits as a sibling field. Reading raw five_layer directly skips
// the second and third shapes — every real field comes back undefined and
// the UI shows nothing but placeholder text even though the skill has real
// content. Mirrors normalizeFiveLayer() in backend/routes/downloads.js so
// both the frontend and backend export paths treat the same data the same
// way (those two can't literally share code — no build step, different
// runtimes — but they should never again diverge in BEHAVIOR).
function normalizeFiveLayerShape(fl) {
  if (!fl) return null;
  const readyToUsePrompt = (typeof fl.ready_to_use_prompt === 'string' && fl.ready_to_use_prompt) || '';

  if (fl.principle || fl.reasoning || (Array.isArray(fl.exemplars) && fl.exemplars.length)) {
    return {
      principle: fl.principle || fl.defining || '',
      reasoning: fl.reasoning || '',
      exemplars: Array.isArray(fl.exemplars) ? fl.exemplars : [],
      boundaries: fl.boundaries || null,
      evaluation: fl.evaluation || null,
      cultural_variants: fl.cultural_variants || null,
      contextualizing: fl.contextualizing || '',
      ready_to_use_prompt: readyToUsePrompt,
      // Old-format field names, kept as echoes — a couple of older call
      // sites (e.g. playground.html's getSkillPrincipleLine) still check
      // these directly as a fallback before falling further back to
      // skill.description.
      defining: fl.defining || fl.principle || '',
      instantiating: fl.instantiating || '',
      fencing: fl.fencing || '',
      validating: fl.validating || []
    };
  }

  if (fl.instantiating && typeof fl.instantiating === 'object') {
    // Older structured shape — kept for any legacy data that still has it.
    return { ...fl, ready_to_use_prompt: readyToUsePrompt };
  }

  // Current flat-string shape — what generateFlatFiveLayerWithClaude
  // actually writes for every Skill forged through the live product today.
  const exemplars = (typeof fl.instantiating === 'string' && fl.instantiating.trim())
    ? [{ label: '', text: fl.instantiating.trim(), note: '' }]
    : [];

  const boundaries = (typeof fl.fencing === 'string' && fl.fencing.trim()) ? {
    applies_when: [fl.fencing.trim()],
    does_not_apply: [],
    tension_zones: []
  } : null;

  const evaluation = (typeof fl.validating === 'string' && fl.validating.trim()) ? {
    metric: '',
    test_cases: [{ prompt: '', expected: fl.validating.trim(), pass_criteria: '' }],
    silent_failures: []
  } : null;

  return {
    principle: fl.defining || fl.definition || '',
    reasoning: '',
    exemplars,
    boundaries,
    evaluation,
    cultural_variants: null,
    contextualizing: (typeof fl.contextualizing === 'string' && fl.contextualizing) || '',
    ready_to_use_prompt: readyToUsePrompt,
    defining: fl.defining || '',
    instantiating: fl.instantiating || '',
    fencing: fl.fencing || '',
    validating: fl.validating || []
  };
}

// Generate human-readable SKILL.md format
function generateSkillMarkdown(skillData) {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const fiveLayer = normalizeFiveLayerShape(skillData.fiveLayerSkill || null);

  // Follows the CURRENT viewer's UI language toggle, not the skill's own
  // forging language — downloading from a Chinese-UI session should give
  // Chinese labels even for a Skill originally forged in English, and
  // vice versa. Generated content (principle/exemplars/etc) stays in
  // whatever language it was actually generated in; only the structural
  // labels below are translated.
  const isCn = document.body.dataset.lang === 'cn';

  // Use full soul_hash for markdown export
  const fullSoulHash = skillData.soul_hash || skillData.soulHash || 'SOUL_UNKNOWN';
  const shortSoulHash = fullSoulHash.substring(0, 14);
  const creatorName = skillData.created_by || skillData.author || 'The 42 Post Community';

  // Fallback chain: top-level field → the same field nested inside
  // five_layer (normalizeFiveLayerShape already extracted it from
  // whichever shape it actually lives in) → synthesize a minimal one from
  // the principle → a last-resort placeholder.
  const readyPrompt = skillData.ready_to_use_prompt
    || fiveLayer?.ready_to_use_prompt
    || (fiveLayer?.principle
        ? (isCn ? `请遵循以下原则：\n\n${fiveLayer.principle}` : `Apply the following principle:\n\n${fiveLayer.principle}`)
        : (isCn ? '系统提示词将在锻造完成后生成' : 'System prompt to be generated during skill forging'));

  const L = isCn ? {
    by: '创作者', readyTitle: '🚀 直接可用的提示词', readyHint: '复制下面的内容，直接粘贴到你常用的 AI 对话框作为系统提示词：',
    about: '📖 关于这个 Skill', aboutFallback: '这是在 THE 42 POST 锻造的一个 Skill，用结构化的方式提升 AI 的推理和表达质量。',
    metaTitle: '📋 Skill 信息', field: '字段', value: '内容', creator: '创作者', created: '创建日期', version: '版本', protocol: '协议', license: '授权',
    frameworkTitle: '✨ 完整五层结构',
    layer1: '🎯 第一层：核心原则', layer1Fallback: '这个 Skill 的核心原则', reasoning: '为什么',
    layer2: '👥 第二层：实例化', noExemplars: '*暂无实例 — 完成直觉探针后会自动生成对比示例。*', doLabel: '**应该：**', dontLabel: '**不应该：**',
    layer3: '🔒 第三层：边界', boundariesFallback: '边界待定义', appliesWhen: '**适用场景：**', doesNotApply: '**不适用场景：**', tensionZones: '**灰色地带（需要自行判断）：**', noBoundaries: '暂无具体边界定义',
    layer4: '🧪 第四层：验证', metric: '指标', noMetric: '暂无验证指标', noTestCases: '*暂无测试用例 — 完成直觉探针后会自动生成。*', testCase: '测试场景', prompt: '提示', expected: '期望表现', passCriteria: '通过条件', antiPatterns: '**反模式与隐性失败：**',
    layer5: '🌍 第五层：情境化', culturalPending: '*文化适配待生成 — 会基于探针回应自动生成。*', note: '说明', adaptation: '适配方式', noCulturalVariants: '*文化变体待定义*',
    usingTitle: '📚 如何使用这个 Skill', usingIntro: '要有效使用这个 Skill：',
    step1: '**复制上方"直接可用的提示词"区块**，粘贴到你常用的 AI（ChatGPT、Claude 或其他）',
    step2: '**补充你自己的具体场景或问题**',
    step3: '**让 AI 按这个 Skill 的核心原则推理**',
    step4: '**需要时参考实例**，让 AI 知道"好的表现"长什么样',
    step5: '**留意边界条件**，避免在不适用的场景里硬用',
    usingFooter: '这个 Skill 通过五层框架，教会 AI 一套具体的推理和表达模式，让输出更一致、更高质量。',
    rightsTitle: '创作者权益', commercialUse: '**商业使用**', remix: '**改编**',
    allowed: '允许', authRequired: '需授权', prohibited: '禁止', shareAlikeRequired: '需署名共享', notAllowed: '不允许',
    footer: `*通过 THE 42 POST 锻造 · 人类语义资本协议*\n*版本：1.0.0 | 授权：${skillData.license || '创作者保留'}*`
  } : {
    by: 'By', readyTitle: '🚀 READY TO PROMPT', readyHint: 'Copy and paste this system prompt directly into your favorite LLM:',
    about: '📖 ABOUT THIS SKILL', aboutFallback: 'A skill forged in The 42 Post that enhances AI reasoning and output quality through structured guidance.',
    metaTitle: '📋 SKILL METADATA', field: 'Field', value: 'Value', creator: 'Creator', created: 'Created', version: 'Version', protocol: 'Protocol', license: 'License',
    frameworkTitle: '✨ COMPLETE FRAMEWORK',
    layer1: '🎯 Layer 1: Principle', layer1Fallback: 'The core principle of this skill', reasoning: 'Reasoning',
    layer2: '👥 Layer 2: Exemplars', noExemplars: '*No exemplars generated — complete the Intuition Probe to generate comparative examples.*', doLabel: '**DO:**', dontLabel: '**DON\'T:**',
    layer3: '🔒 Layer 3: Boundaries', boundariesFallback: 'Boundaries to be defined', appliesWhen: '**Applies when:**', doesNotApply: '**Does not apply:**', tensionZones: '**Tension zones (gray areas requiring judgment):**', noBoundaries: 'No specific boundaries defined',
    layer4: '🧪 Layer 4: Evaluation', metric: 'Metric', noMetric: 'No evaluation metric defined', noTestCases: '*No test cases generated — complete the Intuition Probe to auto-generate.*', testCase: 'Test Case', prompt: 'Prompt', expected: 'Expected', passCriteria: 'Pass criteria', antiPatterns: '**Anti-patterns & Silent Failures:**',
    layer5: '🌍 Layer 5: Cultural Variants', culturalPending: '*Cultural adaptation pending — will be generated based on probe responses.*', note: 'Note', adaptation: 'Adaptation', noCulturalVariants: '*Cultural variants to be defined*',
    usingTitle: '📚 USING THIS SKILL', usingIntro: 'To use this skill effectively:',
    step1: '**Copy the Ready-to-Prompt section** above and paste it into your preferred Large Language Model (ChatGPT, Claude, or others)',
    step2: '**Provide context or input** relevant to your task',
    step3: '**Follow the skill\'s principle** to guide the AI\'s reasoning',
    step4: '**Reference the exemplars** if you need to show the AI what "good" looks like',
    step5: '**Be aware of boundaries** to use the skill appropriately',
    usingFooter: 'This skill teaches the AI specific patterns of reasoning and output formatting through the Five-Layer Framework, enabling more consistent and higher-quality results.',
    rightsTitle: 'Creator Rights', commercialUse: '**Commercial Use**', remix: '**Remix**',
    allowed: 'Allowed', authRequired: 'Authorization Required', prohibited: 'Prohibited', shareAlikeRequired: 'Share-alike Required', notAllowed: 'Not Allowed',
    footer: `*Forged with THE 42 POST · Human Semantic Capital Protocol*\n*Version: 1.0.0 | License: ${skillData.license || 'Creator Reserved'}*`
  };

  let md = `# ${skillData.title}
${L.by} ${creatorName} | Soul-Hash: ${shortSoulHash}

---

## ${L.readyTitle}

${L.readyHint}

\`\`\`
${readyPrompt}
\`\`\`

---

## ${L.about}

${skillData.about || (fiveLayer ? fiveLayer.principle : L.aboutFallback)}

---

## ${L.metaTitle}

| ${L.field} | ${L.value} |
|-------|-------|
| **Soul-Hash** | \`${fullSoulHash}\` |
| **${L.creator}** | ${creatorName} |
| **${L.created}** | ${timestamp} |
| **${L.version}** | 1.0.0 |
| **${L.protocol}** | THE 42 POST · Five-Layer Skill Architecture |
| **${L.license}** | Creator Reserved |

---

## ${L.frameworkTitle}

### ${L.layer1}

${fiveLayer ? fiveLayer.principle : L.layer1Fallback}

${fiveLayer && fiveLayer.reasoning ? `*${L.reasoning}: ${fiveLayer.reasoning}*` : ''}

---

### ${L.layer2}

${(() => {
  if (!fiveLayer || !fiveLayer.exemplars || fiveLayer.exemplars.length === 0) {
    return L.noExemplars;
  }

  let exemplarMd = '';
  fiveLayer.exemplars.forEach((ex) => {
    // Check if label indicates DO/DON'T pattern
    const isNegative = ex.label && (ex.label.toLowerCase().includes('don\'t') || ex.label.toLowerCase().includes('avoid'));
    const prefix = isNegative ? L.dontLabel : L.doLabel;
    exemplarMd += `\n${prefix} ${ex.text}\n`;
    if (ex.note) {
      exemplarMd += `*→ ${ex.note}*\n`;
    }
  });
  return exemplarMd;
})()}

---

### ${L.layer3}

${(() => {
  if (!fiveLayer || !fiveLayer.boundaries) {
    return L.boundariesFallback;
  }

  const b = fiveLayer.boundaries;
  let boundaryMd = '';

  if (b.applies_when && b.applies_when.length > 0) {
    boundaryMd += `${L.appliesWhen}\n`;
    b.applies_when.forEach(t => { boundaryMd += `- ✓ ${t}\n`; });
  }

  if (b.does_not_apply && b.does_not_apply.length > 0) {
    boundaryMd += `\n${L.doesNotApply}\n`;
    b.does_not_apply.forEach(t => { boundaryMd += `- ✕ ${t}\n`; });
  }

  if (b.tension_zones && b.tension_zones.length > 0) {
    boundaryMd += `\n${L.tensionZones}\n`;
    b.tension_zones.forEach(t => { boundaryMd += `- ⚠ ${t}\n`; });
  }

  return boundaryMd || L.noBoundaries;
})()}

---

### ${L.layer4}

${fiveLayer && fiveLayer.evaluation ? `\n**${L.metric}:** \`${fiveLayer.evaluation.metric}\`\n` : L.noMetric}

${(() => {
  if (!fiveLayer || !fiveLayer.evaluation || !fiveLayer.evaluation.test_cases || fiveLayer.evaluation.test_cases.length === 0) {
    return L.noTestCases;
  }

  let testMd = '';
  fiveLayer.evaluation.test_cases.forEach((tc, i) => {
    testMd += `\n**${L.testCase} ${i + 1}:**\n`;
    testMd += `- **${L.prompt}:** ${tc.prompt.substring(0, 200)}${tc.prompt.length > 200 ? '...' : ''}\n`;
    testMd += `- **${L.expected}:** ${tc.expected}\n`;
    testMd += `- **${L.passCriteria}:** ${tc.pass_criteria}\n`;
  });
  return testMd;
})()}

${fiveLayer && fiveLayer.evaluation && fiveLayer.evaluation.silent_failures && fiveLayer.evaluation.silent_failures.length > 0 ? `
${L.antiPatterns}
${fiveLayer.evaluation.silent_failures.map(failure => `- ${failure}`).join('\n')}
` : ''}

---

### ${L.layer5}

${(() => {
  if (!fiveLayer || !fiveLayer.cultural_variants) {
    return (fiveLayer && fiveLayer.contextualizing)
      ? fiveLayer.contextualizing
      : L.culturalPending;
  }

  let culturalMd = '';

  // Handle en-US
  if (fiveLayer.cultural_variants['en-US']) {
    const variant = fiveLayer.cultural_variants['en-US'];
    culturalMd += `\n**English (en-US)**\n`;
    if (variant.principle_note) culturalMd += `- **${L.note}:** ${variant.principle_note}\n`;
    if (variant.adaptation) culturalMd += `- **${L.adaptation}:** ${variant.adaptation}\n`;
  }

  // Handle zh-CN
  if (fiveLayer.cultural_variants['zh-CN']) {
    const variant = fiveLayer.cultural_variants['zh-CN'];
    culturalMd += `\n**中文 (zh-CN)**\n`;
    if (variant.principle_note) culturalMd += `- **${L.note}:** ${variant.principle_note}\n`;
    if (variant.adaptation) culturalMd += `- **${L.adaptation}:** ${variant.adaptation}\n`;
  }

  return culturalMd || L.noCulturalVariants;
})()}

---

## ${L.usingTitle}

${L.usingIntro}

1. ${L.step1}
2. ${L.step2}
3. ${L.step3}
4. ${L.step4}
5. ${L.step5}

${L.usingFooter}

---

## ${L.rightsTitle}

- ${L.commercialUse}: ${skillData.commercial === 'allowed' ? L.allowed : skillData.commercial === 'authorized' ? L.authRequired : L.prohibited}
- ${L.remix}: ${skillData.remix === 'yes' ? L.allowed : skillData.remix === 'share-alike' ? L.shareAlikeRequired : L.notAllowed}

---

${L.footer}`;

  return md;
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
   SEMANTIC ARCHIVE - Celestial Map Implementation
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
  trackEvent('archive_viewed');

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
    // Always strip any existing creator_ prefix(es) to get the bare name, then re-add exactly one
    const rawCreator = s.creator_name || s.author || s.creatorName || s.agent || '';
    const bareCreator = rawCreator.replace(/^(creator_)+/i, '');
    const creatorName = (bareCreator && bareCreator !== 'Anonymous' && bareCreator !== 'System') ? bareCreator : 'Anonymous';
    const agent = `creator_${creatorName}`;

    // five_layer arrives as a raw JSON string from the API and in three
    // different internal shapes depending on when the skill was forged —
    // normalizeFiveLayerShape() is the one shared place that understands
    // all of them (see its own comment for why this used to be
    // reimplemented separately here, in loadSkillsFromDB(), and in the
    // markdown exporter, each silently drifting from the other two).
    let rawFiveLayer = s.five_layer;
    if (typeof rawFiveLayer === 'string') {
      try { rawFiveLayer = JSON.parse(rawFiveLayer); } catch { rawFiveLayer = {}; }
    }
    const fiveLayer = normalizeFiveLayerShape(rawFiveLayer) || {};

    return {
      ...s,
      agent,
      creator: agent,
      creator_name: agent,  // Always "creator_xx" format for display
      desc,
      descCn,
      author: creatorName,  // Normalize author field
      title: s.title || s.title_cn || s.titleCn || 'Unknown Skill',
      titleCn: s.title_cn || s.titleCn || s.title || '未知技能',
      stars,
      downloads,
      starlight,
      five_layer: fiveLayer,
      ready_to_use_prompt: s.ready_to_use_prompt || fiveLayer.ready_to_use_prompt || ''
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
    const rawCreator = s.creator_name || s.creatorName || s.author || s.agent || 'Anonymous';
    const bareCreator = rawCreator.replace(/^(creator_)+/i, '');
    const agent = `creator_${bareCreator}`;
    return {
      ...s,
      starlight: s.starlight || 5,
      titleCn: s.titleCn || s.title || 'Unknown Skill',
      desc: s.desc || '',
      descCn: s.descCn || s.desc || '',
      agent,
      author: bareCreator,
      creator_name: agent
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
            const rawCreator = s.creator_anonymous_id || s.username || 'Anonymous';
            const creatorName = rawCreator.replace(/^creator_/i, '');
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

  // Only include locally-cached forged skills whose ID still exists on the server.
  // This prevents deleted skills (e.g. after a nuke-all) from showing as dead cards.
  const serverSkillIds = new Set([...baseSkills, ...userDbSkills].map(s => s.id));
  const liveForgedSkills = forgedSkillsWithStarlight.filter(s => serverSkillIds.has(s.id));

  // Also prune stale entries from localStorage so they don't reappear next session.
  if (liveForgedSkills.length < forgedSkillsWithStarlight.length) {
    safeStorage.setItem('42post_recent_forges', JSON.stringify(
      getRecentForges().filter(s => serverSkillIds.has(s.id))
    ));
  }

  const allSkills = [...baseSkills, ...userDbSkills, ...liveForgedSkills]
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i); // dedup by id

  // Expose allSkills to window so findSkillById can access them
  // This is critical for Archive action buttons (star, download, play) to work
  window.allSkills = allSkills;

  // ═══ TWIN TEST "BETTER" COUNTS — feeds star brightness in the celestial map ═══
  // One unconditional batch call (no skill_ids needed — the route returns
  // every skill that has votes), so this never costs more requests as the
  // skill count grows.
  try {
    const statsResp = await fetch(`${ApiClient.BASE_URL}/playground/stats-batch`);
    if (statsResp.ok) {
      const statsData = await statsResp.json();
      const stats = statsData.stats || {};
      allSkills.forEach(s => {
        s.betterVotes = stats[s.id]?.better || 0;
        // Verification status comes from BLIND, non-author Twin Test votes
        // (routes/playground.js /vote + /stats-batch) — a separate, more
        // rigorous signal than the self-reported betterVotes above.
        s.verificationStatus = stats[s.id]?.verification_status || null;
        s.verificationTotalVotes = stats[s.id]?.verification_total_votes || 0;
        s.verificationWinRate = stats[s.id]?.verification_win_rate ?? null;
      });
    }
  } catch (e) {
    console.warn('Archive: failed to fetch Twin Test stats:', e.message);
  }

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
        // betterVotes weighted higher than starlight per point — a Twin
        // Test "clearly better" vote took real effort (run the test, read
        // both responses, decide) versus a one-tap star.
        size: 3.5 + (s.starlight || 5) * 0.2 + (s.betterVotes || 0) * 0.4,
        starlight: s.starlight || 5,
        betterVotes: s.betterVotes || 0,
        title, titleCn,
        desc, descCn,
        agent: s.agent || `creator_${s.creator_name || 'Anonymous'}`,
        creator_name: s.creator_name || 'Anonymous',
        domain: s.domain, id: s.id,
        hash: hashValue,
        color, phase: phaseRand * Math.PI * 2,
        verificationStatus: s.verificationStatus || null,
        verificationTotalVotes: s.verificationTotalVotes || 0,
        verificationWinRate: s.verificationWinRate ?? null,
      };
    });

    // Debug: Log nodes to verify they have proper title/creator info
    const nodeSample = nodes.slice(0, 5).map(n => ({
      id: n.id,
      title: n.title,
      creator_name: n.creator_name
    }));
    console.log(`✓ Archive: Created ${nodes.length} nodes for celestial canvas`, nodeSample);

    // ═══ EDGE GENERATION — same-domain relationships, not decoration ═══
    // Used to be a pure distance + coin-flip decision with zero connection
    // to what the skills actually are. mapDomain() is the same lookup the
    // node color above already uses, so a line now means "these two are
    // the same domain" — same thing the color already implies, but made
    // explicit and visible between any two nodes regardless of where the
    // spiral layout happened to place them.
    edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (mapDomain(nodes[i].domain) === mapDomain(nodes[j].domain)) {
          edges.push([i, j]);
        }
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
      
      const glowR = (n.size * 6 + n.starlight * 0.5 + n.betterVotes * 1.0) * breathe * (highlight ? 2.5 : 1);
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

  // Verification badge for the star tooltip — built from BLIND, non-author
  // Twin Test votes (routes/playground.js /vote), not the self-reported
  // betterVotes count used for star size above. "failed" gets the same
  // visual weight as "verified": a verification mechanism that only ever
  // shows good news is not one worth trusting.
  function renderVerificationBadge(n) {
    const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
    const total = n.verificationTotalVotes || 0;
    const status = n.verificationStatus;
    if (!status || total === 0) return { text: '', cls: '' };

    const pct = n.verificationWinRate !== null && n.verificationWinRate !== undefined
      ? Math.round(n.verificationWinRate * 100) : null;

    if (status === 'verified') {
      return {
        cls: 'verified',
        text: isCn ? `✓ 社区已验证 · ${pct}% · ${total} 票` : `✓ Community Verified · ${pct}% · ${total} votes`
      };
    }
    if (status === 'failed') {
      return {
        cls: 'failed',
        text: isCn ? `✕ 验证未通过 · ${pct}% · ${total} 票` : `✕ Verification Failed · ${pct}% · ${total} votes`
      };
    }
    // status === 'verifying' — either under the 5-vote threshold, or a
    // genuinely inconclusive 40-60% result with enough votes to say so.
    if (total < 5) {
      return {
        cls: 'verifying',
        text: isCn ? `◐ 验证中 · ${total}/5 票` : `◐ Verifying · ${total}/5 votes`
      };
    }
    return {
      cls: 'verifying',
      text: isCn ? `◐ 结果不明确 · ${pct}% · ${total} 票` : `◐ Inconclusive · ${pct}% · ${total} votes`
    };
  }

  function paintVerificationBadge(n) {
    const el = document.getElementById('ttVerification');
    if (!el) return;
    const badge = renderVerificationBadge(n);
    el.textContent = badge.text;
    el.className = 'tt-verification' + (badge.cls ? ` ${badge.cls}` : '');
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

      const creatorName = n.creator_name || n.agent || 'Anonymous';
      document.getElementById('ttAgent').textContent = creatorName && creatorName !== 'Anonymous' ? `by ${creatorName}` : '';
      // Description: show appropriate language based on currentLang
      document.getElementById('ttDesc').textContent = lang === 'cn' ? (n.descCn || n.desc || '') : (n.desc || n.descCn || '');
      // Soul hash is shown only in the full card detail, not in this tooltip
      document.getElementById('ttHash').textContent = '';
      paintVerificationBadge(n);
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
        const creatorName = n.creator_name || n.agent || 'Anonymous';
        document.getElementById('ttAgent').textContent = creatorName && creatorName !== 'Anonymous' ? `by ${creatorName}` : '';
        document.getElementById('ttDesc').textContent = lang === 'cn' ? (n.descCn || n.desc || '') : (n.desc || n.descCn || '');
        // Soul hash is shown only in the full card detail, not in this tooltip
        document.getElementById('ttHash').textContent = '';
        paintVerificationBadge(n);
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
    const sorted = [...allSkills]
      .filter(s => {
        const c = (s.creator_name || s.agent || '').toLowerCase();
        return !c.includes('test') && !c.includes('e2e');
      })
      .sort((a, b) => {
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

      // Extract creator name (fallback to anonymous)
      const creatorName = s.creator_name || s.agent || 'anonymous';

      row.innerHTML = `
        <span class="honor-rank">#${String(i + 1).padStart(2, '0')}</span>
        <span class="honor-name">${title}</span>
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
  
  // Domain filter bar - lets users jump straight to one domain instead of
  // scrolling past all 10. Renders once; switching filters only toggles
  // which already-rendered .domain-cell elements are visible.
  let archiveDomainFilter = 'all';
  function renderDomainFilterBar() {
    const bar = document.getElementById('domainFilterBar');
    if (!bar || bar.dataset.rendered === 'true') return;
    bar.dataset.rendered = 'true';

    const chips = [{ id: 'all', cn: '全部', en: 'All' }, ...ARCHIVE_DOMAINS];
    bar.innerHTML = chips.map(dom => `
      <button class="domain-filter-chip${dom.id === 'all' ? ' selected' : ''}" data-domain="${dom.id}">
        <span class="text-cn">${dom.cn}</span><span class="text-en">${dom.en}</span>
      </button>
    `).join('');

    bar.querySelectorAll('.domain-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        archiveDomainFilter = chip.dataset.domain;
        bar.querySelectorAll('.domain-filter-chip').forEach(c => c.classList.toggle('selected', c === chip));
        document.querySelectorAll('#domainGrid .domain-cell').forEach(cell => {
          cell.style.display = (archiveDomainFilter === 'all' || cell.dataset.domain === archiveDomainFilter) ? 'flex' : 'none';
        });
        // .domain-grid is a fixed 2-column grid - with only one cell left
        // visible, the second column track is still reserved and renders
        // as a blank pane. Collapse to one column whenever filtered to a
        // single domain.
        document.getElementById('domainGrid')?.classList.toggle('single-domain', archiveDomainFilter !== 'all');
      });
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

    renderDomainFilterBar();

    // Render each domain with its skills
    ARCHIVE_DOMAINS.forEach((dom, idx) => {
      const cell = document.createElement('div');
      cell.className = 'domain-cell';
      cell.dataset.domain = dom.id;

      const domainSkills = skillsByDomain[dom.id] || [];
      const domainTitle = lang === 'cn' ? dom.cn : dom.en;

      let skillsHTML = '';
      if (domainSkills.length > 0) {
        skillsHTML = domainSkills.map(skill => {
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
                  <span class="skill-winrate" data-skill-id="${skill.id}"></span>
                </div>
                <!-- Action buttons: Star (icon + count together, not a separate
                     count element elsewhere — two stars for one concept read as
                     two different things), Download, Play -->
                <div class="skill-actions">
                  <button class="skill-action-btn star-btn ${isStarred ? 'starred' : ''}" data-skill-id="${skill.id}" title="${isStarred ? 'Unstar this skill' : 'Star this skill'}"><span class="star-btn-icon">${isStarred ? '★' : '☆'}</span><span class="star-btn-count">${skill.starlight_score || skill.stars || 0}</span></button>
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
        // Icon + count now live inside the star button itself (one star
        // concept, not a separate count element elsewhere on the card) —
        // update each span, never the button's textContent wholesale, or
        // it wipes out whichever of the two this click didn't touch.
        const iconEl = btn.querySelector('.star-btn-icon');
        const countEl = btn.querySelector('.star-btn-count');

        const starredSkills = safeStorage.getJSON('starred_skills', {});
        const isCurrentlyStarred = starredSkills[skillId] === true;
        const willBeStarred = !isCurrentlyStarred;

        // Optimistic UI update
        if (iconEl) iconEl.textContent = willBeStarred ? '★' : '☆';
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
            if (countEl && typeof result.totalStars !== 'undefined') {
              countEl.textContent = result.totalStars;
            }
          }
        } catch (err) {
          console.warn('Star API error:', err.message);
          // Revert on error
          if (iconEl) iconEl.textContent = isCurrentlyStarred ? '★' : '☆';
          btn.classList.toggle('starred', isCurrentlyStarred);
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Download buttons
    document.querySelectorAll('.domain-cell .download-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
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
          // Icon-only button — a brief opacity dim is the whole loading
          // state; getSkillContentForDownload only makes a network call
          // (and only takes visible time) when the Skill's content
          // language doesn't match the current UI language.
          const originalOpacity = btn.style.opacity;
          btn.disabled = true;
          btn.style.opacity = '0.5';
          try {
            const contentSkill = await getSkillContentForDownload(skill);
            const markdown = generateDomainSkillMarkdown(contentSkill);
            downloadMarkdownFile(markdown, `The42Post_${skill.title.replace(/\s+/g, '_')}.md`);
          } finally {
            btn.disabled = false;
            btn.style.opacity = originalOpacity;
          }
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
        const iconEl = btn.querySelector('.star-btn-icon');
        const countEl = btn.querySelector('.star-btn-count');
        const downloadBtn = skillItem?.querySelector('.download-btn');

        // Update count display
        if (countEl) countEl.textContent = data.totalStars;

        // Update starred state from backend (source of truth)
        if (data.userStarred) {
          btn.classList.add('starred');
          if (iconEl) iconEl.textContent = '★';
          btn.title = 'Unstar this skill';
          starredSkills[id] = true;
          if (skillItem) skillItem.dataset.isStarred = 'true';
          if (downloadBtn) { downloadBtn.disabled = false; downloadBtn.classList.remove('disabled'); }
        } else {
          btn.classList.remove('starred');
          if (iconEl) iconEl.textContent = '☆';
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
      downloadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isCn = document.body.dataset.lang === 'cn';
        const originalLabel = downloadBtn.textContent;
        downloadBtn.disabled = true;
        downloadBtn.textContent = isCn ? '⟳ 翻译中…' : '⟳ Translating…';
        try {
          const contentSkill = await getSkillContentForDownload(skill);
          const markdown = generateDomainSkillMarkdown(contentSkill);
          downloadMarkdownFile(markdown, `The42Post_${skill.title.replace(/\s+/g, '_')}.md`);

          // Update download counter
          skill.downloads = (skill.downloads || 0) + 1;
          const downloadDisplay = cell.querySelector('.top42-skill-meta .top42-skill-meta-item:nth-child(2) span');
          if (downloadDisplay) downloadDisplay.textContent = skill.downloads;
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.textContent = originalLabel;
        }
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
          alertI18n('warning_star_first');
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
          alertI18n('error_download_failed');
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

// A Skill's generated content (five_layer / ready_to_use_prompt) is forged
// once, in one language, and never touched again by the best-effort
// title/description translation that runs at publish time. Downloading a
// Skill while in the OTHER UI language previously produced a document with
// translated section labels wrapped around untranslated content. This
// fetches an on-demand translation (cached server-side after the first
// call — see POST /api/skills/:id/translate-content) only when the two
// languages actually mismatch; the common case (already matching) never
// makes a network call. Falls back to the original content — never blocks
// the download — if translation is unavailable.
async function getSkillContentForDownload(skill) {
  const isCn = document.body.dataset.lang === 'cn';
  const fl = skill.fiveLayerSkill || skill.five_layer || {};
  const principleText = (typeof fl === 'object' && fl ? (fl.principle || fl.defining || '') : '')
    || skill.desc || skill.description || skill.title || '';
  const contentIsCn = /[一-鿿]/.test(principleText);

  if (isCn === contentIsCn || !skill.id) return skill; // fast path — already matches

  try {
    const resp = await fetch(`${ApiClient.BASE_URL}/skills/${skill.id}/translate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_lang: isCn ? 'cn' : 'en' })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return {
      ...skill,
      fiveLayerSkill: data.five_layer,
      five_layer: data.five_layer,
      ready_to_use_prompt: data.ready_to_use_prompt || skill.ready_to_use_prompt
    };
  } catch (err) {
    console.warn('Content translation unavailable, downloading in original language:', err.message);
    if (typeof showWarning === 'function') {
      showWarning(isCn
        ? '翻译暂时不可用，已用原始语言内容下载'
        : 'Translation unavailable — downloaded in the original language');
    }
    return skill;
  }
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
  if (!SpeechRecognition) {
    // No Web Speech API here (WebKit has never implemented it — true for
    // Safari and every iOS browser, since they all run on WebKit). There's
    // no free way to build a working mic button on these devices. iOS's own
    // keyboard already has dictation built in, so point at that instead of
    // showing a button that can't do anything.
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      const hint = document.getElementById('voiceNativeHint');
      if (hint) hint.style.display = 'inline';
    }
    return;
  }

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
    let watchdog = null;     // see armWatchdog() below

    // rec.start() not throwing only proves the call was accepted -- it
    // does not prove the underlying native speech engine is actually
    // running. Some degraded WebViews (again, the same class of embedded
    // in-app browser as the sync-throw case above) accept the call and
    // then never fire onresult, onerror, or onend at all: the button
    // sits on "Listening…" forever with nothing to do but wait, which
    // looks identical to "broken" from the user's side. If nothing
    // happens within a generous window, treat it as failed and say so.
    function armWatchdog() {
      clearWatchdog();
      watchdog = setTimeout(() => {
        watchdog = null;
        if (!listening) return;
        listening = false;
        try { rec && rec.abort(); } catch (_) {}
        setBtn('idle');
        const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn')
          || document.body.dataset.lang === 'cn';
        showError(isCn
          ? '语音识别没有响应，当前浏览器可能不支持。可尝试用系统自带浏览器（如 Safari/Chrome）打开'
          : 'Voice input is not responding — try opening this in your default browser (Safari/Chrome)');
      }, 8000);
    }
    function clearWatchdog() {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    }

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
        // A result proves the engine is genuinely alive — the one thing
        // the watchdog above can't tell from a merely-accepted start().
        clearWatchdog();
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
        clearWatchdog(); // an error is still a response — not a hang
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          listening = false;
          committed = '';
          setBtn('idle');
          const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn')
            || document.body.dataset.lang === 'cn';
          showError(isCn
            ? '无法访问麦克风，请在浏览器设置中允许麦克风权限'
            : 'Microphone access denied — allow it in your browser settings');
        }
        // 'no-speech', 'aborted', network errors → let onend handle cleanup
      };

      r.onend = () => {
        clearWatchdog();
        listening = false;
        if (!isMobile) {
          // Desktop: auto-restart until user clicks stop
          if (rec === r) {
            try { r.start(); listening = true; armWatchdog(); } catch (_) { setBtn('idle'); }
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
        armWatchdog();
        setBtn('recording');
        const isChinese = rec.lang === 'zh-CN';
        btn.dataset.voiceLang = isChinese ? '中' : 'EN';
        btn.title = isChinese ? '正在听写：中文' : 'Listening: English';
      } catch (e) {
        // Was silent — a synchronous throw here (seen in some Android
        // in-app browsers, e.g. WeChat/Xiaohongshu's embedded WebView,
        // where webkitSpeechRecognition exists as an object but the
        // underlying native bridge isn't actually wired up) left the
        // button just quietly reverting to idle with zero feedback,
        // indistinguishable from the tap not registering at all.
        listening = false;
        setBtn('idle');
        const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn')
          || document.body.dataset.lang === 'cn';
        showError(isCn
          ? '语音识别启动失败，当前浏览器可能不支持。可尝试用系统自带浏览器（如 Safari/Chrome）打开'
          : 'Voice input failed to start — try opening this in your default browser (Safari/Chrome)');
      }
    }

    function stop() {
      clearWatchdog();
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
