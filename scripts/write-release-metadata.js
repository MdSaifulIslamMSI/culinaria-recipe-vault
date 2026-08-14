import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const healthPath = path.join(distDir, 'health.json');
const releasePath = path.join(distDir, 'release.json');
const releaseSha = process.env.GITHUB_SHA || process.env.RENDER_GIT_COMMIT || process.env.RELEASE_SHA || 'local-development';
const generatedAt = process.env.RELEASE_TIME || new Date().toISOString();
const isRender = process.env.RENDER === 'true' || Boolean(process.env.RENDER_GIT_COMMIT);
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true' || Boolean(process.env.GITHUB_SHA);
const deployment = {
  provider: isRender ? 'Render Static Site' : isGitHubActions ? 'GitHub Pages' : 'local static preview',
  sourceBranch: process.env.RENDER_GIT_BRANCH || process.env.GITHUB_REF_NAME || 'local-development',
  healthModel: 'static-artifact-metadata; no server-side SLA'
};

if (!fs.existsSync(distDir) || !fs.existsSync(healthPath)) {
  throw new Error('dist/health.json is missing; run npm run build before writing release metadata');
}

const release = {
  service: 'culinaria-recipe-vault',
  commit: releaseSha,
  generatedAt,
  artifact: 'dist',
  checks: ['npm test', 'npm run build', 'npm audit --audit-level=high']
};

const health = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
health.release = release;
health.status = 'healthy';
health.deployment = deployment;

fs.writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`, 'utf8');
fs.writeFileSync(healthPath, `${JSON.stringify(health, null, 2)}\n`, 'utf8');

console.log(`Release metadata written for ${releaseSha}`);
