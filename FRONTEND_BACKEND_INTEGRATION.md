# Frontend-Backend Integration Guide

## Overview

This document describes how the frontend (表皮 - user-facing UI) connects to the backend (内胆 - machine execution layer).

## Current State

**Frontend** (`/frontend/`):
- Pure client-side implementation with localStorage persistence
- Demo data in `skills.js`
- Local probe/skill generation using templates
- No authentication

**Backend** (`/backend/`):
- Express.js REST API with PostgreSQL
- Claude API integration for intelligent generation
- JWT-based authentication
- Full five-layer skill generation
- Soul-Hash & manifest signing

## Integration Steps

### Phase 1: Authentication (STEP 1)

#### Frontend Changes

**Update**: `index.html` STEP 1 section

```html
<!-- Before: Simple inputs with no backend -->
<input id="forgeEmail" placeholder="your@email.com" />
<input id="forgeUsername" placeholder="your_knight_name" />

<!-- After: Connect to backend -->
```

**Update**: `script.js` - Add auth handler

```javascript
// New: Initialize backend connection
const API_BASE = 'http://localhost:3000/api';
let authToken = localStorage.getItem('auth_token');

// New: Register flow (STEP 1)
document.getElementById('btnRegister').addEventListener('click', async () => {
  const email = document.getElementById('forgeEmail').value;
  const username = document.getElementById('forgeUsername').value;
  const password = document.getElementById('forgePassword').value;
  const accountType = window.forgeMode === 'shadow' ? 'shadow_agent' : 'direct_knight';

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        password,
        account_type: accountType
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(`Registration failed: ${data.error}`);
      return;
    }

    // Auto-login after registration
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user_id', loginData.user.id);

    alert('✓ Account created and verified!');
    // Proceed to STEP 2
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});
```

### Phase 2: Intuition Probe (STEP 2 - Part 1)

#### Frontend Changes

**Update**: `script.js` - Replace local probe generation with API call

```javascript
// Before: Local template-based generation
function generateProbeFromIdea(ideaText) {
  const probes = PROBE_TEMPLATES.find(t => ...);
  return { scenario: ..., thesis: ..., antithesis: ..., extreme: ... };
}

// After: API-based generation
async function generateProbeFromIdea(ideaText) {
  const response = await fetch(`${API_BASE}/forge/probe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      idea_text: ideaText,
      language: document.body.dataset.lang || 'en'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data.probe; // { scenario, thesis, antithesis, extreme }
}
```

**Update**: `script.js` - Add loading state for long-running Claude API call

```javascript
const btnAutoStructure = document.getElementById('btnAutoStructure');
if (btnAutoStructure) {
  btnAutoStructure.addEventListener('click', async () => {
    const ideaText = document.getElementById('forgeNativeText').value.trim();
    if (!ideaText) {
      alert('Please describe your idea first');
      return;
    }

    btnAutoStructure.textContent = '⏳ GENERATING INTUITION PROBE...';
    btnAutoStructure.disabled = true;

    try {
      const probe = await generateProbeFromIdea(ideaText);
      probeState.scenario = probe.scenario;
      
      // Populate UI
      document.getElementById('probeThesis').textContent = probe.thesis;
      document.getElementById('probeAntithesis').textContent = probe.antithesis;
      document.getElementById('probeExtreme').textContent = probe.extreme;

      // Show probe section
      document.getElementById('probeSection').style.display = 'block';
      document.getElementById('probeCards').style.display = 'grid';

      // Re-initialize probe interaction
      initProbeInteraction();

    } catch (error) {
      alert(`Probe generation failed: ${error.message}`);
    } finally {
      btnAutoStructure.textContent = '🎲 INTUITION PROBE';
      btnAutoStructure.disabled = false;
    }
  });
}
```

### Phase 3: Five-Layer Generation (STEP 2 - Part 2)

#### Frontend Changes

**Update**: `script.js` - Replace local generation with API call

```javascript
// Before: Local template-based generation
function generateFiveLayerSkill() {
  // ... build from templates and patterns
  const fiveLayerSkill = { ... };
  probeState.fiveLayerSkill = fiveLayerSkill;
}

