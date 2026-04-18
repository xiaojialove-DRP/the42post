/* ═══════════════════════════════════════════════════════
   THE 42 POST — Frontend API Client
   Handles authentication, requests, error handling
   ═══════════════════════════════════════════════════════ */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = '42post_jwt_token';
const USER_KEY = '42post_user';

/* ═══ AUTH TOKEN MANAGEMENT ═══ */
export const auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
  }
};

/* ═══ FETCH WRAPPER ═══ */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add JWT token if authenticated
  const token = auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      auth.logout();
      window.location.href = '/login';
      return { error: 'Unauthorized', status: 401 };
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || 'Request failed',
        message: data.message,
        status: response.status,
        ...data
      };
    }

    return { success: true, ...data };
  } catch (err) {
    return {
      error: 'Network error',
      message: err.message,
      originalError: err
    };
  }
}

/* ═══ AUTHENTICATION API ═══ */
export const authAPI = {
  async register(username, email, password) {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  },

  async login(email, password) {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (result.success && result.token) {
      auth.setToken(result.token);
      auth.setUser(result.user);
    }

    return result;
  },

  async verify(token) {
    return apiCall(`/auth/verify/${token}`, { method: 'GET' });
  },

  async getMe() {
    return apiCall('/auth/me', { method: 'GET' });
  },

  async updateProfile(updates) {
    return apiCall('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }
};

/* ═══ FORGE API (Skill Creation) ═══ */
export const forgeAPI = {
  async generateProbe(ideaText, language = 'en') {
    return apiCall('/forge/probe', {
      method: 'POST',
      body: JSON.stringify({
        idea_text: ideaText,
        language: language
      })
    });
  },

  async generateSkill(skillName, ideaText, probeData, selectedResponse, domain = 'ideas', language = 'en') {
    return apiCall('/forge/generate', {
      method: 'POST',
      body: JSON.stringify({
        skill_name: skillName,
        idea_text: ideaText,
        probe_data: probeData,
        selected_response: selectedResponse,
        domain: domain,
        language: language
      })
    });
  }
};

/* ═══ SKILLS API ═══ */
export const skillsAPI = {
  async getAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      domain = null,
      author = null,
      search = null
    } = options;

    const params = new URLSearchParams({
      page,
      limit,
      ...(domain && { domain }),
      ...(author && { author }),
      ...(search && { search })
    });

    return apiCall(`/skills?${params.toString()}`, { method: 'GET' });
  },

  async getById(skillId) {
    return apiCall(`/skills/${skillId}`, { method: 'GET' });
  },

  async getVersions(skillId) {
    return apiCall(`/skills/${skillId}/versions`, { method: 'GET' });
  },

  async publish(skillDraft, options = {}) {
    const {
      commercialUse = 'authorized',
      remixAllowed = 'share-alike'
    } = options;

    return apiCall('/skills', {
      method: 'POST',
      body: JSON.stringify({
        ...skillDraft,
        commercial: commercialUse,
        remix: remixAllowed
      })
    });
  },

  async update(skillId, updates) {
    return apiCall(`/skills/${skillId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async delete(skillId) {
    return apiCall(`/skills/${skillId}`, { method: 'DELETE' });
  },

  async addComment(skillId, content, rating = null) {
    return apiCall(`/skills/${skillId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, rating })
    });
  },

  async getComments(skillId) {
    return apiCall(`/skills/${skillId}/comments`, { method: 'GET' });
  }
};

/* ═══ SEARCH API ═══ */
export const searchAPI = {
  async search(query, filters = {}) {
    const {
      type = 'skills', // 'skills', 'creators', 'all'
      domain = null,
      limit = 20
    } = filters;

    const params = new URLSearchParams({
      q: query,
      type,
      limit,
      ...(domain && { domain })
    });

    return apiCall(`/search?${params.toString()}`, { method: 'GET' });
  }
};

/* ═══ AGENTS API ═══ */
export const agentsAPI = {
  async list(options = {}) {
    const params = new URLSearchParams(options);
    return apiCall(`/agents?${params.toString()}`, { method: 'GET' });
  },

  async getById(agentId) {
    return apiCall(`/agents/${agentId}`, { method: 'GET' });
  },

  async bind(agentInfo) {
    return apiCall('/agents/bind', {
      method: 'POST',
      body: JSON.stringify(agentInfo)
    });
  },

  async addSkill(agentId, skillId) {
    return apiCall(`/agents/${agentId}/skills`, {
      method: 'POST',
      body: JSON.stringify({ skill_id: skillId })
    });
  },

  async removeSkill(agentId, skillId) {
    return apiCall(`/agents/${agentId}/skills/${skillId}`, {
      method: 'DELETE'
    });
  }
};

export default {
  auth,
  authAPI,
  forgeAPI,
  skillsAPI,
  searchAPI,
  agentsAPI,
  apiCall
};
