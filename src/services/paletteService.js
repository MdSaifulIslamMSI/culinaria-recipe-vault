/**
 * PaletteService
 * Manages the 10 Gourmet Culinary Color Palettes, local storage persistence,
 * zero-flicker DOM synchronization, and dynamic theme-color meta tag updates.
 */

const PALETTE_STORAGE_KEY = 'culinaria_color_palette_v1';
export const DEFAULT_PALETTE_ID = 'saffron';

export const GOURMET_PALETTES = [
  {
    id: 'saffron',
    name: 'Oaxacan Saffron',
    emoji: '🌶️',
    tagline: 'Sun-dried Saffron & Terracotta',
    previewPrimary: '#D9531E',
    previewBg: '#FDF6F0',
    previewDarkBg: '#1C100A'
  },
  {
    id: 'olive',
    name: 'Tuscan Olive',
    emoji: '🫒',
    tagline: 'Warm Linen & Virgin Olive',
    previewPrimary: '#3F6E4D',
    previewBg: '#F5EFE6',
    previewDarkBg: '#141E17'
  },
  {
    id: 'merlot',
    name: 'Bordeaux Merlot',
    emoji: '🍷',
    tagline: 'Aged Wine Cellar & Velvet',
    previewPrimary: '#8B263E',
    previewBg: '#FBF5F6',
    previewDarkBg: '#1A0B10'
  },
  {
    id: 'santorini',
    name: 'Santorini Azure',
    emoji: '🌊',
    tagline: 'Aegean Sea & Whitewashed Coast',
    previewPrimary: '#1565C0',
    previewBg: '#F0F5FA',
    previewDarkBg: '#0A1522'
  },
  {
    id: 'matcha',
    name: 'Kyoto Matcha',
    emoji: '🍵',
    tagline: 'Ceremonial Tea & Washi Paper',
    previewPrimary: '#4D7C45',
    previewBg: '#F6F7F0',
    previewDarkBg: '#121C13'
  },
  {
    id: 'espresso',
    name: 'Espresso Roast',
    emoji: '☕',
    tagline: 'Roasted Arabica & Milk Crema',
    previewPrimary: '#9A5B32',
    previewBg: '#FAF5EE',
    previewDarkBg: '#18100C'
  },
  {
    id: 'sage',
    name: 'Nordic Sage',
    emoji: '🌿',
    tagline: 'Botanical Herb & Birchwood',
    previewPrimary: '#4E7D67',
    previewBg: '#F3F7F4',
    previewDarkBg: '#121A15'
  },
  {
    id: 'truffle',
    name: 'Midnight Truffle',
    emoji: '🫐',
    tagline: '3-Star Caviar & Gold Leaf',
    previewPrimary: '#D4AF37',
    previewBg: '#F5F5F7',
    previewDarkBg: '#0F1218'
  },
  {
    id: 'lavender',
    name: 'Provence Lavender',
    emoji: '🌸',
    tagline: 'French Patisserie & Wild Honey',
    previewPrimary: '#8B5CF6',
    previewBg: '#FAF5FF',
    previewDarkBg: '#160E22'
  },
  {
    id: 'obsidian',
    name: 'Midnight Chef OLED',
    emoji: '🌙',
    tagline: 'Pure OLED Stealth & Saffron Neon',
    previewPrimary: '#F59E0B',
    previewBg: '#F8F9FA',
    previewDarkBg: '#000000'
  }
];

/**
 * Get active palette from localStorage with safe fallback
 */
export function getActivePaletteId() {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved && GOURMET_PALETTES.some(p => p.id === saved)) {
      return saved;
    }
  } catch {
    // Continue with fallback
  }
  return DEFAULT_PALETTE_ID;
}

/**
 * Apply and persist selected palette
 */
export function setActivePalette(paletteId) {
  const targetId = GOURMET_PALETTES.some(p => p.id === paletteId) ? paletteId : DEFAULT_PALETTE_ID;
  
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, targetId);
  } catch (e) {
    console.warn('[PALETTE] Failed to save palette to storage:', e);
  }

  // Update HTML document data-palette attribute
  document.documentElement.setAttribute('data-palette', targetId);

  // Sync theme-color meta tag
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const palette = GOURMET_PALETTES.find(p => p.id === targetId) || GOURMET_PALETTES[0];
  const metaColor = isDark ? palette.previewDarkBg : palette.previewBg;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', metaColor);
  }

  // Broadcast event for UI components
  window.dispatchEvent(new CustomEvent('culinaria:palette-changed', {
    detail: { paletteId: targetId, palette }
  }));

  return targetId;
}

/**
 * Reset palette back to default
 */
export function resetPaletteToDefault() {
  return setActivePalette(DEFAULT_PALETTE_ID);
}
