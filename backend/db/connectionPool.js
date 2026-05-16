/* ═══════════════════════════════════════════════════════
   Database Connection Pool Manager

   Manages connection pooling for efficient resource usage.
   Includes connection reuse, health checking, and cleanup.
   ═══════════════════════════════════════════════════════ */

class ConnectionPool {
  constructor(db, options = {}) {
    this.db = db;
    this.maxConnections = options.maxConnections || 10;
    this.idleTimeout = options.idleTimeout || 30 * 1000; // 30 seconds
    this.acquireTimeout = options.acquireTimeout || 10 * 1000; // 10 seconds
    this.queryTimeout = options.queryTimeout || 30 * 1000; // 30 seconds

    this.activeConnections = new Set();
    this.idleConnections = [];
    this.waitingRequests = [];

    this.stats = {
      totalAcquired: 0,
      totalReleased: 0,
      peakConnections: 0,
      queryCount: 0,
      errorCount: 0
    };

    // Start idle connection cleanup
    this.startCleanupTimer();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire() {
    // Try to get idle connection first
    const idle = this.idleConnections.pop();
    if (idle) {
      this.activeConnections.add(idle);
      this.stats.totalAcquired++;
      return idle;
    }

    // Create new connection if under limit
    if (this.activeConnections.size < this.maxConnections) {
      try {
        const conn = await this.db.connect();
        this.activeConnections.add(conn);
        this.stats.totalAcquired++;
        this.updatePeakConnections();
        return conn;
      } catch (err) {
        this.stats.errorCount++;
        throw new Error(`Failed to acquire database connection: ${err.message}`);
      }
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.waitingRequests.indexOf(request);
        if (idx !== -1) {
          this.waitingRequests.splice(idx, 1);
        }
        this.stats.errorCount++;
        reject(new Error('Connection acquisition timeout'));
      }, this.acquireTimeout);

      const request = { resolve, reject, timeout };
      this.waitingRequests.push(request);
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(conn) {
    if (!conn) return;

    this.activeConnections.delete(conn);
    this.stats.totalReleased++;

    // Try to fulfill waiting request first
    if (this.waitingRequests.length > 0) {
      const request = this.waitingRequests.shift();
      clearTimeout(request.timeout);
      this.activeConnections.add(conn);
      request.resolve(conn);
      return;
    }

    // Otherwise, add to idle pool
    this.idleConnections.push({
      connection: conn,
      idledAt: Date.now()
    });
  }

  /**
   * Execute query with automatic connection management
   */
  async query(sql, params = []) {
    const conn = await this.acquire();
    try {
      this.stats.queryCount++;

      // Set query timeout
      const queryPromise = conn.query(sql, params);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout)
      );

      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (err) {
      this.stats.errorCount++;
      throw err;
    } finally {
      this.release(conn);
    }
  }

  /**
   * Start periodic cleanup of idle connections
   */
  startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toRemove = [];

      for (let i = 0; i < this.idleConnections.length; i++) {
        const { idledAt } = this.idleConnections[i];
        if (now - idledAt > this.idleTimeout) {
          toRemove.push(i);
        }
      }

      // Remove expired idle connections (from end to avoid index shifts)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const { connection } = this.idleConnections[toRemove[i]];
        this.idleConnections.splice(toRemove[i], 1);
        try {
          connection.release();
        } catch (err) {
          console.warn('Error releasing idle connection:', err.message);
        }
      }

      // Cleanup is routine — no log needed in production
    }, this.idleTimeout / 2); // Run cleanup every half the idle timeout
  }

  /**
   * Update peak connection count
   */
  updatePeakConnections() {
    const current = this.activeConnections.size + this.idleConnections.length;
    if (current > this.stats.peakConnections) {
      this.stats.peakConnections = current;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.activeConnections.size,
      idleConnections: this.idleConnections.length,
      waitingRequests: this.waitingRequests.length,
      maxConnections: this.maxConnections,
      utilizationPercent: Math.round(
        (this.activeConnections.size / this.maxConnections) * 100
      )
    };
  }

  /**
   * Log statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log('📊 Connection Pool Statistics:', JSON.stringify(stats, null, 2));
  }

  /**
   * Drain all connections and shutdown
   */
  async shutdown() {
    clearInterval(this.cleanupInterval);

    // Release all active connections
    for (const conn of this.activeConnections) {
      try {
        conn.release();
      } catch (err) {
        console.warn('Error releasing connection during shutdown:', err.message);
      }
    }

    // Close all idle connections
    for (const { connection } of this.idleConnections) {
      try {
        connection.release();
      } catch (err) {
        console.warn('Error closing idle connection during shutdown:', err.message);
      }
    }

    // Clear collections
    this.activeConnections.clear();
    this.idleConnections = [];
    this.waitingRequests = [];

    // Shutdown complete
  }
}

export { ConnectionPool };
