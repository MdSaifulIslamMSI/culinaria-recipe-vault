# Culinaria

A recipe finder and cooking studio built on [TheMealDB](https://www.themealdb.com). No framework, no build-time magic beyond Vite — plain ES modules, a small Express API, and a bundled catalog snapshot so the thing still works when the network doesn't.

## Live

- **GitHub Pages** (static frontend): https://mdsaifulislammsi.github.io/culinaria-recipe-vault/
- **Render** (Express server serving the same frontend + REST API): https://culinaria-recipe-vault-server.onrender.com

## What it does

- Search and filter recipes by name, category, and cuisine. Live API results when online; a 789-recipe bundled snapshot when not.
- Cook mode: one step at a time, keyboard-driven, with automatic timer detection in step text ("simmer for 20 minutes" becomes a clickable countdown) and optional voice narration.
- Servings scaler (1–16) with metric/US unit conversion, applied to ingredients in place.
- Pantry matcher: enter what you have, get recipes ranked by ingredient overlap.
- Weekly meal planner with grocery-list aggregation, plus a standalone shopping list.
- Wine/beverage pairing cards per recipe (heuristic, clearly labeled as such).
- Installable PWA with offline caching.

## Stack

| Layer      | Choice                                              |
|------------|-----------------------------------------------------|
| Frontend   | Vanilla ES modules, hand-rolled CSS design tokens   |
| Build      | Vite 8                                              |
| Backend    | Express 5, stateless                                |
| Tests      | `node:test` (unit/integration/security), puppeteer-core (e2e) |
| Data       | TheMealDB API + build-time catalog snapshot         |

The only runtime dependencies are `express`, `cors`, `compression`, and `canvas-confetti`.

## Getting started

Requires Node 20.19+.

```bash
npm install
npm run dev        # Vite dev server on :5173
npm start          # Express server on :3000 (serves dist/ if present)
```

### Scripts

| Command            | What it does                                        |
|--------------------|-----------------------------------------------------|
| `npm test`         | Unit, integration, security-penetration suites (60 tests) |
| `npm run test:e2e` | Browser tests; needs a local Chrome, skips otherwise |
| `npm run lint`     | ESLint                                              |
| `npm run typecheck`| TypeScript checking over the JS sources             |
| `npm run build`    | Production build to `dist/`                         |
| `npm run doctor`   | All of the above gates in sequence                  |

## How the data layer works

Recipe lookups go through a deliberate fallback chain: live TheMealDB request → in-memory TTL cache → service-worker cache → bundled catalog → built-in defaults. The catalog is refreshed from TheMealDB with `node scripts/fetch-recipe-catalog.js`, which writes `src/data/recipeCatalog.js`; it is committed so offline mode works out of the box.

Two honesty notes:

- `estimatedTime` on recipes is derived from category (a pasta gets 25 minutes), not real prep data. It drives the "under 30 min" filter and is presented as an estimate everywhere.
- Nutrition figures are estimates computed client-side from ingredients, with floors applied. Treat them as ballpark.

## Deployment

Merges to `main` run the CI pipeline (lint, typecheck, tests, dependency audit, build). On success:

1. The verified `dist/` artifact is published to the `gh-pages` branch, which serves GitHub Pages.
2. A Render deploy hook is triggered if `RENDER_DEPLOY_HOOK` is configured.

Render can also be set up from scratch with the repo's deploy button or `render.yaml` (health check: `/api/health`). A multi-stage Dockerfile is included for container hosts; the image runs as non-root with a healthcheck.

## Security posture

Short version, without the marketing:

- CSP allows no inline scripts anywhere — the pre-paint theme bootstrap lives in `public/theme-init.js`. Script sources are limited to self and YouTube assets.
- All recipe data passes through a sanitize-on-ingest layer (`formatRecipe`) and again through display-boundary escaping before any `innerHTML` interpolation. URLs go through a protocol allowlist.
- The API validates methods, query length, body depth/array/string sizes, and blocks prototype-pollution keys. Rate limiting is a sliding window at 150 req/min/IP — in-memory, so it resets on restart and does not aggregate across instances. Fine for one box; swap in a shared store before scaling out.
- localStorage holds preferences, favorites, pantry, and shopping items only. Nothing sensitive belongs there and nothing sensitive is stored there.
- The security test suite covers XSS polyglots, CRLF/null-byte injection, JSON bombs, and prototype pollution (`tests/securityPenetration.test.js`, `tests/serverHardening.test.js`).

## Project layout

```
server/          Express app: routes, middleware, recipe engine
src/
  components/    One file per UI surface (modal, drawers, cards)
  services/      API client, storage, planner, timers, recommendations
  utils/         Sanitizer, overlay coordination, error boundary
  data/          Generated catalog snapshot (do not edit by hand)
tests/           node:test suites + puppeteer e2e
scripts/         Catalog fetch, release metadata, evidence audit
```
