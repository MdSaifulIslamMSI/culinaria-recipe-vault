/**
 * Gourmet Preferences Drawer Component
 * Houses 10 interactive culinary toggles with instant live preview.
 */
import { getChefPreferences, updateChefPreference } from '../services/preferencesService.js';

export class PreferencesDrawer {
  constructor() {
    this.overlay = document.getElementById('prefsOverlay');
    this.drawer = document.getElementById('prefsDrawer');
    this.btnClose = document.getElementById('btnClosePrefsDrawer');
    this.btnOpen = document.getElementById('btnChefPreferences');
    this.btnReset = document.getElementById('btnResetAllPrefs');

    this.init();
  }

  init() {
    this.btnOpen?.addEventListener('click', () => this.open());
    this.btnClose?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.btnReset?.addEventListener('click', () => {
      const defaultKeys = [
        'keepScreenAwake', 'unitSystem', 'voiceNarration',
        'vegetarianOnly', 'highProteinOnly', 'quickUnder30',
        'showMacros', 'showSommelier', 'autoSubstitutions', 'compactGrid'
      ];
      defaultKeys.forEach(k => {
        const val = k === 'unitSystem' ? 'metric' : (k === 'voiceNarration' || k === 'showMacros' || k === 'showSommelier');
        updateChefPreference(k, val);
      });
      this.syncToggleUI();
      window.dispatchEvent(new CustomEvent('culinaria:toast', {
        detail: { message: '🔄 Chef preferences reset to defaults.' }
      }));
    });

    this.attachToggleEvents();
    this.syncToggleUI();

    // Listen to ESC key to close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  open() {
    this.syncToggleUI();
    this.overlay?.classList.add('open');
    this.drawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.overlay?.classList.remove('open');
    this.drawer?.classList.remove('open');
    document.body.style.overflow = '';
  }

  isOpen() {
    return this.drawer?.classList.contains('open');
  }

  syncToggleUI() {
    const prefs = getChefPreferences();
    
    // Boolean Toggles
    const toggleMap = {
      prefKeepScreenAwake: prefs.keepScreenAwake,
      prefVoiceNarration: prefs.voiceNarration,
      prefVegetarianOnly: prefs.vegetarianOnly,
      prefHighProtein: prefs.highProteinOnly,
      prefQuickUnder30: prefs.quickUnder30,
      prefShowMacros: prefs.showMacros,
      prefShowSommelier: prefs.showSommelier,
      prefAutoSubs: prefs.autoSubstitutions,
      prefCompactGrid: prefs.compactGrid
    };

    Object.entries(toggleMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    });

    // Unit Radio Buttons
    const unitMetric = document.getElementById('prefUnitMetric');
    const unitImperial = document.getElementById('prefUnitImperial');
    if (unitMetric && unitImperial) {
      if (prefs.unitSystem === 'imperial') {
        unitImperial.checked = true;
      } else {
        unitMetric.checked = true;
      }
    }
  }

  attachToggleEvents() {
    const attachChange = (id, key, transform = val => val) => {
      const el = document.getElementById(id);
      el?.addEventListener('change', (e) => {
        const val = transform(e.target.checked);
        updateChefPreference(key, val);
      });
    };

    // 1. Live Kitchen Toggles
    attachChange('prefKeepScreenAwake', 'keepScreenAwake');
    attachChange('prefVoiceNarration', 'voiceNarration');

    // Units
    document.getElementById('prefUnitMetric')?.addEventListener('change', () => {
      updateChefPreference('unitSystem', 'metric');
    });
    document.getElementById('prefUnitImperial')?.addEventListener('change', () => {
      updateChefPreference('unitSystem', 'imperial');
    });

    // 2. Dietary & Prep Toggles
    attachChange('prefVegetarianOnly', 'vegetarianOnly');
    attachChange('prefHighProtein', 'highProteinOnly');
    attachChange('prefQuickUnder30', 'quickUnder30');

    // 3. Display & Intelligence Toggles
    attachChange('prefShowMacros', 'showMacros');
    attachChange('prefShowSommelier', 'showSommelier');
    attachChange('prefAutoSubs', 'autoSubstitutions');
    attachChange('prefCompactGrid', 'compactGrid');
  }
}
