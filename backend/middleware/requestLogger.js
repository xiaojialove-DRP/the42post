/* ═══════════════════════════════════════════════════════
   Request Logger Middleware — Intelligent Filtering

   SECURITY: Routes that may contain sensitive data are logged
   without request bodies. This prevents logging of:
   - Passwords, API keys, tokens
   - User PII (emails, phone numbers)
   - LLM prompts (can contain ideas/intellectual property)
   ═══════════════════════════════════════════════════════ */

// Routes whose request bodies should NOT be logged (may contain sensitive data)
const SENSITIVE_ROUTES = [
  /^\/api\/auth\//,  // Authentication (passwords, tokens)
  /^\/api\/forge\/probe/,  // LLM calls (idea text is proprietary)
  /^\/api\/forge\/generate/,  // LLM calls (skill data is proprietary)
  /^\/api\/forge\/preview/,  // LLM calls (skill definitions)
  /^\/api\/playground\/test/,  // LLM calls (scenario text)
  /^\/api\/download/,  // May include user-specific content
];

// Query parameters that should be redacted
const REDACTED_PARAMS = new Set([
  'password',
  'token',
  'api_key',
  'apiKey',
  'secret',
  'email',
  'phone',
  'ssn',
  'credit_card',
  'cardNumber',
  'cvv'
]);

/**
 * Determine if a path is sensitive (should not log request body)
 */
function isSensitivePath(path) {
  return SENSITIVE_ROUTES.some(regex => regex.test(path));
}

/**
 * Redact sensitive query parameters
 */
function redactQueryParams(query) {
  if (!query) return '';

  const params = new URLSearchParams(query);
  for (const key of REDACTED_PARAMS) {
    if (params.has(key)) {
      params.set(key, '[REDACTED]');
    }
  }

  const redacted = params.toString();
  return redacted ? `?${redacted}` : '';
}

/**
 * Get a safe representation of the path for logging
 */
function getSafePath(path) {
  const [pathname, query] = path.split('?');
  const redactedQuery = query ? redactQueryParams(`?${query}`) : '';
  return pathname + redactedQuery;
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const safePath = getSafePath(path);
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Only log request body size for non-sensitive routes
  const isSensitive = isSensitivePath(path);
  const bodySize = req.headers['content-length'] || 0;

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const statusColor = status < 400 ? '✓' : status < 500 ? '⚠' : '✗';

    let logMessage = `${statusColor} [${timestamp}] ${method} ${safePath} ${status} (${duration}ms)`;

    // Add body size indicator for requests with payloads
    if (bodySize > 0) {
      logMessage += ` [${bodySize}B]`;
    }

    // Add sensitive indicator and IP
    if (isSensitive) {
      logMessage += ` [SENSITIVE]`;
    }

    logMessage += ` - ${ip}`;

    console.log(logMessage);
  });

  next();
}
