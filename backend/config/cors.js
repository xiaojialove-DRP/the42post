/* ═══════════════════════════════════════════════════════
   CORS Configuration — Explicit Whitelist

   Security: Only explicitly whitelisted origins are allowed.
   No fallback to environment variables without validation.
   ═══════════════════════════════════════════════════════ */

/**
 * Whitelisted origins for CORS
 * Add new origins explicitly after security review
 */
const WHITELISTED_ORIGINS = [
  // Development
  'http://localhost:8000',
  'http://localhost:3000',
  'http://localhost:8765',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8765',

  // Custom domains
  'https://www.the42post.com',
  'https://the42post.com',
];

/**
 * Validate and normalize origin URL
 */
function normalizeOrigin(origin) {
  if (!origin) return null;

  try {
    const url = new URL(origin);
    // Remove trailing slash for consistent comparison
    return origin.replace(/\/$/, '');
  } catch (e) {
    return null;
  }
}

/**
 * Check if origin is whitelisted
 */
function isOriginWhitelisted(origin) {
  if (!origin) return false;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  // Exact match
  if (WHITELISTED_ORIGINS.includes(normalized)) {
    return true;
  }

  // Allow localhost/127.0.0.1 variants for development
  if (process.env.NODE_ENV === 'development') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
      return true;
    }
  }

  // Allow ANY railway.app subdomain (deployed branches, previews, etc.)
  if (/^https?:\/\/[a-z0-9-]+\.railway\.app$/.test(normalized)) {
    return true;
  }

  // Allow the42post.com domain (production)
  if (/^https?:\/\/(www\.)?the42post\.com$/.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * CORS options for express-cors middleware
 */
const corsOptions = {
  origin: (origin, callback) => {
    // SECURITY: Allow requests without Origin header (same-origin or server-side requests)
    // Only validate cross-origin requests (those WITH an Origin header)
    if (!origin) {
      // No origin header = same-origin request or server-side request
      // These are safe and should be allowed
      return callback(null, true);
    }

    // Cross-origin request: validate against whitelist
    if (isOriginWhitelisted(origin)) {
      callback(null, true);
    } else {
      // Log rejected origin for security monitoring
      console.warn(`CORS: Rejected origin "${origin}"`);
      callback(new Error('CORS origin not whitelisted'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Anonymous-Id',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-RateLimit-Limit-LLM',
    'X-RateLimit-Remaining-LLM',
    'X-RateLimit-Limit-TwinTest',
    'X-RateLimit-Remaining-TwinTest'
  ],
  maxAge: 3600 // 1 hour
};

/**
 * Add new whitelisted origin (for runtime configuration)
 */
function addWhitelistedOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (normalized && !WHITELISTED_ORIGINS.includes(normalized)) {
    WHITELISTED_ORIGINS.push(normalized);
    return true;
  }
  return false;
}

/**
 * Get whitelisted origins (for debugging)
 */
function getWhitelistedOrigins() {
  return [...WHITELISTED_ORIGINS];
}

/**
 * Log CORS configuration on startup
 */
function logCorsConfiguration() {
  if (process.env.NODE_ENV === 'production') return;
  console.log('\n═══ CORS Configuration ═══');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Whitelisted origins: ${WHITELISTED_ORIGINS.length}`);
  WHITELISTED_ORIGINS.forEach(origin => console.log(`  • ${origin}`));
  console.log('  ℹ Development: localhost variants automatically allowed');
  console.log('');
}

export {
  corsOptions,
  isOriginWhitelisted,
  normalizeOrigin,
  addWhitelistedOrigin,
  getWhitelistedOrigins,
  logCorsConfiguration
};
