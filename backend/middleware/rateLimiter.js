/* ═══════════════════════════════════════════════════════
   Rate Limiting Middleware — Protect LLM Endpoints

   Implements sliding-window rate limiting per IP address.
   Separates limits for different endpoint categories:
   - LLM Generation: 10 req/min (expensive API calls)
   - Twin Test: 20 req/min (moderate load)
   - General: 100 req/min (most endpoints)
   ═══════════════════════════════════════════════════════ */

const WINDOW_MS = 60 * 1000; // 1 minute sliding window

// Store: { ip: { [key]: { timestamps: [], windowMs: number } } }
// Memory-based for simplicity; for production scale, use Redis
const requestTimestamps = new Map();

// Track the window size per key so the cleanup interval uses the correct window
const KEY_WINDOWS = {
  general: WINDOW_MS,
  llm: WINDOW_MS,
  twintest: WINDOW_MS,
  forge: 60 * 60 * 1000, // 1 hour
};

/**
 * Get IP address from request (handles proxies)
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.ip ||
         req.connection.remoteAddress ||
         'unknown';
}

/**
 * Clean old timestamps outside the window
 */
function cleanOldTimestamps(timestamps, now) {
  return timestamps.filter(ts => now - ts < WINDOW_MS);
}

/**
 * Generic rate limiter factory
 */
export function createRateLimiter(maxRequests, windowMs = WINDOW_MS) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    const ip = getClientIp(req);
    const now = Date.now();
    const key = `general`;

    if (!requestTimestamps.has(ip)) {
      requestTimestamps.set(ip, {});
    }

    const ipData = requestTimestamps.get(ip);
    if (!ipData[key]) {
      ipData[key] = [];
    }

    // Clean old timestamps
    ipData[key] = cleanOldTimestamps(ipData[key], now);

    // Check limit
    if (ipData[key].length >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${maxRequests} requests per ${Math.round(windowMs / 1000)} seconds.`,
        retryAfter: Math.ceil((ipData[key][0] + windowMs - now) / 1000)
      });
    }

    // Record this request
    ipData[key].push(now);

    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - ipData[key].length);
    res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    next();
  };
}

/**
 * LLM endpoint rate limiter (10 requests/minute)
 * Applied to: /api/forge/probe, /api/forge/preview, /api/forge/generate, /api/playground/test
 */
export const rateLimitLLM = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  const ip = getClientIp(req);
  const now = Date.now();
  const key = 'llm';
  const maxRequests = 10;

  if (!requestTimestamps.has(ip)) {
    requestTimestamps.set(ip, {});
  }

  const ipData = requestTimestamps.get(ip);
  if (!ipData[key]) {
    ipData[key] = [];
  }

  ipData[key] = cleanOldTimestamps(ipData[key], now);

  if (ipData[key].length >= maxRequests) {
    const oldestTs = ipData[key][0];
    const resetTime = Math.ceil((oldestTs + WINDOW_MS - now) / 1000);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `LLM generation limit (${maxRequests}/min) exceeded. Please wait before trying again.`,
      retryAfter: resetTime,
      remaining: maxRequests - ipData[key].length
    });
  }

  ipData[key].push(now);
  res.set('X-RateLimit-Limit-LLM', maxRequests);
  res.set('X-RateLimit-Remaining-LLM', maxRequests - ipData[key].length);

  next();
};

/**
 * Twin test rate limiter (20 requests/minute)
 * Applied to: /api/playground/test, /api/playground/vote
 */
export const rateLimitTwinTest = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  const ip = getClientIp(req);
  const now = Date.now();
  const key = 'twintest';
  const maxRequests = 20;

  if (!requestTimestamps.has(ip)) {
    requestTimestamps.set(ip, {});
  }

  const ipData = requestTimestamps.get(ip);
  if (!ipData[key]) {
    ipData[key] = [];
  }

  ipData[key] = cleanOldTimestamps(ipData[key], now);

  if (ipData[key].length >= maxRequests) {
    const oldestTs = ipData[key][0];
    const resetTime = Math.ceil((oldestTs + WINDOW_MS - now) / 1000);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Twin test limit (${maxRequests}/min) exceeded. Please wait before trying again.`,
      retryAfter: resetTime,
      remaining: maxRequests - ipData[key].length
    });
  }

  ipData[key].push(now);
  res.set('X-RateLimit-Limit-TwinTest', maxRequests);
  res.set('X-RateLimit-Remaining-TwinTest', maxRequests - ipData[key].length);

  next();
};

