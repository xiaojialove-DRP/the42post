/* ═══════════════════════════════════════════════════════
   Request Logger Middleware
   ═══════════════════════════════════════════════════════ */

export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const statusColor = status < 400 ? '✓' : status < 500 ? '⚠' : '✗';
    console.log(`${statusColor} [${timestamp}] ${method} ${path} ${status} (${duration}ms) - ${ip}`);
  });

  next();
}
