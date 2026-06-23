/* ═══════════════════════════════════════════════════════
   Minimal structured logger
   - debug: suppressed in production (verbose/dev-only detail)
   - info/warn/error: always shown, including in production

   info used to be suppressed in production too, which silently
   discarded the only success-path visibility into critical flows
   (LLM calls, skill saves) — exactly the data needed to diagnose a
   production-only bug (e.g. a Skill answering in the wrong language)
   that never throws and so never hits warn/error.

   Call sites that want a structured/greppable line can pass a plain
   object as the last argument — it gets JSON-stringified — but plain
   string args still work exactly as before (kept ...args, not a fixed
   (message, meta) signature, so the ~30 existing call sites across
   server.js/backupScheduler.js needed no changes).
   ═══════════════════════════════════════════════════════ */

const isProd = process.env.NODE_ENV === 'production';

function stringifyObjectArgs(args) {
  return args.map(a => (a && typeof a === 'object' && !(a instanceof Error)) ? JSON.stringify(a) : a);
}

export const logger = {
  debug: (...args) => { if (!isProd) console.log('[debug]', ...stringifyObjectArgs(args)); },
  info:  (...args) => console.log('[info]', ...stringifyObjectArgs(args)),
  warn:  (...args) => console.warn('[warn]', ...stringifyObjectArgs(args)),
  error: (...args) => console.error('[error]', ...stringifyObjectArgs(args)),
};