// After: API-based generation with Claude
async function generateFiveLayerSkill() {
  const skillName = document.getElementById('forgeSkillName').value;
  const ideaText = document.getElementById('forgeNativeText').value;
  const selectedProbe = Object.keys(probeState.responses)
    .find(k => probeState.responses[k] === 'selected');

  const response = await fetch(`${API_BASE}/forge/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      skill_name: skillName,
      idea_text: ideaText,
      probe_data: {
        scenario: probeState.scenario,
        thesis: document.getElementById('probeThesis').textContent,
        antithesis: document.getElementById('probeAntithesis').textContent,
        extreme: document.getElementById('probeExtreme').textContent
      },
      selected_response: selectedProbe,
      domain: selectedDomain || 'ideas',
      language: document.body.dataset.lang || 'en'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  probeState.fiveLayerSkill = data.skill_draft;
  window.agent42StructuredData = data.skill_draft;

  // Show generation progress
  showGenerationProgress();
}
```

### Phase 4: Publishing (STEP 4)

#### Frontend Changes

**Update**: `script.js` - Replace localStorage with API call

```javascript
// Before: Save to localStorage
function saveForgedSkill(skillData) {
  let recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
  recentSkills.unshift(skillData);
  localStorage.setItem('42post_recent_forges', JSON.stringify(recentSkills));
}

// After: Publish to backend
async function publishSkill(skillData) {
  const response = await fetch(`${API_BASE}/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      title: skillData.title,
      title_cn: skillData.title_cn,
      description: skillData.desc,
      description_cn: skillData.descCn,
      domain: skillData.domain,
      five_layer: skillData.fiveLayerSkill,
      forge_mode: skillData.forgeMode,
      source_agent_id: skillData.sourceData?.sourceAgentId,
      commercial_use: skillData.commercial,
      remix_allowed: skillData.remix !== 'no',
      applicable_when: skillData.useCases?.split('\n').filter(Boolean),
      disallowed_uses: skillData.disallowedUses?.split('\n').filter(Boolean)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return {
    skill_id: data.skill.id,
    soul_hash: data.skill.soul_hash,
    manifest: data.manifest
  };
}

// Update publish button handler
const publishBtn = document.getElementById('btnPublish');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    if (publishBtn.disabled) return;

    publishBtn.textContent = '⚔ FORGING...';
    publishBtn.disabled = true;

    try {
      const result = await publishSkill(forgedSkillData);
      
      // Update manifest record for Knight Card
      forgedSkillData.soul_hash = result.soul_hash;
      forgedSkillData.manifest = result.manifest;

      publishBtn.textContent = `✓ FORGED | ${result.soul_hash}`;
      publishBtn.style.background = 'var(--accent-green)';

      // Show Knight Card with manifest
      if (knightCardSection) {
        knightCardSection.classList.add('visible');
        generateKnightCard(result.soul_hash);
      }

    } catch (error) {
      alert(`Publishing failed: ${error.message}`);
      publishBtn.textContent = '⚔ PUBLISH & FORGE';
      publishBtn.disabled = false;
    }
  });
}
```

### Phase 5: Skill Discovery

#### Frontend Changes

**Update**: `initSkillGrids()` - Fetch from API instead of static array

```javascript
// Before: Use SHARED_SKILLS static array
function initSkillGrids() {
  const voicesGrid = document.getElementById('voices-grid');
  voicesGrid.innerHTML = SHARED_SKILLS.slice(0, 6).map(skill => ...);
}

// After: Fetch from backend
async function initSkillGrids() {
  try {
    const response = await fetch(`${API_BASE}/skills?limit=6`);
    if (!response.ok) throw new Error('Failed to fetch skills');
    
    const data = await response.json();
    const voicesGrid = document.getElementById('voices-grid');
    
    voicesGrid.innerHTML = data.skills.map(skill => `
      <div class="skill-card" onclick="showSkillDetail('${skill.id}')">
        <div class="skill-card-header">
          <span class="skill-title">${skill.title}</span>
        </div>
        <div class="skill-card-desc">${skill.description?.substring(0, 70)}...</div>
        <div class="skill-card-footer">
          <span class="skill-author">by ${skill.username}</span>
          <span class="skill-domain">${skill.domain}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load skills:', error);
    // Fallback to static data
  }
}
```

**Update**: `showSkillDetail()` - Fetch full skill data from API

```javascript
// Before: Pull from memory
async function showSkillDetail(skillId) {
  const skill = SHARED_SKILLS.find(s => s.id === skillId);
  // ... show modal with skill data
}

// After: Fetch from API
async function showSkillDetail(skillId) {
  try {
    const response = await fetch(`${API_BASE}/skills/${skillId}`);
    if (!response.ok) throw new Error('Failed to fetch skill');

    const data = await response.json();
    const skill = data.skill;

    // Render skill detail modal
    const modal = document.getElementById('skillDetailModal');
    modal.innerHTML = `
      <div class="skill-detail-content">
        <div class="skill-detail-left">
          <h2>${skill.title}</h2>
          <p>${skill.description}</p>
          
          <div class="five-layers">
            <div class="layer">
              <h4>Defining</h4>
              <p>${skill.five_layer.defining.principle}</p>
            </div>
            <!-- ... other layers ... -->
          </div>
        </div>
        
        <div class="skill-detail-right">
          <div class="metadata">
            <p>Author: <strong>${skill.username}</strong></p>
            <p>Domain: <strong>${skill.domain}</strong></p>
            <p>Soul Hash: <code>${skill.soul_hash}</code></p>
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'block';
  } catch (error) {
    alert(`Failed to load skill: ${error.message}`);
  }
}
```

## API Error Handling

Create a utility function for consistent error handling:

```javascript
// utils/api.js
export const API_BASE = 'http://localhost:3000/api';

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.message || data.error,
      details: data
    };
  }

  return data;
}

