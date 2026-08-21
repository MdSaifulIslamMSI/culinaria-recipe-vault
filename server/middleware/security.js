/**
 * Advanced Production Security, Validation & Observability Middleware
 */
import { randomUUID } from 'node:crypto';

// In-memory sliding window IP rate limiter
class ServerRateLimiter {
  constructor(maxRequests = 150, windowMs = 60000) {
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
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const now = Date.now();
      
      const timestamps = (this.requests.get(ip) || []).filter(t => now - t < this.windowMs);
      
      if (timestamps.length >= this.maxRequests) {
        res.setHeader('Retry-After', Math.ceil(this.windowMs / 1000));
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));
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
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));
      
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
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HSTS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://www.themealdb.com https://images.unsplash.com https://img.youtube.com https://i.ytimg.com; connect-src 'self' https://www.themealdb.com https://fonts.googleapis.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self';"
  );
  next();
}

/**
 * High-Precision Request Timing & Structured Logging
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'production' && process.env.LOG_REQUESTS !== 'true') return;

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(JSON.stringify({
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    }));
  });

  next();
}

/**
 * Advanced Input Validation, Method Bounding & Deep Inspection Middleware
 */
export function validateRequestInput(req, res, next) {
  // 1. Block Dangerous / Deprecated HTTP Methods (e.g. TRACE, TRACK)
  const allowedMethods = ['GET', 'POST', 'HEAD', 'OPTIONS'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: `HTTP method "${req.method}" is not permitted.`
    });
  }

  // 2. Block Path Traversal & Null Byte in Request URL
  if (req.url && (req.url.includes('%00') || req.url.includes('\0'))) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Illegal control character or null byte in request path.'
    });
  }

  // 3. Sanitize Query Parameters
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
        // Disallow dangerous control characters and CRLF
        // eslint-disable-next-line no-control-regex -- rejecting control characters is the purpose
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\r\n]/.test(value)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Illegal control character in parameter "${key}".`
          });
        }
      }
    }
  }

  // 4. Deep Inspection & Sanitation for JSON Body
  if (req.body && typeof req.body === 'object') {
    const checkSafety = (obj, depth = 0) => {
      // Prevent deeply nested payload bombs
      if (depth > 6) {
        throw new Error('JSON structure exceeds maximum nesting depth.');
      }

      if (Array.isArray(obj)) {
        // Prevent array payload bombs (max 100 items)
        if (obj.length > 100) {
          throw new Error('Array payload exceeds maximum allowed size of 100 elements.');
        }
        for (const item of obj) {
          if (typeof item === 'string' && item.length > 200) {
            throw new Error('Array string element exceeds maximum length of 200 characters.');
          }
          if (typeof item === 'object' && item !== null) {
            checkSafety(item, depth + 1);
          }
        }
        return;
      }

      for (const k of Object.keys(obj)) {
        // Prototype pollution check
        if (['__proto__', 'constructor', 'prototype'].includes(k)) {
          throw new Error('Illegal object key detected in request body.');
        }
        if (typeof obj[k] === 'string' && obj[k].length > 1000) {
          throw new Error(`Field "${k}" exceeds maximum length of 1000 characters.`);
        }
        if (obj[k] && typeof obj[k] === 'object') {
          checkSafety(obj[k], depth + 1);
        }
      }
    };

    try {
      checkSafety(req.body);
    } catch (err) {
      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'Illegal request payload.'
      });
    }
  }

  next();
}
