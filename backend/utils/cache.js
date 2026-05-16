/* ═══════════════════════════════════════════════════════
   Intelligent Multi-Layer Caching System

   Provides:
   1. In-memory cache (always available, Node.js process)
   2. Optional Redis cache (if available, shared across processes)
   3. Automatic cache warming and invalidation
   4. TTL management with smart expiration
   ═══════════════════════════════════════════════════════ */

const CACHE_TTL = {
  SKILLS_LIST: 5 * 60 * 1000,        // 5 minutes - published skills list
  SKILL_DETAIL: 10 * 60 * 1000,      // 10 minutes - individual skill detail
  SKILL_STATS: 15 * 60 * 1000,       // 15 minutes - aggregate stats
  USER_PROFILE: 10 * 60 * 1000,      // 10 minutes - user data
  SEARCH_RESULTS: 3 * 60 * 1000,     // 3 minutes - search results (high change rate)
  HEALTH_CHECK: 30 * 1000,           // 30 seconds - health status
};

// ═══ IN-MEMORY CACHE ═══
class MemoryCache {
  constructor(maxSize = 5000) {
    this.store = new Map();
    this.timers = new Map();
    this.maxSize = maxSize;
    this.accessOrder = []; // LRU tracking
  }

  set(key, value, ttlMs = 5 * 60 * 1000) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Capacity check: evict LRU entry if necessary
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.delete(lruKey);
      }
    }

    // Store value
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs
    });

    // Update access order for LRU
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key); // uses delete() to also clearTimeout
      return null;
    }

    // Update LRU access order on read
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(key);

    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.store.delete(key);
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }

  /**
   * Get memory usage statistics
   */
  getStats() {
    return {
      cacheSize: this.store.size,
      estimatedBytes: JSON.stringify(Array.from(this.store.values())).length,
      ttlsActive: this.timers.size
    };
  }
}

// ═══ REDIS CACHE (Optional) ═══
class RedisCache {
  constructor(redisClient) {
    this.redis = redisClient;
    this.prefix = 'the42post:';
  }

  async set(key, value, ttlMs = 5 * 60 * 1000) {
    try {
      const fullKey = this.prefix + key;
      const ttlSeconds = Math.floor(ttlMs / 1000);
      await this.redis.setex(
        fullKey,
        ttlSeconds,
        JSON.stringify(value)
      );
    } catch (err) {
      console.warn('Redis cache SET failed:', err.message);
      // Fail silently - don't break the app if Redis is unavailable
    }
  }

  async get(key) {
    try {
      const fullKey = this.prefix + key;
      const value = await this.redis.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.warn('Redis cache GET failed:', err.message);
      return null;
    }
  }

  async has(key) {
    try {
      const fullKey = this.prefix + key;
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (err) {
      console.warn('Redis cache EXISTS failed:', err.message);
      return false;
    }
  }

  async delete(key) {
    try {
      const fullKey = this.prefix + key;
      await this.redis.del(fullKey);
    } catch (err) {
      console.warn('Redis cache DEL failed:', err.message);
    }
  }

  async clear() {
    try {
      const pattern = this.prefix + '*';
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      console.warn('Redis cache CLEAR failed:', err.message);
    }
  }
}

// ═══ MULTI-LAYER CACHE MANAGER ═══
class CacheManager {
  constructor(redisClient = null) {
    this.memory = new MemoryCache();
    this.redis = redisClient ? new RedisCache(redisClient) : null;
    this.useRedis = !!redisClient;

    if (this.useRedis) {
      console.log('✓ Redis cache enabled');
    } else {
      console.log('⚠ Redis cache unavailable, using memory-only cache');
    }
  }

  /**
   * Set value in both layers (memory + Redis if available)
   */
  async set(key, value, ttlType = 'SKILLS_LIST') {
    const ttlMs = CACHE_TTL[ttlType] || CACHE_TTL.SKILLS_LIST;

    // Always set in memory (fast)
    this.memory.set(key, value, ttlMs);

    // Also set in Redis if available (shared across processes)
    if (this.useRedis) {
      await this.redis.set(key, value, ttlMs);
    }
  }

  /**
   * Get value from fastest available layer (memory first, then Redis)
   */
  async get(key) {
    // Try memory cache first (fastest)
    const memValue = this.memory.get(key);
    if (memValue !== null) {
      return memValue;
    }

    // Fall back to Redis if available
    if (this.useRedis) {
      const redisValue = await this.redis.get(key);
      if (redisValue !== null) {
        // Warm memory cache from Redis
        this.memory.set(key, redisValue);
        return redisValue;
      }
    }

    return null;
  }

  /**
   * Check if key exists in any layer
   */
  async has(key) {
    return (this.memory.has(key)) || (this.useRedis && await this.redis.has(key));
  }

  /**
   * Delete from all layers
   */
  async delete(key) {
    this.memory.delete(key);
    if (this.useRedis) {
      await this.redis.delete(key);
    }
  }

  /**
   * Clear all caches
   */
  async clear() {
    this.memory.clear();
    if (this.useRedis) {
      await this.redis.clear();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const memStats = this.memory.getStats();
    return {
      memory: memStats,
      redis: this.useRedis ? 'enabled' : 'disabled',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Invalidate pattern-matched keys (e.g., all skill_* keys)
   */
  async invalidatePattern(pattern) {
    // Memory cache: iterate and delete matching keys
    for (const key of this.memory.store.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.memory.delete(key);
      }
    }

    // Redis: delete only matching keys, not the entire store
    if (this.useRedis) {
      try {
        const fullPattern = this.redis.prefix + pattern.replace('*', '*');
        const keys = await this.redis.redis.keys(fullPattern);
        if (keys.length > 0) {
          await this.redis.redis.del(...keys);
        }
      } catch (err) {
        console.warn('Redis invalidatePattern failed:', err.message);
      }
    }
  }

  matchesPattern(key, pattern) {
    // Simple glob-style pattern matching
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(key);
  }
}

// ═══ SINGLETON INSTANCE ═══
let cacheManager = null;

export function initializeCache(redisClient = null) {
  cacheManager = new CacheManager(redisClient);
  return cacheManager;
}

export function getCache() {
  if (!cacheManager) {
    cacheManager = new CacheManager(); // Default: memory-only
  }
  return cacheManager;
}

// ═══ EXPORTS ═══
export { CACHE_TTL, MemoryCache, RedisCache, CacheManager };
