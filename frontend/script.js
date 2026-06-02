/* ═══════════════════════════════════════════════════════
   THE 42 POST — V2.0 Classical Redesign
   i18n · Knight Card · KCS · Dual-Path Forge · Starlight
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   PHASE 0: API CLIENT LAYER (Front-Back Connection)
   ═══════════════════════════════════════════════════════ */

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
  let anonId = localStorage.getItem(API_CONFIG.ANON_ID_KEY);
  if (!anonId) {
    anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(API_CONFIG.ANON_ID_KEY, anonId);
  }
  return anonId;
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
    // Fallback to the other language when the primary is null/empty.
    // Prevents "English suddenly disappears" when title or desc only exists in one lang.
    const title = lang === 'cn'
      ? (skill.titleCn || skill.title || '')
      : (skill.title || skill.titleCn || '');
    const desc = lang === 'cn'
      ? (skill.descCn || skill.desc || '')
      : (skill.desc || skill.descCn || '');
    const isStarred = starredSkills[skill.id] === true;
    const userId = currentUser?.id || 'anonymous';
    const canDownload = isStarred;

    return `
      <div class="skill-card" data-skill-id="${escapeHtml(skill.id)}">
        <!-- Card Header -->
        <div class="skill-card-header">
          <span class="skill-title">${escapeHtml(title)}</span>
          <span class="skill-starlight">✨ ${escapeHtml(skill.starlight)}</span>
        </div>

        <!-- Soul Hash -->
        <div class="skill-card-hash">
          <code class="soul-hash">${skill.soul_hash ? escapeHtml(skill.soul_hash.substring(0, 14)) : 'SH-GENERATED'}</code>
        </div>

        <!-- Description -->
        <div class="skill-card-desc">${escapeHtml(desc)}</div>

        <!-- Footer with interactions -->
        <div class="skill-card-footer">
          <div class="skill-card-meta">
            <span class="skill-author">${escapeHtml(skill.author)}</span>
            <span class="skill-domain">${escapeHtml(skill.domain)}</span>
          </div>
          
          <!-- Action Buttons -->
          <div class="skill-card-actions">
            <!-- Star Button (echoes the celestial archive above) -->
            <button class="btn-star" data-skill-id="${skill.id}" title="Light up this skill">
              <span class="star-icon">${isStarred ? '★' : '☆'}</span>
              <span class="star-count">${skill.stars || 0}</span>
            </button>

            <!-- Download Button (star first to enable) -->
            <button class="btn-download"
                    data-skill-id="${skill.id}"
                    ${canDownload ? '' : 'disabled'}
                    title="${canDownload ? 'Download this skill' : 'Star first to download'}">
              <span class="download-icon">⬇</span>
              <span class="download-count">${skill.downloads || 0}</span>
            </button>

            <!-- Playground: live-test this skill in the arena -->
            <button class="btn-playground" data-skill-id="${skill.id}" title="Test this skill in Playground">
              <span class="playground-icon">▶</span>
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
    const _voiceSkills = (typeof SkillStore !== 'undefined' && SkillStore.size() > 0) ? SkillStore.sample(6) : SHARED_SKILLS.slice(0, 6);
    voicesContainer.innerHTML = _voiceSkills.map(renderSkillCard).join('');
  }

  // Attach event listeners
  attachSkillCardListeners();
}

/* ═══ SKILL CARD EVENT LISTENERS ═══ */
function attachSkillCardListeners() {
  const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');

  // ═══ LOAD STAR STATUS FROM BACKEND ═══
  // Sync user's star state with backend on page load
  document.querySelectorAll('.btn-star').forEach(async (btn) => {
    const skillId = btn.dataset.skillId;
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/skills/${skillId}/stars`, {
        headers: {
          'X-Anonymous-Id': getAnonymousId()
        }
      });
      if (response.ok) {
        const result = await response.json();
        const starBtn = btn;
        const countSpan = starBtn.querySelector('.star-count');
        const iconSpan = starBtn.querySelector('.star-icon');

        // Update star count from backend
        if (countSpan && result.totalStars) {
          countSpan.textContent = result.totalStars;
        }

        // Update star state if user has already starred this
        if (result.userStarred) {
          starredSkills[skillId] = true;
          if (iconSpan) iconSpan.textContent = '★';
        } else {
          delete starredSkills[skillId];
          if (iconSpan) iconSpan.textContent = '☆';
        }

        // Sync with localStorage
        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));
      }
    } catch (error) {
      console.warn(`Could not load star status for skill ${skillId}:`, error);
    }
  });

  // Star button handler (with backend sync)
  document.querySelectorAll('.btn-star').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // RACE CONDITION FIX: Prevent double-click by checking disabled state first
      if (btn.disabled) return;

      const skillId = btn.dataset.skillId;
      
      // NOTE: We don't check if skill exists here because:
      // 1. The skill might be in a different data source
      // 2. If it doesn't exist, the backend API will return 404
      // 3. We let the backend be the source of truth for validation
      
      if (!skillId) return;

      // Determine new state
      const isCurrentlyStar = starredSkills[skillId];
      const newStarred = !isCurrentlyStar;

      // Show loading state
      const originalIcon = btn.querySelector('.star-icon').textContent;
      btn.querySelector('.star-icon').textContent = '⏳';
      btn.disabled = true;

      try {
        // Call backend API to save star
        const anonId = getAnonymousId();
        const response = await fetch(`${API_CONFIG.BASE_URL}/skills/${skillId}/star`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Anonymous-Id': anonId
          },
          body: JSON.stringify({ starred: newStarred })
        });

        if (!response.ok) {
          throw new Error(`Star API error: ${response.status}`);
        }

        const result = await response.json();

        // Update local state - get skill object and sync star count
        const skill = findSkillById(skillId);
        if (skill) {
          skill.stars = result.totalStars;
        }

        if (newStarred) {
          starredSkills[skillId] = true;
        } else {
          delete starredSkills[skillId];
        }

        // Save to localStorage as backup
        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));

        // Update button with the new star count from backend
        btn.querySelector('.star-icon').textContent = newStarred ? '⭐' : '☆';
        btn.querySelector('.star-count').textContent = result.totalStars;

        // Enable/disable download button
        const downloadBtn = btn.parentElement?.querySelector('.btn-download');
        if (downloadBtn) {
          if (newStarred) {
            downloadBtn.disabled = false;
            downloadBtn.title = 'Download this skill';
          } else {
            downloadBtn.disabled = true;
            downloadBtn.title = 'Star first to download';
          }
        }

        // Show success message
        showSuccess(newStarred ? 'Skill starred! ⭐' : 'Star removed');
      } catch (error) {
        console.error('Error updating star:', error);
        // Revert UI on error
        btn.querySelector('.star-icon').textContent = originalIcon;
        
        // Provide specific error messages
        if (error.message && error.message.includes('404')) {
          showToastI18n('error_skill_not_found', 'error');
        } else if (error.message && error.message.includes('400')) {
          showToastI18n('error_invalid_request', 'error');
        } else {
          showToastI18n('error_star_failed', 'error');
        }
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Download button handler (with backend sync)
  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // RACE CONDITION FIX: Prevent double-click
      if (btn.disabled) return;

      const skillId = btn.dataset.skillId;
      
      if (!skillId) {
        showToastI18n('error_invalid_skill_id', 'error');
        return;
      }
      
      if (!starredSkills[skillId]) {
        showToastI18n('warning_star_first', 'warning');
        return;
      }

      // Show loading state
      const originalText = btn.textContent;
      btn.textContent = '⏳ Downloading...';
      btn.disabled = true;

      try {
        // Get skill object for metadata
        const skill = findSkillById(skillId);

        // Call backend download API
        const anonId = getAnonymousId();
        const downloadUrl = `${API_CONFIG.BASE_URL}/download/${skillId}?format=markdown`;

        const response = await fetch(downloadUrl, {
          headers: {
            'X-Anonymous-Id': anonId
          }
        });

        if (!response.ok) {
          throw new Error(`Download error: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `The42Post_${skill ? skill.title.replace(/\s+/g, '_') : skillId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Update download count
        if (skill) {
          skill.downloads = (skill.downloads || 0) + 1;
          btn.querySelector('.download-count').textContent = skill.downloads;
        }

        showToastI18n('success_skill_downloaded', 'success');
      } catch (error) {
        console.error('Download error:', { skillId, error: error.message, status: error.status });
        const msg = error.message === 'Download error: 404'
          ? 'Skill not found or not published'
          : 'Download failed. Check console for details.';
        showError(msg);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  });

  // View full skill button handler
  document.querySelectorAll('.btn-view-full').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const skillId = btn.dataset.skillId;
      const skill = findSkillById(skillId);

      if (!skill) return;
      showSkillModal(skill);
    });
  });

  // Playground button handler — opens arena with this skill pre-loaded
  // for the With Skill vs Without Skill twin test.
  function attachPlaygroundHandlers() {
    document.querySelectorAll('.btn-playground').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const skillId = btn.dataset.skillId;
        if (!skillId) {
          console.warn('No skill ID on playground button');
          return;
        }
        console.log('Opening Playground with skill:', skillId);
        window.location.href = `playground.html?skill=${encodeURIComponent(skillId)}`;
      });
    });
  }
  attachPlaygroundHandlers();
}