/**
 * Forge rate limiter — protect skill creation endpoint
 * 5 publishes per hour per identity (user > anon device > IP).
 * Each forge triggers translation + moderation LLM calls (paid),
 * plus DB writes — much more expensive than a normal API request.
 */
const FORGE_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const FORGE_MAX = 5;

export const rateLimitForge = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  // Identity precedence: authenticated user > anon device ID > IP
  const userId = req.user?.userId;
  const anonId = req.headers['x-anonymous-id'] || req.body?.anonymous_id;
  const ip = getClientIp(req);
  const identity = userId ? `user:${userId}` : (anonId ? `anon:${anonId}` : `ip:${ip}`);

  const now = Date.now();
  const key = 'forge';

  if (!requestTimestamps.has(identity)) {
    requestTimestamps.set(identity, {});
  }
  const data = requestTimestamps.get(identity);
  if (!data[key]) data[key] = [];

  // Sliding window cleanup
  data[key] = data[key].filter(ts => now - ts < FORGE_WINDOW_MS);

  if (data[key].length >= FORGE_MAX) {
    const oldestTs = data[key][0];
    const resetSec = Math.ceil((oldestTs + FORGE_WINDOW_MS - now) / 1000);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message_cn: `你已经在 1 小时内创建了 ${FORGE_MAX} 个 Skill。请稍后再来创作 ☕️`,
      message_en: `You've created ${FORGE_MAX} Skills in the past hour. Please come back later ☕️`,
      retryAfter: resetSec,
      limit: FORGE_MAX,
      window_seconds: Math.floor(FORGE_WINDOW_MS / 1000)
    });
  }

  data[key].push(now);
  res.set('X-RateLimit-Limit-Forge', FORGE_MAX);
  res.set('X-RateLimit-Remaining-Forge', FORGE_MAX - data[key].length);
  res.set('X-RateLimit-Reset-Forge', String(Math.ceil((now + FORGE_WINDOW_MS) / 1000)));

  next();
};

/**
 * Cleanup configuration
 */
const MAX_IPS_TRACKED = 10000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Safe min over an array — avoids stack overflow from Math.min(...bigArray)
 */
function safeMin(arr) {
  if (arr.length === 0) return Infinity;
  let min = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
  }
  return min;
}

/**
 * Cleanup old IPs from memory periodically.
 * Uses each key's own window size so forge (1h) entries are not evicted early.
 */
export const cleanupInterval = setInterval(() => {
  const now = Date.now();

  // Step 1: Clean expired timestamps using the correct window per key
  for (const [identity, data] of requestTimestamps.entries()) {
    let hasData = false;
    for (const key in data) {
      const windowMs = KEY_WINDOWS[key] ?? WINDOW_MS;
      data[key] = data[key].filter(ts => now - ts < windowMs);
      if (data[key].length > 0) {
        hasData = true;
      } else {
        delete data[key];
      }
    }
    if (!hasData) {
      requestTimestamps.delete(identity);
    }
  }

  // Step 2: Enforce capacity limit — evict identities with oldest activity first
  if (requestTimestamps.size > MAX_IPS_TRACKED) {
    const ipsArray = Array.from(requestTimestamps.entries());
    ipsArray.sort((a, b) => {
      const aTs = Object.values(a[1]).flatMap(arr => arr);
      const bTs = Object.values(b[1]).flatMap(arr => arr);
      return safeMin(aTs) - safeMin(bTs);
    });

    // Evict oldest entries until back at 90% capacity
    const targetSize = Math.floor(MAX_IPS_TRACKED * 0.9);
    const toEvict = ipsArray.length - targetSize;
    for (let i = 0; i < toEvict; i++) {
      requestTimestamps.delete(ipsArray[i][0]);
    }
  }
}, CLEANUP_INTERVAL);
