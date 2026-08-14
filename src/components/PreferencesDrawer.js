/**
 * Gourmet Preferences Drawer Component
 * Houses 10 interactive culinary toggles and 10 Gourmet Culinary Color Palettes with instant live preview.
 */
import { getChefPreferences, updateChefPreference } from '../services/preferencesService.js';
import { GOURMET_PALETTES, getActivePaletteId, setActivePalette, resetPaletteToDefault } from '../services/paletteService.js';

export class PreferencesDrawer {
  constructor() {
    this.overlay = document.getElementById('prefsOverlay');
    this.drawer = document.getElementById('prefsDrawer');
    this.btnClose = document.getElementById('btnClosePrefsDrawer');
    this.btnOpen = document.getElementById('btnChefPreferences');
    this.btnReset = document.getElementById('btnResetAllPrefs');
    this.paletteGrid = document.getElementById('paletteSwatchesGrid');

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
      resetPaletteToDefault();
      this.syncToggleUI();
      this.renderPaletteSwatches();
      window.dispatchEvent(new CustomEvent('culinaria:toast', {
        detail: { message: '🔄 Chef preferences & palette reset to defaults.' }
      }));
    });

    this.attachToggleEvents();
    this.renderPaletteSwatches();
    this.syncToggleUI();

    // Listen to palette changes to sync swatch cards
    window.addEventListener('culinaria:palette-changed', () => {
      this.syncActivePaletteUI();
    });

    // Listen to ESC key & Tab trapping
    window.addEventListener('keydown', (e) => {
      if (this.isOpen()) {
        if (e.key === 'Escape') {
          this.close();
        } else if (e.key === 'Tab') {
          this.trapFocus(e);
        }
      }
    });
  }

  trapFocus(e) {
    const focusable = Array.from(this.drawer.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  open() {
    this.previousActiveElement = document.activeElement;
    this.syncToggleUI();
    this.syncActivePaletteUI();
    this.overlay?.classList.add('open');
    this.drawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.closeBtn?.focus(), 50);
  }

  close() {
    this.overlay?.classList.remove('open');
    this.drawer?.classList.remove('open');
    document.body.style.overflow = '';
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  isOpen() {
    return this.drawer?.classList.contains('open');
  }

  renderPaletteSwatches() {
    if (!this.paletteGrid) return;
    const activeId = getActivePaletteId();

    this.paletteGrid.innerHTML = GOURMET_PALETTES.map(p => {
      const isActive = p.id === activeId;
      return `
        <button type="button" class="palette-swatch-card ${isActive ? 'active' : ''}" data-palette-id="${p.id}" title="${p.name} - ${p.tagline}">
          <span class="palette-dot-duo" style="background: linear-gradient(135deg, ${p.previewPrimary} 50%, ${p.previewDarkBg} 50%);"></span>
          <div class="palette-card-meta">
            <span class="palette-card-name">${p.emoji} ${p.name}</span>
            <span class="palette-card-sub">${p.tagline}</span>
          </div>
          ${isActive ? '<span class="palette-active-check">✓</span>' : ''}
        </button>
      `;
    }).join('');

    // Attach click listeners
    this.paletteGrid.querySelectorAll('.palette-swatch-card').forEach(card => {
      card.addEventListener('click', () => {
        const palId = card.dataset.paletteId;
        setActivePalette(palId);
        const pal = GOURMET_PALETTES.find(p => p.id === palId);
        window.dispatchEvent(new CustomEvent('culinaria:toast', {
          detail: { message: `🎨 Theme applied: ${pal?.emoji || '✨'} ${pal?.name || palId}` }
        }));
      });
    });
  }

  syncActivePaletteUI() {
    if (!this.paletteGrid) return;
    const activeId = getActivePaletteId();

    this.paletteGrid.querySelectorAll('.palette-swatch-card').forEach(card => {
      const isActive = card.dataset.paletteId === activeId;
      card.classList.toggle('active', isActive);
      
      const checkEl = card.querySelector('.palette-active-check');
      if (isActive && !checkEl) {
        card.insertAdjacentHTML('beforeend', '<span class="palette-active-check">✓</span>');
      } else if (!isActive && checkEl) {
        checkEl.remove();
      }
    });
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
