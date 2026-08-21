/**
 * Gourmet Chef Preferences & Kitchen Settings Service
 * Manages 10 interactive toggles with zero-latency persistence,
 * reactive event broadcasting, and Screen Wake Lock integration.
 */
import { safeGet, safeSet } from './storageService.js';

const PREFS_STORAGE_KEY = 'culinaria_chef_preferences_v1';

const DEFAULT_PREFERENCES = {
  keepScreenAwake: false,
  unitSystem: 'metric', // 'metric' | 'imperial'
  voiceNarration: true,
  vegetarianOnly: false,
  highProteinOnly: false,
  quickUnder30: false,
  showMacros: true,
  showSommelier: true,
  autoSubstitutions: false,
  compactGrid: false,
  timerSound: true
};

let activeWakeLock = null;

export function getChefPreferences() {
  const stored = safeGet(PREFS_STORAGE_KEY, DEFAULT_PREFERENCES);
  return { ...DEFAULT_PREFERENCES, ...(stored || {}) };
}

export function updateChefPreference(key, value) {
  const current = getChefPreferences();
  current[key] = value;
  safeSet(PREFS_STORAGE_KEY, current);

  // Handle side-effects
  if (key === 'keepScreenAwake') {
    handleWakeLock(value);
  }

  // Broadcast change globally
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('culinaria:pref-updated', {
      detail: { key, value, preferences: current }
    }));
  }

  return current;
}

export async function handleWakeLock(enable) {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  try {
    if (enable) {
      if (!activeWakeLock) {
        activeWakeLock = await navigator.wakeLock.request('screen');
        activeWakeLock.addEventListener('release', () => {
          activeWakeLock = null;
        });
        console.log('[KITCHEN] Screen Wake Lock acquired — screen will remain awake.');
      }
    } else {
      if (activeWakeLock) {
        await activeWakeLock.release();
        activeWakeLock = null;
        console.log('[KITCHEN] Screen Wake Lock released.');
      }
    }
    return true;
  } catch (err) {
    console.warn('[KITCHEN] Wake Lock error:', err);
    return false;
  }
}
