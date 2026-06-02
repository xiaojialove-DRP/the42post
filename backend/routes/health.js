/* ═══════════════════════════════════════════════════════
   Health Check Endpoint

   Provides comprehensive health status including:
   - Server status
   - Database connectivity
   - External services (LLM, Email, Redis if available)
   - Resource usage
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { getCache } from '../utils/cache.js';

const router = express.Router();

// Get db from global context to avoid circular imports
function getDb() {
  return global.__db__ || null;
}

/**
 * Lightweight health check (for load balancers)
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * Detailed health check with dependency status
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: { status: 'ok', version: '0.1.0' },
      database: { status: 'unknown' },
      cache: { status: 'unknown' },
      llm: { status: 'unknown' },
      email: { status: 'unknown' }
    },
    resources: {
      memory: {},
      cpu: {}
    }
  };

  // ═══ CHECK DATABASE ═══
  try {
    const db = getDb();
    if (!db) {
      health.services.database = {
        status: 'down',
        error: 'Database not available'
      };
    } else {
      const dbStart = Date.now();
      const result = await db.query('SELECT 1 as health_check');
      const dbTime = Date.now() - dbStart;

      if (result && result.rows && result.rows.length > 0) {
        health.services.database = {
          status: 'ok',
          responseTime: `${dbTime}ms`
        };
      } else {
        health.services.database = {
          status: 'degraded',
          message: 'Database returned empty result'
        };
      }
    }
  } catch (err) {
    health.services.database = {
      status: 'down',
      error: err.message
    };
  }

  // ═══ CHECK CACHE ═══
  try {
    const cache = getCache();
    const cacheStats = await cache.getStats?.();

    health.services.cache = {
      status: 'ok',
      type: cache.useRedis ? 'redis+memory' : 'memory',
      size: cacheStats?.memory?.cacheSize || 0
    };
  } catch (err) {
    health.services.cache = {
      status: 'degraded',
      error: err.message
    };
  }

  // ═══ CHECK LLM ═══
  if (process.env.DEEPSEEK_API_KEY) {
    health.services.llm = {
      status: 'configured',
      provider: 'DeepSeek' + (process.env.ANTHROPIC_API_KEY ? ' + Claude fallback' : ''),
      configured: true
    };
  } else if (process.env.ANTHROPIC_API_KEY) {
    health.services.llm = {
      status: 'configured',
      provider: 'Claude (Anthropic)',
      configured: true
    };
  } else {
    health.services.llm = {
      status: 'not_configured',
      message: 'DEEPSEEK_API_KEY not set'
    };
  }

  // ═══ CHECK EMAIL SERVICE ═══
  if (process.env.RESEND_API_KEY) {
    health.services.email = {
      status: 'configured',
      provider: 'Resend',
      configured: true
    };
  } else {
    health.services.email = {
      status: 'not_configured',
      message: 'RESEND_API_KEY not set'
    };
  }

  // ═══ MEMORY USAGE ═══
  const memUsage = process.memoryUsage();
  health.resources.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
  };

  // ═══ DETERMINE OVERALL STATUS ═══
  const criticalServices = [health.services.api, health.services.database];
  const criticalDown = criticalServices.some(s => s.status === 'down');
  const criticalDegraded = criticalServices.some(s => s.status === 'degraded');

  if (criticalDown) {
    health.status = 'down';
    res.status(503); // Service Unavailable
  } else if (criticalDegraded) {
    health.status = 'degraded';
    res.status(200);
  } else {
    health.status = 'healthy';
    res.status(200);
  }

  res.json(health);
});

/**
 * Readiness probe (for Kubernetes/orchestrators)
 * Returns 200 only if system is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const db = getDb();
    if (!db) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not available'
      });
    }

    const result = await db.query('SELECT 1 as ready_check');

    if (result && result.rows && result.rows.length > 0) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        reason: 'Database not responding'
      });
    }
  } catch (err) {
    res.status(503).json({
      ready: false,
      reason: err.message
    });
  }
});

/**
 * Liveness probe (for Kubernetes/orchestrators)
 * Returns 200 if the process is alive (even if degraded)
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
