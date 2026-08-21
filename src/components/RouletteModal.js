/**
 * RouletteModal Component
 * Chef's Surprise Dish Roulette with race-condition prevention & image fallback
 */
import { getRandomRecipe } from '../services/mealDbApi.js';
import { sanitizeHtml, sanitizeUrl } from '../utils/securitySanitizer.js';
import {
  registerOverlay,
  setOverlayState,
  acquireScrollLock,
  releaseScrollLock
} from '../utils/overlayManager.js';

export class RouletteModal {
  constructor() {
    this.modal = document.getElementById('rouletteModal');
    this.backdrop = document.getElementById('rouletteModalBackdrop');
    this.closeBtn = document.getElementById('btnCloseRouletteModal');
    this.triggerBtn = document.getElementById('btnRoulette');
    this.stage = document.getElementById('rouletteStage');
    this.btnSpin = document.getElementById('btnSpinAgain');
    this.btnOpen = document.getElementById('btnOpenRouletteDish');

    this.currentRecipe = null;
    this.spinRequestId = 0;
    this.previousActiveElement = null;
    this.setOpenState(false);
    this.init();
  }

  setOpenState(isOpen) {
    setOverlayState([this.backdrop, this.modal], isOpen);
  }

  init() {
    this.triggerBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this.btnSpin.addEventListener('click', () => this.spin());
    this.btnOpen.addEventListener('click', () => {
      if (this.currentRecipe) {
        this.close();
        window.dispatchEvent(new CustomEvent('culinaria:open-recipe', {
          detail: { recipeId: this.currentRecipe.id }
        }));
      }
    });

    // Escape/Tab handled centrally by overlayManager
    registerOverlay({
      name: 'roulette-modal',
      getContainer: () => this.modal,
      isOpen: () => this.backdrop?.classList.contains('open') ?? false,
      close: () => this.close()
    });
  }

  open() {
    this.previousActiveElement = document.activeElement;
    this.setOpenState(true);
    this.backdrop.classList.add('open');
    acquireScrollLock();
    this.closeBtn.focus();
    this.spin();
  }

  close() {
    this.setOpenState(false);
    this.backdrop.classList.remove('open');
    releaseScrollLock();
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  async spin() {
    const currentRequestId = ++this.spinRequestId;
    this.btnSpin.disabled = true;
    this.btnOpen.disabled = true;
    this.stage.innerHTML = `
      <div class="roulette-placeholder">
        <div class="spinning-fork">🍴</div>
        <p style="font-weight: 600; color: var(--accent-primary);">Consulting culinary stars...</p>
      </div>
    `;

    try {
      const recipe = await getRandomRecipe();
      if (currentRequestId !== this.spinRequestId) return; // Discard superseded spin

      this.currentRecipe = recipe;
      const fallbackThumb = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
      const safeThumb = sanitizeUrl(recipe.thumbnail || '', fallbackThumb);
      const safeTitle = sanitizeHtml(recipe.title);
      const safeArea = sanitizeHtml(recipe.area || 'Global');
      const safeCategory = sanitizeHtml(recipe.category || 'Specialty');

      setTimeout(() => {
        if (currentRequestId !== this.spinRequestId || !this.currentRecipe) return;
        this.stage.innerHTML = `
          <div style="text-align: center; width: 100%;">
            <div style="width: 140px; height: 140px; margin: 0 auto 1rem; border-radius: 50%; overflow: hidden; box-shadow: var(--shadow-md); border: 3px solid var(--accent-primary);">
              <img src="${safeThumb}" alt="${safeTitle}" class="roulette-thumb-img" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <span style="font-size: 0.8rem; font-weight: 700; background: var(--accent-primary-light); color: var(--accent-primary); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);">
              🌍 ${safeArea} • ${safeCategory}
            </span>
            <h4 style="font-family: var(--font-serif); font-size: 1.4rem; font-weight: 700; margin: 0.5rem 0 0.25rem;">${safeTitle}</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Ready in approx ${sanitizeHtml(recipe.estimatedTime || 30)} minutes</p>
          </div>
        `;

        const rImg = this.stage.querySelector('.roulette-thumb-img');
        if (rImg) {
          rImg.addEventListener('error', () => {
            rImg.src = fallbackThumb;
          }, { once: true });
        }

        this.btnOpen.disabled = false;
        this.btnSpin.disabled = false;
      }, 550);

    } catch (err) {
      console.error(err);
      if (currentRequestId === this.spinRequestId) {
        this.stage.innerHTML = '<p>Could not fetch random dish. Please spin again!</p>';
        this.btnSpin.disabled = false;
      }
    }
  }
}
