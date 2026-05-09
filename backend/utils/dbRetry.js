/* ═══════════════════════════════════════════════════════
   Database Retry Utility — Transient Failure Recovery

   Retries database operations with exponential backoff for
   transient failures (ECONNREFUSED, ENOTFOUND, timeouts).
   Non-transient errors (constraint violations, auth) fail immediately.
   ═══════════════════════════════════════════════════════ */

/**
 * Determine if an error is transient and worth retrying
 */
function isTransientError(err) {
  if (!err) return false;

  const msg = (err.message || err.code || '').toString().toLowerCase();
  const code = err.code || '';

  // Connection errors
  if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(code)) {
    return true;
  }

  // Timeout-like messages
  if (msg.includes('timeout') || msg.includes('temporary') || msg.includes('unavailable')) {
    return true;
  }

  // SQLite busy errors (database locked)
  if (msg.includes('database is locked') || msg.includes('busy')) {
    return true;
  }

  return false;
}

/**
 * Retry a database operation with exponential backoff
 *
 * @param {Function} operation - Async function that performs the DB operation
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} initialDelayMs - Initial delay between retries (default: 100ms)
 * @returns {Promise} Result of the operation
 */
export async function retryDbOperation(operation, maxRetries = 3, initialDelayMs = 100) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      // Don't retry if it's not a transient error
      if (!isTransientError(err)) {
        throw err;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait with exponential backoff before retrying
      // Attempt 0: 100ms, Attempt 1: 200ms, Attempt 2: 400ms, etc.
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      console.warn(`🔄 Database operation failed, retrying (attempt ${attempt + 1}/${maxRetries}):`, err.message);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Wrapper for a query function with automatic retry
 * Usage: queryWithRetry(() => db.query(sql, params))
 */
export async function queryWithRetry(queryFn) {
  return retryDbOperation(queryFn, 2); // Fewer retries for queries (usually fast)
}

/**
 * Wrapper for insert/update/delete with retry
 * Usage: mutateWithRetry(() => db.query(sql, params))
 */
export async function mutateWithRetry(mutateFn) {
  return retryDbOperation(mutateFn, 3); // More retries for mutations
}
