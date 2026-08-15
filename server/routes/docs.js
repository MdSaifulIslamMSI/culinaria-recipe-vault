/**
 * OpenAPI 3.1 & Interactive API Documentation Route for Culinaria Backend
 */
import { Router } from 'express';

const router = Router();

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Culinaria Recipe Vault REST API',
    version: '2.0.0',
    description: 'High-performance, stateless culinary discovery, pantry matching, and kitchen telemetry engine.'
  },
  servers: [
    { url: '/api', description: 'Local / Current Server Base' }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System Telemetry & Health',
        description: 'Returns server uptime, memory telemetry (RSS/Heap), Node version, and catalog counts.',
        responses: {
          '200': { description: 'Server is healthy' }
        }
      }
    },
    '/recipes/search': {
      get: {
        summary: 'Search Recipes',
        description: 'Multi-filter search by query keyword, category, and cuisine area with demonym aliasing.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term (e.g. Teriyaki, Salmon)' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Dish category (e.g. Chicken, Pasta)' },
          { name: 'area', in: 'query', schema: { type: 'string' }, description: 'Cuisine area (e.g. Indian, Italian, Mexican)' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 }, description: 'Max results' }
        ],
        responses: {
          '200': { description: 'Array of matched recipes' },
          '400': { description: 'Invalid query parameters or length exceeded' }
        }
      }
    },
    '/recipes/random': {
      get: {
        summary: 'Random Recipe Picker',
        description: 'Returns a random dish for the Chef Roulette feature.',
        responses: {
          '200': { description: 'Random recipe object' }
        }
      }
    },
    '/recipes/categories': {
      get: {
        summary: 'List Categories',
        description: 'Returns list of distinct recipe categories with dish counts.',
        responses: {
          '200': { description: 'Categories list' }
        }
      }
    },
    '/recipes/areas': {
      get: {
        summary: 'List Cuisines & Areas',
        description: 'Returns list of distinct culinary areas with dish counts.',
        responses: {
          '200': { description: 'Areas list' }
        }
      }
    },
    '/recipes/pantry': {
      post: {
        summary: 'Combinatorial Pantry Matching',
        description: 'Matches a list of available pantry ingredients against recipes and calculates percentage match.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ingredients: { type: 'array', items: { type: 'string' } },
                  limit: { type: 'integer', default: 50 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Ranked pantry matches' },
          '400': { description: 'Malformed JSON or missing ingredients array' }
        }
      }
    },
    '/recipes/substitutions': {
      get: {
        summary: 'Culinary Ingredient Substitutions',
        description: 'Look up 45+ chef culinary substitutions.',
        parameters: [
          { name: 'ingredient', in: 'query', schema: { type: 'string' }, description: 'Ingredient name (e.g. heavy cream)' }
        ],
        responses: {
          '200': { description: 'Substitution recommendations' }
        }
      }
    },
    '/recipes/{id}': {
      get: {
        summary: 'Get Recipe by ID',
        description: 'O(1) fast indexed lookup for a single recipe by its idMeal identifier.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Recipe ID' }
        ],
        responses: {
          '200': { description: 'Recipe details' },
          '404': { description: 'Recipe not found' }
        }
      }
    }
  }
};

// JSON Schema Endpoint
router.get('/openapi.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(OPENAPI_SPEC);
});

// Interactive Modern API Docs UI
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Culinaria REST API Reference</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d1117;
      --bg-card: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-heading: #f0f6fc;
      --accent: #d97706;
      --accent-rgb: 217, 119, 6;
      --get: #238636;
      --post: #1f6feb;
    }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem 1.5rem;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
    h1 { font-family: 'Playfair Display', serif; font-size: 2.4rem; color: var(--text-heading); margin: 0 0 0.5rem; }
    .badge { display: inline-block; background: rgba(var(--accent-rgb), 0.2); color: var(--accent); padding: 0.2rem 0.6rem; border-radius: 99px; font-weight: 700; font-size: 0.8rem; }
    .endpoint-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.25rem; overflow: hidden; }
    .endpoint-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: rgba(255, 255, 255, 0.02); }
    .method { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 4px; color: #fff; }
    .method.get { background: var(--get); }
    .method.post { background: var(--post); }
    .path { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--text-heading); flex: 1; }
    .desc { font-size: 0.9rem; color: var(--text); }
    .endpoint-body { padding: 1rem 1.25rem; border-top: 1px solid var(--border); font-size: 0.88rem; }
    .code-box { font-family: 'JetBrains Mono', monospace; background: #000; padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; color: #58a6ff; font-size: 0.82rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">OpenAPI 3.1.0 Specification</span>
      <h1>🍽️ Culinaria REST API</h1>
      <p>Stateless, high-speed culinary search, pantry matching, and health telemetry engine.</p>
      <p><a href="/api/openapi.json" target="_blank">📄 View Raw OpenAPI JSON Spec</a> | <a href="/api/health" target="_blank">🩺 Test Health Endpoint</a></p>
    </div>

    ${Object.entries(OPENAPI_SPEC.paths).map(([path, methods]) => {
      return Object.entries(methods).map(([method, details]) => `
        <div class="endpoint-card">
          <div class="endpoint-header">
            <span class="method ${method.toLowerCase()}">${method.toUpperCase()}</span>
            <span class="path">/api${path}</span>
            <span class="desc">${details.summary}</span>
          </div>
          <div class="endpoint-body">
            <p>${details.description}</p>
            ${details.parameters ? `
              <p><strong>Query Parameters:</strong></p>
              <ul>
                ${details.parameters.map(p => `<li><code>${p.name}</code> (${p.schema.type}) - ${p.description}</li>`).join('')}
              </ul>
            ` : ''}
            <div class="code-box">curl -X ${method.toUpperCase()} "http://localhost:3000/api${path}"</div>
          </div>
        </div>
      `).join('');
    }).join('')}
  </div>
</body>
</html>`);
});

export default router;
