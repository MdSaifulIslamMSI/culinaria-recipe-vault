/**
 * Global Application Error Boundary & Self-Healing Engine
 * Intercepts uncaught exceptions, suppresses raw stack trace leaks,
 * logs to the Security Audit Ledger, and renders a graceful recovery interface.
 */
import { logSecurityEvent, SecurityEventType, SecuritySeverity } from './securityAuditLedger.js';

let isBoundaryInitialized = false;

export function initErrorBoundary() {
  if (isBoundaryInitialized || typeof window === 'undefined') return;

  // Intercept uncaught JavaScript runtime errors
  window.addEventListener('error', (event) => {
    handleFatalError('Runtime Exception', event.error || event.message, event.filename);
  });

  // Intercept unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    handleFatalError('Unhandled Promise Rejection', event.reason);
  });

  isBoundaryInitialized = true;
  console.log('[DEFENSE] Global Application Error Boundary armed.');
}

function handleFatalError(type, error, source = 'app') {
  const message = error instanceof Error ? error.message : String(error);

  logSecurityEvent(
    SecurityEventType.DOM_MUTATION_TRAPPED,
    { type, message: message.slice(0, 100), source },
    SecuritySeverity.HIGH
  );

  console.error(`[CULINARIA ERROR BOUNDARY - ${type}]:`, error);

  // If the DOM is already rendered and functional, do not block the user
  const appContainer = document.querySelector('.app-container');
  const errorOverlay = document.getElementById('errorBoundaryOverlay');

  // Only show recovery screen if app container is missing or fatal rendering crash
  if (errorOverlay && (!appContainer || appContainer.children.length === 0)) {
    renderRecoveryScreen(message);
  }
}

export function renderRecoveryScreen(errorMsg = '') {
  const overlay = document.getElementById('errorBoundaryOverlay');
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="recovery-card">
      <div class="recovery-icon">👨‍🍳</div>
      <h2 class="recovery-title">Kitchen Prep Interrupted</h2>
      <p class="recovery-desc">
        A temporary browser exception occurred. Your saved recipes and settings remain in this browser's local storage.
      </p>
      ${errorMsg ? `<div class="recovery-error-preview"><code>${sanitizeErrorText(errorMsg)}</code></div>` : ''}
      <div class="recovery-actions">
        <button class="primary-btn" id="btnReloadApp">🔄 Refresh & Resume</button>
        <button class="secondary-btn" id="btnResetCacheApp">🧹 Self-Heal & Reset Cache</button>
      </div>
    </div>
  `;

  overlay.classList.remove('hidden');

  document.getElementById('btnReloadApp')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('btnResetCacheApp')?.addEventListener('click', () => {
    try {
      localStorage.removeItem('culinaria_favorites_v1');
      localStorage.removeItem('culinaria_shopping_list_v1');
      localStorage.removeItem('culinaria_pantry_basket_v1');
    } catch {
      // Storage may be unavailable (private mode); reload regardless.
    }
    window.location.reload();
  });
}

function sanitizeErrorText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[<>&"]/g, '')
    .slice(0, 150);
}
