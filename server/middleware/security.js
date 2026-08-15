/**
 * Security & Rate-Limiting Middleware for Culinaria Backend Server
 */

// In-memory sliding window IP rate limiter
class ServerRateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();

    // Clean up stale IP records every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.requests.entries()) {
        const valid = timestamps.filter(t => now - t < this.windowMs);
        if (valid.length === 0) {
          this.requests.delete(ip);
        } else {
          this.requests.set(ip, valid);
        }
      }
    }, 300000).unref();
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      
      const timestamps = (this.requests.get(ip) || []).filter(t => now - t < this.windowMs);
      
      if (timestamps.length >= this.maxRequests) {
        res.setHeader('Retry-After', Math.ceil(this.windowMs / 1000));
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again in 1 minute.',
          status: 429
        });
      }

      timestamps.push(now);
      this.requests.set(ip, timestamps);
      
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - timestamps.length));
      
      next();
    };
  }
}

export const rateLimiter = new ServerRateLimiter(120, 60000);

/**
 * Applies essential HTTP security headers
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
