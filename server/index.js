/**
 * Culinaria Production Node.js Backend Server
 * Serves Stateless REST API & High-Performance Static Frontend
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { rateLimiter, securityHeaders } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Global Security & Rate Limiting Middleware
app.use(securityHeaders);
app.use(rateLimiter.middleware());

// 2. CORS Policy
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body Parsing for JSON payloads
app.use(express.json({ limit: '1mb' }));

// 4. Mount Stateless API Router
app.use('/api', apiRouter);

// 5. Serve Compiled Frontend Assets in Production Mode
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
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

// 6. Global 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint Not Found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server if executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server\\index.js') || 
  process.argv[1].endsWith('server/index.js')
);

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`\n👨‍🍳 =================================================`);
    console.log(`✨ Culinaria Full-Stack Server Running on Port ${PORT}`);
    console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🩺 Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`👨‍🍳 =================================================\n`);
  });
}

export default app;
