/* ═══════════════════════════════════════════════════════
   Error Handler Middleware — Secure Error Response

   SECURITY: All error responses are sanitized in production:
   - No internal database details (error codes, column names)
   - No stack traces in production
   - No operation-specific details that could hint at structure
   ═══════════════════════════════════════════════════════ */

const isDevelopment = process.env.NODE_ENV === 'development';

// Sanitized error messages for production
const SAFE_ERROR_MESSAGES = {
  'JsonWebTokenError': 'Invalid authentication credentials',
  'TokenExpiredError': 'Your session has expired. Please log in again',
  'ValidationError': 'The provided data does not meet requirements',
  'TypeError': 'An unexpected error occurred processing your request',
  'ReferenceError': 'An unexpected error occurred processing your request',
  'SyntaxError': 'Invalid request format',
  'ENOENT': 'The requested resource does not exist',
  'EACCES': 'Operation not permitted',
  'ECONNREFUSED': 'Service temporarily unavailable',
};

export function errorHandler(err, req, res, next) {
  // Always log full error internally for debugging
  console.error('Error:', {
    name: err.name,
    code: err.code,
    message: err.message,
    path: req.path,
    method: req.method,
    ...(isDevelopment && { stack: err.stack })
  });

  // ═══ JWT/Authentication Errors ═══
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or malformed authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Your session has expired. Please log in again'
    });
  }

  // ═══ Database Errors (Sanitize sensitive details) ═══
  // Unique constraint violation — don't expose which field or table
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict',
      message: isDevelopment
        ? `Resource already exists: ${err.detail || 'duplicate detected'}`
        : 'This resource already exists'
    });
  }

  // Foreign key constraint violation — don't expose table relationships
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid Request',
      message: isDevelopment
        ? `Referenced resource does not exist: ${err.detail || 'foreign key constraint violated'}`
        : 'The referenced resource does not exist'
    });
  }

  // NotNull constraint violation — generic message
  if (err.code === '23502') {
    return res.status(400).json({
      error: 'Invalid Request',
      message: isDevelopment
        ? `Required field missing: ${err.detail || 'not null constraint violated'}`
        : 'A required field is missing'
    });
  }

  // Check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      error: 'Invalid Request',
      message: isDevelopment
        ? `Invalid value provided: ${err.detail || 'check constraint violated'}`
        : 'The provided value does not meet requirements'
    });
  }

  // ═══ Determine Safe Error Message ═══
  const status = err.status || 500;
  const safeMessage = isDevelopment
    ? (err.message || 'Internal server error')
    : (SAFE_ERROR_MESSAGES[err.name] || 'An unexpected error occurred');

  const response = {
    error: err.name || 'Error',
    message: safeMessage,
    timestamp: new Date().toISOString()
  };

  // Only include stack trace and error code in development
  if (isDevelopment) {
    response.code = err.code;
    response.stack = err.stack;
  }

  res.status(status).json(response);
}
