/* ═══════════════════════════════════════════════════════
   THE 42 POST — Archive & Celestial Canvas
   Depends on: utils.js, forge.js (for getRecentForges)
   ═══════════════════════════════════════════════════════ */

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
        const creatorLabel = `creator_${rawName}`;

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
            return {
              defining: fl.defining || '',
              instantiating: fl.instantiating || '',
              fencing: fl.fencing || '',
              validating: fl.validating || [],
              contextualizing: fl.contextualizing || ''
            };
          } catch { return { defining: '', instantiating: '', fencing: '', validating: [], contextualizing: '' }; }
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


function soulHash(str) {
  let h = 0x42;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) & 0xffffffff;
  return 'SOUL_' + Math.abs(h).toString(16).padStart(9, '0');
}

async function initAgentArchiveView() {
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
  
  // Honor List — top 42 only (name-consistent with "Most Starred Skills 42")
  function initHonorList() {
    const list = document.getElementById('honorList');
    const sorted = [...allSkills].sort((a, b) => b.starlight - a.starlight).slice(0, 42);

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
          const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
          const isStarred = starredSkills[skill.id] === true;
          return `
            <div class="skill-item" data-skill-id="${skill.id}" data-is-starred="${isStarred}">
              <div class="skill-header">
                <div class="skill-title">${title}</div>
                <div class="skill-hash" title="Soul Hash: ${soulHashFull}">${soulHashShort || '—'}</div>
              </div>
              <div class="skill-creator">${creatorDisplay}</div>
              <div class="skill-desc">${shortDesc}</div>
              <div class="skill-footer">
                <div class="skill-meta">
                  <span class="skill-stars">⭐ ${skill.starlight_score || skill.stars || 0}</span>
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
  } // end initDomainGrid

  // Attach listeners to skill action buttons in archive grid
  function attachArchiveSkillListeners() {
    // Star buttons
    document.querySelectorAll('.domain-cell .star-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (btn.disabled) return;

        const skillId = btn.dataset.skillId;
        const skillItem = btn.closest('.skill-item');
        const downloadBtn = skillItem?.querySelector('.download-btn');
        const starCountEl = skillItem?.querySelector('.skill-stars');

        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
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
        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));

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
          alertI18n('warning_star_first');
          return;
        }

        const skillId = btn.dataset.skillId;
        const skill = findSkillById(skillId);
        if (skill) {
          const markdown = generateDomainSkillMarkdown(skill);
          downloadMarkdownFile(markdown, skillId, skill.title);
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

      const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');

      btns.forEach(btn => {
        const id = btn.dataset.skillId;
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

      localStorage.setItem('starred_skills', JSON.stringify(starredSkills));
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


async function initAgentArchiveView() {
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
  
  // Honor List — top 42 only (name-consistent with "Most Starred Skills 42")
  function initHonorList() {
    const list = document.getElementById('honorList');
    const sorted = [...allSkills].sort((a, b) => b.starlight - a.starlight).slice(0, 42);

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
          const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
          const isStarred = starredSkills[skill.id] === true;
          return `
            <div class="skill-item" data-skill-id="${skill.id}" data-is-starred="${isStarred}">
              <div class="skill-header">
                <div class="skill-title">${title}</div>
                <div class="skill-hash" title="Soul Hash: ${soulHashFull}">${soulHashShort || '—'}</div>
              </div>
              <div class="skill-creator">${creatorDisplay}</div>
              <div class="skill-desc">${shortDesc}</div>
              <div class="skill-footer">
                <div class="skill-meta">
                  <span class="skill-stars">⭐ ${skill.starlight_score || skill.stars || 0}</span>
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
  } // end initDomainGrid

  // Attach listeners to skill action buttons in archive grid
  function attachArchiveSkillListeners() {
    // Star buttons
    document.querySelectorAll('.domain-cell .star-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (btn.disabled) return;

        const skillId = btn.dataset.skillId;
        const skillItem = btn.closest('.skill-item');
        const downloadBtn = skillItem?.querySelector('.download-btn');
        const starCountEl = skillItem?.querySelector('.skill-stars');

        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
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
        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));

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
          alertI18n('warning_star_first');
          return;
        }

        const skillId = btn.dataset.skillId;
        const skill = findSkillById(skillId);
        if (skill) {
          const markdown = generateDomainSkillMarkdown(skill);
          downloadMarkdownFile(markdown, skillId, skill.title);
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

      const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');

      btns.forEach(btn => {
        const id = btn.dataset.skillId;
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

      localStorage.setItem('starred_skills', JSON.stringify(starredSkills));
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

  // Get top 42 skills sorted by starlight
  const topSkills = getTopSkills(42);

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
        <div class="top42-skill-title text-en">${titleEn}</div>
        <div class="top42-skill-title-cn text-cn">${titleCn}</div>
        <div class="top42-skill-desc text-en">${descEn}</div>
        <div class="top42-skill-desc text-cn">${descCn}</div>
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

/* ═══ UTILITY FUNCTIONS FOR SKILL INTERACTIONS ═══ */

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
        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
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
        localStorage.setItem('starred_skills', JSON.stringify(starredSkills));

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

        const starredSkills = JSON.parse(localStorage.getItem('starred_skills') || '{}');
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


function generateDomainSkillMarkdown(skill) {
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
/* ═══════════════ DASHBOARD CARD FUNCTIONS ═══════════════ */

/**
 * Check if user has created a Skill and display Dashboard card if exists
 */

