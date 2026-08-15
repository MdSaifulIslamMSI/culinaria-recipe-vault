/**
 * Advanced Production Security, Validation & Observability Middleware
 */

// In-memory sliding window IP rate limiter
class ServerRateLimiter {
  constructor(maxRequests = 120, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();

    // Stale IP cache cleanup every 5 minutes
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.requests.entries()) {
        const valid = timestamps.filter(t => now - t < this.windowMs);
        if (valid.length === 0) {
          this.requests.delete(ip);
        } else {
          this.requests.set(ip, valid);
        }
      }
    }, 300000);
    if (timer.unref) timer.unref();
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const now = Date.now();
      
      const timestamps = (this.requests.get(ip) || []).filter(t => now - t < this.windowMs);
      
      if (timestamps.length >= this.maxRequests) {
        res.setHeader('Retry-After', Math.ceil(this.windowMs / 1000));
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please throttle your requests.',
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

export const rateLimiter = new ServerRateLimiter(150, 60000);

/**
 * Hardened HTTP Security Headers
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
}

/**
 * High-Precision Request Timing & Structured Logging
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  next();
}

/**
 * Input Sanitation & Parameter Bounding Middleware
 */
export function validateRequestInput(req, res, next) {
  // 1. Sanitize Query Parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        // Enforce max query parameter length to prevent ReDoS/buffer attacks
        if (value.length > 150) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Query parameter "${key}" exceeds maximum allowed length of 150 characters.`
          });
        }
        // Disallow dangerous control characters
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Illegal control character in parameter "${key}".`
          });
        }
      }
    }
  }

  // 2. Sanitize JSON Body
  if (req.body && typeof req.body === 'object') {
    // Check for prototype pollution keys
    const checkPollution = (obj) => {
      for (const k of Object.keys(obj)) {
        if (['__proto__', 'constructor', 'prototype'].includes(k)) {
          return true;
        }
        if (obj[k] && typeof obj[k] === 'object') {
          if (checkPollution(obj[k])) return true;
        }
      }
      return false;
    };

    if (checkPollution(req.body)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Illegal object key detected in request body.'
      });
    }
  }

  next();
}