/* ═══ GENERATE MARKDOWN ═══ */
/* ═══ DOWNLOAD FILE HELPER ═══ */
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
    forge_modal_title: 'IDEA SKILL FORGE',
    forge_modal_subtitle: 'Turn your idea into a skill',
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
    ethics_pass_msg: 'We heard you. Let\'s turn this idea into a Skill.',
    btn_enter_forge: 'Enter Skill Forge',
    /* ── Arena / Playground ── */
    arena_bar_subtitle: 'Taste Playground',
    arena_clear_all: '✕ CLEAR ALL',
    arena_random_task: '↻ RANDOM TASK',
    arena_back_home: '← BACK TO POST',
    arena_all_creations: 'ALL CREATIONS',
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
    creations_title: 'My Creative Works',
    creations_subtitle: 'Summary of all your creative answers',
    /* ── Overlays: About & How It Works ── */
    about_title: 'About',
    howto_title: 'How It Works',
    /* ── Forge Preview Modal ── */
    preview_scenario_placeholder: 'Scenario will generate based on your input',
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
    archive_most_starred: '⭐ Top 42 Skills',
    archive_honor_subtitle: 'Community Rankings · Starlight Votes',
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
    forge_modal_title: '想法技能铸造',
    forge_modal_subtitle: '将你的想法变成技能',
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
    archive_most_starred: '⭐ 热门42Skill',
    archive_honor_subtitle: '社区排名 · 星光投票',
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
    arena_all_creations: '全部创意',
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
    creations_title: '🎴 我的创意作品',
    creations_subtitle: '我的所有创意答案汇总',
    /* ── 信息框：关于 & 怎么玩 ── */
    about_title: '关于',
    howto_title: '怎么玩',
    /* ── 锻造预览 Modal ── */
    preview_scenario_placeholder: '场景将基于你的输入生成',
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
let currentLang = localStorage.getItem('42post_lang') || 'en';

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
    localStorage.setItem('42post_lang', currentLang);
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
  const starlightData = JSON.parse(localStorage.getItem('skill_starlight') || '{}');

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
        <div class="slot-title">${data.title}</div>
        <div class="slot-desc" title="${escapeHtml(data.desc)}">${escapeHtml(descDisplay)}</div>
        <div class="slot-license">
          <span class="license-author">by ${data.author || 'Anonymous'}</span>
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
    const starlightData = JSON.parse(localStorage.getItem('skill_starlight') || '{}');

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
    localStorage.setItem('skill_starlight', JSON.stringify(starlightData));
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
/* ═══ SHOW FORGE COMPLETION ═══ */
/* ═══ DOWNLOAD CREATOR CARD ═══ */
async function downloadCreatorCard(skillData, soulHash) {
  const cardElement = document.querySelector('.commemorative-card');
  if (!cardElement) { alertI18n('error_card_not_found'); return; }

  try {
    // Show loading state
    const btn = event?.target;
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '⏳ Processing...';
      btn.disabled = true;

      // Convert card to image using html2canvas
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        backgroundColor: '#f0ebe2',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      // Convert canvas to PNG blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Creator_Card_${soulHash || 'certificate'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Restore button
        btn.textContent = originalText;
        btn.disabled = false;
      }, 'image/png');
    }
  } catch (error) {
    console.error('Failed to generate card image:', error);
    alertI18n('error_card_generation');
    if (event?.target) {
      event.target.disabled = false;
    }
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
  let cards = JSON.parse(localStorage.getItem('42post_taste_cards') || '[]');
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
  const chatBubbleWrap = document.querySelector('.chat-bubble-wrap');

  if (chaosInput && chatBubblePlaceholder) {
    // ═══ 现代对话框交互：点击任何地方激活输入 ═══
    // 用户体验改进：类似ChatGPT的交互模式
    const activateInput = () => {
      chaosInput.focus();
      chatBubblePlaceholder.classList.add('hidden');
      if (chatBubbleWrap) chatBubbleWrap.classList.add('is-focused');
    };

    // 点击placeholder区域激活输入
    chatBubblePlaceholder.addEventListener('click', activateInput);

    // 点击chat-bubble-wrap的任何地方都能激活输入
    if (chatBubbleWrap) {
      chatBubbleWrap.addEventListener('click', (e) => {
        // 如果点击的是placeholder或footer之外的区域，激活输入
        if (!e.target.closest('.chat-bubble-footer')) {
          activateInput();
        }
      });
    }

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
      // selectedMode removed - agents are no longer part of the product

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

  // REMOVED: Duplicate listener - using only the first btnTest listener (lines 2430-2506)
  // which includes proper character limit validation

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

// Check for duplicate skills
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

${fiveLayer ? `\n**Metric:** \`${fiveLayer.evaluation.metric}\`\n` : 'No evaluation metric defined'}

${(() => {
  if (!fiveLayer || !fiveLayer.evaluation.test_cases || fiveLayer.evaluation.test_cases.length === 0) {
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

${fiveLayer && fiveLayer.evaluation.silent_failures && fiveLayer.evaluation.silent_failures.length > 0 ? `
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
    alertI18n('error_copy_clipboard');
  });
}

// Load and display skills in Agent Archive
// DEPRECATED: Use initAgentArchiveView() instead
// This function has been replaced by the full Celestial Map implementation

// Show Agent Archive page
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
        alertI18n('error_no_skill_data');
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
        alertI18n('error_no_skill_data');
      }
    });
  }

  if (btnLangChain) {
    btnLangChain.addEventListener('click', () => {
      if (window.currentForgedSkill) {
        downloadLangChainSkill(window.currentForgedSkill);
      } else {
        alertI18n('error_no_skill_data');
      }
    });
  }

  if (btnMCP) {
    btnMCP.addEventListener('click', () => {
      if (window.currentForgedSkill) {
        downloadMCPConfigSkill(window.currentForgedSkill);
      } else {
        alertI18n('error_no_skill_data');
      }
    });
  }
}

// Initialize back button in Agent Archive
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

function starSkillById(skillId, nodesArray = null) {
  const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
  const isStarred = starredSkills[skillId] === true;
  const newStarred = !isStarred;

  // Update local storage
  if (newStarred) {
    starredSkills[skillId] = true;
  } else {
    delete starredSkills[skillId];
  }
  localStorage.setItem('starred_skills', JSON.stringify(starredSkills));

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
        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
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
        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));
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

  function getLang() {
    return (document.body.dataset.lang || 'en') === 'cn' ? 'zh-CN' : 'en-US';
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
      r.lang = getLang();
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

  // ── Forge feedback textarea ("Tell AI what to change…") ──
  const forgeBtn = document.getElementById('btnVoiceForge');
  const forgeInput = document.getElementById('skillFeedback');
  if (forgeBtn && forgeInput) {
    forgeBtn.style.display = 'flex';
    createRecognizer(forgeInput, forgeBtn);
  }
}
