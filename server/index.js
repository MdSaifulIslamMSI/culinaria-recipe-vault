/**
 * Culinaria Production Node.js Backend Server
 * High-Performance Stateless REST API & Static Frontend Delivery
 */
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import docsRouter from './routes/docs.js';
import { rateLimiter, securityHeaders, requestLogger } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const app = express();
const PORT = process.env.PORT || 3000;
const configuredProxyHops = Number.parseInt(
  process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? '1' : '0'),
  10
);

if (!Number.isInteger(configuredProxyHops) || configuredProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}

const defaultCorsOrigins = [
  'https://culinaria-recipe-vault-server.onrender.com',
  'https://culinaria-recipe-vault.onrender.com',
  'https://mdsaifulislammsi.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];
const allowedCorsOrigins = new Set(
  (process.env.CORS_ORIGINS || defaultCorsOrigins.join(','))
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

// Render terminates TLS at one trusted reverse-proxy hop. Local development does not trust client-supplied forwarding headers.
app.set('trust proxy', configuredProxyHops);
app.disable('x-powered-by');

// 1. Enable Strong ETags for browser caching
app.set('etag', 'strong');

// 2. High-Performance Gzip / Brotli Compression
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 3. Security Headers & Telemetry Logging
app.use(securityHeaders);
app.use(requestLogger);

// 4. In-memory IP rate limiter for API traffic only. Use a shared store before scaling beyond one instance.
app.use('/api', rateLimiter.middleware());

// 5. Explicit CORS allowlist. Same-origin and non-browser requests do not need CORS headers.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedCorsOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'If-None-Match']
}));

// 6. Body Parsing for JSON payloads with strict limits
app.use(express.json({ limit: '512kb' }));

// 7. Mount Interactive API Documentation
app.use('/api/docs', docsRouter);

// 8. Mount Stateless API Router
app.use('/api', apiRouter);

// 8. Serve Compiled Frontend Assets in Production Mode
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else if (filePath.includes('/assets/')) {
        // Immutable hashed assets cache for 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // SPA Fallback for client-side navigation
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// 9. Global 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Endpoint Not Found',
    requestId: req.requestId
  });
});

// 10. Global Error Boundary Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  console.error(JSON.stringify({
    event: 'http_error',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    error: err.name || 'Error',
    message: err.message || 'Unexpected server error.'
  }));

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : (err.name || 'Bad Request'),
    message: isProduction && statusCode >= 500
      ? 'An unexpected server error occurred.'
      : (err.message || 'An unexpected server error occurred.'),
    requestId: req.requestId
  });
});

// Process-Level Exception Protection
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

// Start Server if executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server\\index.js') || 
  process.argv[1].endsWith('server/index.js')
);

let serverInstance = null;

if (isDirectRun) {
  serverInstance = app.listen(PORT, () => {
    console.log(`\n👨‍🍳 =================================================`);
    console.log(`✨ Culinaria Full-Stack Server Running on Port ${PORT}`);
    console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🩺 Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`👨‍🍳 =================================================\n`);
  });

  // Graceful Shutdown on SIGINT / SIGTERM
  const handleShutdown = (signal) => {
    console.log(`\n[SERVER] Received ${signal}. Gracefully shutting down...`);
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('[SERVER] Closed all active connections. Exiting clean.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
