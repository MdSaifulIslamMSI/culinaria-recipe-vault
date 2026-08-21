/**
 * Shared Overlay Coordination Utility
 * Single source of truth for focus trapping, inert/aria-hidden state,
 * refcounted body scroll-locking, and topmost-first Escape resolution.
 *
 * Every dialog/drawer registers itself here so that:
 *  - Escape closes only the topmost open overlay (no all-layers race)
 *  - Tab is trapped within the active overlay's container
 *  - Body scroll unlocks only when the last overlay closes
 */

const overlayStack = [];
let scrollLockCount = 0;

/**
 * Cycle Tab focus within a container (first <-> last boundary wrap).
 * Returns true when the event was consumed.
 */
export function trapFocusIn(container, event) {
  if (!container) return false;
  const focusable = Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => el.offsetParent !== null);
  if (focusable.length === 0) return false;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    last.focus();
    event.preventDefault();
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    first.focus();
    event.preventDefault();
    return true;
  }
  return false;
}

/**
 * Toggle aria-hidden + inert across one or more overlay elements.
 */
export function setOverlayState(elements, isOpen) {
  elements.forEach(element => {
    if (!element) return;
    element.setAttribute('aria-hidden', String(!isOpen));
    element.inert = !isOpen;
  });
}

/**
 * Refcounted scroll lock: nested overlays each acquire/release once;
 * body scroll restores only when the final overlay closes.
 */
export function acquireScrollLock() {
  scrollLockCount += 1;
  document.body.style.overflow = 'hidden';
}

export function releaseScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = '';
  }
}

/**
 * Register an overlay for coordinated keyboard handling.
 * entry: { name, getContainer(): Element|null, isOpen(): boolean, close(): void }
 * Registration order defines stacking; later registrations sit on top.
 * Returns an unregister function.
 */
export function registerOverlay(entry) {
  const existingIndex = overlayStack.findIndex(o => o.name === entry.name);
  if (existingIndex >= 0) {
    overlayStack[existingIndex] = entry;
  } else {
    overlayStack.push(entry);
  }
  return () => {
    const index = overlayStack.indexOf(entry);
    if (index >= 0) overlayStack.splice(index, 1);
  };
}

function topmostOpenOverlay() {
  for (let i = overlayStack.length - 1; i >= 0; i--) {
    try {
      if (overlayStack[i].isOpen()) return overlayStack[i];
    } catch {
      // A broken isOpen must never break global key handling.
    }
  }
  return null;
}

let keyboardCoordinatorArmed = false;

if (typeof document !== 'undefined' && !keyboardCoordinatorArmed) {
  keyboardCoordinatorArmed = true;
  document.addEventListener('keydown', event => {
    const overlay = topmostOpenOverlay();
    if (!overlay) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      overlay.close();
    } else if (event.key === 'Tab') {
      trapFocusIn(overlay.getContainer?.(), event);
    }
  }, true);
}
