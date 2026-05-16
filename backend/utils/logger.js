/* ═══════════════════════════════════════════════════════
   Minimal structured logger
   - debug/info: suppressed in production
   - warn/error: always shown
   ═══════════════════════════════════════════════════════ */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  debug: (...args) => { if (!isProd) console.log('[debug]', ...args); },
  info:  (...args) => { if (!isProd) console.log('[info]',  ...args); },
  warn:  (...args) => console.warn('[warn]',  ...args),
  error: (...args) => console.error('[error]', ...args),
};
