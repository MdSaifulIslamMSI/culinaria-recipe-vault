/**
 * Culinaria Zero-Flicker Theme Bootstrap
 * Loaded synchronously (classic script) before first paint so the correct
 * theme and palette are applied without FOUC. Kept external so the CSP can
 * omit 'unsafe-inline' from script-src.
 */
(function () {
  try {
    let t = localStorage.getItem('culinaria_theme_preference');
    if (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      t = 'dark';
    }
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');

    const p = localStorage.getItem('culinaria_color_palette_v1') || 'saffron';
    document.documentElement.setAttribute('data-palette', p);
  } catch {
    // Storage unavailable or blocked; data-theme/data-palette attributes on <html> remain as defaults.
  }
})();