// Usage:
try {
  const result = await apiCall('/forge/probe', {
    method: 'POST',
    body: JSON.stringify({ idea_text: '...' })
  });
} catch (error) {
  console.error(`[${error.status}] ${error.message}`);
}
```

## Development Workflow

### 1. Start Backend

```bash
cd backend
npm install
npm run migrate
npm run dev
# Server runs on http://localhost:3000
```

### 2. Start Frontend

```bash
cd frontend
python3 -m http.server 8000
# Frontend runs on http://localhost:8000
```

### 3. Test Integration

- Go to `http://localhost:8000`
- Register new account (STEP 1)
- Enter idea and generate probe (STEP 2)
- Select probe response and generate skill (STEP 2-3)
- Refine and publish skill (STEP 4)
- Skill appears in archive (discovery)

## Performance Considerations

### Claude API Rate Limiting

Implement in frontend before calling `/api/forge/probe` and `/api/forge/generate`:

```javascript
const probeRateLimit = { lastCall: 0, minDelay: 2000 }; // 2 second delay

async function generateProbeFromIdea(ideaText) {
  const now = Date.now();
  const timeSinceLastCall = now - probeRateLimit.lastCall;
  
  if (timeSinceLastCall < probeRateLimit.minDelay) {
    await new Promise(resolve => 
      setTimeout(resolve, probeRateLimit.minDelay - timeSinceLastCall)
    );
  }

  probeRateLimit.lastCall = Date.now();
  // ... make API call
}
```

### Caching Strategy

Cache skills in localStorage to reduce API calls:

```javascript
function getCachedSkill(skillId) {
  return JSON.parse(localStorage.getItem(`skill_${skillId}`));
}

function setCachedSkill(skill) {
  localStorage.setItem(`skill_${skill.id}`, JSON.stringify(skill));
  // Clear cache after 1 hour
  setTimeout(() => localStorage.removeItem(`skill_${skill.id}`), 3600000);
}
```

## Testing Checklist

- [ ] User registration with email verification
- [ ] Probe generation with Claude API
- [ ] Five-layer skill generation with Claude API
- [ ] Skill publishing with soul-hash & manifest
- [ ] Skill retrieval and display
- [ ] Full-text search
- [ ] Author can update/delete their skills
- [ ] Multi-stakeholder covenant signing
- [ ] Agent binding (Direct Knight mode)

## Troubleshooting

### CORS Errors

If you see `Access to XMLHttpRequest from origin 'http://localhost:8000' has been blocked...`:

1. Ensure backend has correct CORS origin:
   ```javascript
   // backend/server.js
   app.use(cors({
     origin: 'http://localhost:8000',
     credentials: true
   }));
   ```

2. Check `FRONTEND_URL` in `.env`:
   ```
   FRONTEND_URL=http://localhost:8000
   ```

### JWT Token Errors

- "Invalid token" → Check `JWT_SECRET` is set correctly
- "Token expired" → User needs to log in again
- Make sure token is in `Authorization: Bearer <token>` header

### Claude API Errors

- "Rate limit exceeded" → Wait and retry, implement backoff
- "Invalid API key" → Check `ANTHROPIC_API_KEY` in `.env`
- "Token limit exceeded" → Response is too long, truncate input

## Next Steps

1. Update frontend auth flow to use backend
2. Replace probe generation with Claude API calls
3. Replace five-layer generation with Claude API calls
4. Replace localStorage with API persistence
5. Update skill discovery to fetch from API
6. Deploy backend to production (Heroku/Railway)
7. Update frontend FRONTEND_URL to production backend
