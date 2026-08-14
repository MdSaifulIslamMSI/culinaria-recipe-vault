/**
 * Real-Time Network Connectivity & Offline Mode Monitor
 * Notifies the user when switching between live API and offline 789-recipe vault.
 */

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

export function initNetworkMonitor() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    isOnline = true;
    window.dispatchEvent(new CustomEvent('culinaria:toast', {
      detail: { message: '⚡ Connection Restored — Live global search & video masterclasses active!' }
    }));
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    window.dispatchEvent(new CustomEvent('culinaria:toast', {
      detail: { message: '📡 Offline Mode Active — Enjoying uninterrupted access to 789 cached recipes.' }
    }));
  });

  // Check initial state
  if (!navigator.onLine) {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('culinaria:toast', {
        detail: { message: '📡 Working in Offline Mode — 789 recipes cached and ready.' }
      }));
    }, 1200);
  }
}

export function getNetworkStatus() {
  return isOnline;
}
