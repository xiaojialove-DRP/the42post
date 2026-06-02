/* ═══════════════════════════════════════════════════════
   THE 42 POST — Shared Utilities
   ═══════════════════════════════════════════════════════ */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let notyfInstance = null;
function initNotyf() {
  if (notyfInstance) return notyfInstance;
  if (typeof Notyf === 'undefined') return null;
  notyfInstance = new Notyf({
    duration: 4000,
    position: { x: 'right', y: 'top' },
    types: [
      { type: 'success', background: '#10b981' },
      { type: 'error',   background: '#ef4444' },
      { type: 'warning', background: '#f59e0b' },
      { type: 'info',    background: '#3b82f6' }
    ]
  });
  return notyfInstance;
}

function showToast(message, type = 'success') {
  const notyf = initNotyf();
  if (notyf) notyf.open({ type, message });
  else console.log(`[${type.toUpperCase()}] ${message}`);
}
function showSuccess(message) { showToast(message, 'success'); }
function showError(message)   { showToast(message, 'error'); }
function showWarning(message) { showToast(message, 'warning'); }
function showInfo(message)    { showToast(message, 'info'); }

// Override native alert with i18n-aware toast
window.alert = function(message) {
  const m = String(message).toLowerCase();
  if (m.includes('error') || m.includes('failed') || m.includes('invalid') || m.includes('missing')) {
    showError(message);
  } else if (m.includes('success') || m.includes('✓') || m.includes('已')) {
    showSuccess(message);
  } else {
    showInfo(message);
  }
};

function getDefaultAPIUrl() {
  const stored = localStorage.getItem('42post_api_url');
  if (stored) return stored;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return `${window.location.protocol}//${window.location.host}/api`;
}

const API_CONFIG = {
  BASE_URL: getDefaultAPIUrl(),
  TOKEN_KEY: '42post_jwt_token',
  USER_KEY: '42post_user',
  ANON_ID_KEY: '42post_anon_id'
};

function getAnonymousId() {
  let id = localStorage.getItem(API_CONFIG.ANON_ID_KEY);
  if (!id) {
    id = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(API_CONFIG.ANON_ID_KEY, id);
  }
  return id;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
