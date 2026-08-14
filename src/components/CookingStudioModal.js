/**
 * CookingStudioModal Component
 * Interactive Recipe Studio, Servings Scaler, Unit Converter,
 * Hands-Free Voice-Guided Cook Mode, Sommelier Pairing, Nutrition & Social Share
 */
import { scaleMeasurement } from '../services/unitScaler.js';
import { estimateNutrition } from '../services/nutritionCalculator.js';
import { getCulinaryPairing } from '../services/sommelierService.js';
import { voiceAssistant } from '../services/voiceAssistant.js';
import { isFavorite, toggleFavorite, addToShoppingList } from '../services/storageService.js';
import { getChefPreferences } from '../services/preferencesService.js';
import { activeTimer } from '../services/timerManager.js';
import { getRelatedRecipes, getIngredientSubstitution } from '../services/recommendationEngine.js';
import { getRecipeById } from '../services/mealDbApi.js';
import { sanitizeHtml, sanitizeUrl } from '../utils/securitySanitizer.js';
import confetti from 'canvas-confetti';

export class CookingStudioModal {
  constructor() {
    this.modalBackdrop = document.getElementById('recipeModalBackdrop');
    this.modalContent = document.getElementById('modalRecipeContent');
    this.closeBtn = document.getElementById('btnCloseRecipeModal');

    // Cook mode elements
    this.cookOverlay = document.getElementById('cookModeOverlay');
    this.cookTitle = document.getElementById('cookModeTitle');
    this.cookStepCard = document.getElementById('cookStepCard');
    this.cookStepNum = document.getElementById('cookStepNum');
    this.cookStepText = document.getElementById('cookStepText');
    this.cookProgressPill = document.getElementById('cookProgressPill');
    this.cookProgressBar = document.getElementById('cookProgressBar');
    this.stepTimerContainer = document.getElementById('stepTimerContainer');
    this.stepTimerLabel = document.getElementById('stepTimerLabel');
    this.btnStartStepTimer = document.getElementById('btnStartStepTimer');
    this.btnCookPrev = document.getElementById('btnCookPrevStep');
    this.btnCookNext = document.getElementById('btnCookNextStep');
    this.btnExitCookMode = document.getElementById('btnExitCookMode');
    this.btnToggleVoice = document.getElementById('btnToggleVoice');

    this.currentRecipe = null;
    this.currentServings = 4;
    this.baseServings = 4;
    this.unitSystem = 'metric';
    this.currentCookStepIndex = 0;
    this.voiceActive = true;
    this.checkedIngredientNames = new Set();

    this.initEvents();
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.cookOverlay.classList.contains('open')) {
          this.closeCookMode();
        } else if (this.modalBackdrop.classList.contains('open')) {
          this.close();
        }
      }
      if (this.cookOverlay.classList.contains('open')) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          this.nextCookStep();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prevCookStep();
        }
      }
    });

    // Cook mode buttons
    this.btnExitCookMode.addEventListener('click', () => this.closeCookMode());
    this.btnCookNext.addEventListener('click', () => this.nextCookStep());
    this.btnCookPrev.addEventListener('click', () => this.prevCookStep());

    this.btnToggleVoice?.addEventListener('click', () => {
      this.voiceActive = !this.voiceActive;
      if (this.voiceActive) {
        this.btnToggleVoice.classList.add('active');
        this.btnToggleVoice.querySelector('.voice-label').textContent = 'Voice On';
        this.speakCurrentStep();
      } else {
        this.btnToggleVoice.classList.remove('active');
        this.btnToggleVoice.querySelector('.voice-label').textContent = 'Voice Muted';
        voiceAssistant.stop();
      }
    });

    this.btnStartStepTimer.addEventListener('click', () => {
      const minutes = parseInt(this.btnStartStepTimer.dataset.minutes, 10) || 5;
      activeTimer.start(minutes * 60, `${this.currentRecipe.title} (Step ${this.currentCookStepIndex + 1})`);
      window.dispatchEvent(new CustomEvent('culinaria:toast', { detail: { message: `⏱️ Started ${minutes}-minute timer!` } }));
    });
  }

  open(recipe) {
    if (!recipe) return;
    const prefs = getChefPreferences();
    this.currentRecipe = recipe;
    this.baseServings = recipe.servings || 4;
    this.currentServings = this.baseServings;
    this.unitSystem = prefs.unitSystem || 'metric';
    this.checkedIngredientNames.clear();

    this.render();
    this.modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  render() {
    const r = this.currentRecipe;
    const prefs = getChefPreferences();
    const isFav = isFavorite(r.id);
    const nutrition = estimateNutrition(r, this.currentServings);
    const pairing = getCulinaryPairing(r);
    const ratio = this.currentServings / this.baseServings;
    const fallbackCover = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';

    this.modalContent.innerHTML = `
      <div class="modal-hero-cover">
        <img src="${r.thumbnail || fallbackCover}" alt="${r.title}" class="modal-hero-img" />
        <div class="modal-hero-gradient"></div>
      </div>

      <div class="modal-header-meta">
        <div class="modal-tags-row">
          <span class="modal-tag tag-cat">🍽️ ${r.category}</span>
          <span class="modal-tag tag-area">🌍 ${r.area} Tradition</span>
          <span class="modal-tag tag-time">⏱️ ${r.estimatedTime || 30} mins</span>
          <span class="modal-tag tag-cal">🔥 ~${nutrition.calories} kcal / portion</span>
          ${r.youtubeId ? '<span class="modal-tag tag-time">🎥 HD Video Masterclass</span>' : ''}
        </div>

        <h1 class="modal-dish-title">${r.title}</h1>

        <!-- Flavor Profile Tags -->
        <div class="flavor-profile-bar">
          <span class="flavor-bar-label">Flavor Profile:</span>
          ${pairing.flavorProfile.map(f => `<span class="flavor-tag">✨ ${f}</span>`).join('')}
        </div>
      </div>

      <!-- Interactive Action Controls (Servings Scaler, Units, Share, Print) -->
      <div class="modal-actions-bar">
        <div class="serving-scaler-wrap">
          <span class="scaler-label">Servings:</span>
          <div class="scaler-control">
            <button class="scaler-btn" id="btnScaleDown" aria-label="Decrease servings" ${this.currentServings <= 1 ? 'disabled' : ''}>−</button>
            <span class="scaler-num" id="currentServingsText">${this.currentServings}</span>
            <button class="scaler-btn" id="btnScaleUp" aria-label="Increase servings" ${this.currentServings >= 16 ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <div class="unit-switch-group">
          <button class="unit-btn ${this.unitSystem === 'metric' ? 'active' : ''}" id="btnUnitMetric">Metric (g / ml)</button>
          <button class="unit-btn ${this.unitSystem === 'imperial' ? 'active' : ''}" id="btnUnitImperial">US (cups / oz)</button>
        </div>

        <div class="modal-cta-group">
          <button class="btn-cook-mode" id="btnLaunchCookMode">
            <span>👨‍🍳 Start Cook Mode</span>
          </button>
          <button class="btn-icon-action" id="btnModalFav" title="${isFav ? 'Remove Favorite' : 'Save Favorite'}">
            ${isFav ? '❤️' : '🤍'}
          </button>
          <button class="btn-icon-action" id="btnModalShare" title="Share Recipe">
            🔗
          </button>
          <button class="btn-icon-action" id="btnModalPrint" title="Print Recipe">
            🖨️
          </button>
        </div>
      </div>

      <!-- 2-Column Content Grid: Ingredients & Method -->
      <div class="modal-grid-body">
        <!-- Column 1: Ingredients & Sommelier Card -->
        <div class="modal-ingredients-col">
          <h2 class="modal-section-title">
            <span>Ingredients (${r.ingredients.length})</span>
            <button class="add-all-cart-btn" id="btnAddAllToCart">+ Add to Grocery</button>
          </h2>

          <ul class="ingredients-list" id="ingredientsListContainer">
            ${r.ingredients.map(ing => {
              const scaledMeasure = scaleMeasurement(ing.measure, ratio, this.unitSystem);
              const isChecked = this.checkedIngredientNames.has(ing.name.toLowerCase());
              const sub = getIngredientSubstitution(ing.name);
              const subButton = sub ? `<button class="sub-hint-btn" data-ing="${sanitizeHtml(ing.name)}" title="Chef Alternative: ${sanitizeHtml(sub.substitute)}">⇄ Sub</button>` : '';

              return `
                <li class="ingredient-item ${isChecked ? 'checked' : ''}">
                  <label class="ing-check-wrap">
                    <input type="checkbox" class="ing-checkbox" data-name="${ing.name}" ${isChecked ? 'checked' : ''} />
                    <span class="ing-name">${ing.name}</span>
                    ${subButton}
                  </label>
                  <span class="ing-measure">${scaledMeasure}</span>
                </li>
              `;
            }).join('')}
          </ul>

          <!-- Sommelier Pairing Card (Toggled via Chef Preferences) -->
          ${prefs.showSommelier ? `
            <div class="sommelier-card">
              <div class="sommelier-header">
                <span class="sommelier-icon">🍷</span>
                <div>
                  <h3 class="sommelier-title">Sommelier Pairing</h3>
                  <span class="sommelier-sub">Curated by our Master Cellar</span>
                </div>
              </div>
              <div class="sommelier-body">
                <div class="pairing-item">
                  <span class="pairing-label">Wine Selection:</span>
                  <p class="pairing-text highlight">${pairing.wine}</p>
                  <small class="pairing-note">${pairing.wineNote}</small>
                </div>
                <div class="pairing-item" style="margin-top: 0.75rem;">
                  <span class="pairing-label">Artisanal Beverage:</span>
                  <p class="pairing-text">${pairing.beverage}</p>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Chef Tip Box -->
          <div class="chef-tip-box">
            <div class="chef-tip-header">
              <span>👨‍🍳 Chef's Secret Technique</span>
            </div>
            <p class="chef-tip-text">"${pairing.chefTip}"</p>
          </div>

          <!-- Nutrition Macro Card (Toggled via Chef Preferences) -->
          ${prefs.showMacros ? `
            <div class="nutrition-breakdown-box">
              <h3 class="modal-section-title" style="font-size: 1.1rem; margin-bottom: 0.5rem;">Estimated Macros / Portion</h3>
              <div class="nutrition-grid">
                <div class="nutri-card">
                  <div class="nutri-val">${nutrition.calories}</div>
                  <div class="nutri-lbl">Calories</div>
                </div>
                <div class="nutri-card">
                  <div class="nutri-val">${nutrition.protein}g</div>
                  <div class="nutri-lbl">Protein</div>
                </div>
                <div class="nutri-card">
                  <div class="nutri-val">${nutrition.carbs}g</div>
                  <div class="nutri-lbl">Carbs</div>
                </div>
                <div class="nutri-card">
                  <div class="nutri-val">${nutrition.fat}g</div>
                  <div class="nutri-lbl">Fat</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Column 2: Step-by-Step Instructions -->
        <div class="modal-method-col">
          <h2 class="modal-section-title">Preparation & Technique</h2>
          
          <div class="instructions-list">
            ${r.steps.map((step, idx) => {
              const highlightedStep = this.highlightTimers(step);
              return `
                <div class="step-row">
                  <div class="step-number-circle">${idx + 1}</div>
                  <div class="step-body">
                    <p class="step-text">${highlightedStep}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${r.youtubeId ? `
            <div class="video-section-wrap">
              <div class="video-section-header">
                <h3 class="modal-section-title" style="font-size: 1.15rem; margin: 0;">Video Cooking Masterclass</h3>
                <a href="https://www.youtube.com/watch?v=${encodeURIComponent(r.youtubeId)}" target="_blank" rel="noopener noreferrer" class="yt-external-btn" title="Open video in YouTube">
                  <span>🎬 Open in YouTube</span> ↗
                </a>
              </div>
              <div class="video-frame-container" id="videoContainer_${r.id || 'current'}">
                <div class="video-facade-card" data-yt-id="${encodeURIComponent(r.youtubeId)}" data-yt-title="${sanitizeHtml(r.title)}" title="Click to load and play video masterclass">
                  <img src="https://img.youtube.com/vi/${encodeURIComponent(r.youtubeId)}/hqdefault.jpg" alt="${sanitizeHtml(r.title)} Masterclass Video" class="video-facade-img" loading="lazy" />
                  <div class="video-facade-overlay">
                    <button type="button" class="btn-facade-play" aria-label="Play Masterclass Video">
                      <span class="facade-play-icon">▶</span>
                      <span class="facade-play-text">Play Masterclass</span>
                    </button>
                    <span class="video-hd-badge">HD Masterclass</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Recommended Pairings & Similar Dishes Carousel -->
      <div class="modal-recommendations-section">
        <div class="rec-section-header">
          <span class="rec-badge-pill">✨ Sommelier & Chef Harmonies</span>
          <h3 class="modal-section-title" style="margin: 0.35rem 0 0.85rem;">Recommended Pairings & Similar Dishes</h3>
        </div>
        <div class="modal-rec-cards-grid">
          ${getRelatedRecipes(r, undefined, 3).map(rel => `
            <div class="modal-rec-card" data-rec-id="${rel.recipe.id || rel.recipe.idMeal}">
              <div class="rec-card-thumb-wrap">
                <img src="${rel.recipe.thumbnail || rel.recipe.strMealThumb}" alt="${sanitizeHtml(rel.recipe.title || rel.recipe.strMeal)}" class="rec-card-img" />
                <span class="rec-pairing-badge">${rel.pairingBadge}</span>
              </div>
              <div class="rec-card-info">
                <h4 class="rec-card-title">${rel.recipe.title || rel.recipe.strMeal}</h4>
                <div class="rec-card-meta">
                  <span>🍽️ ${rel.recipe.category || rel.recipe.strCategory}</span>
                  <span>⏱️ ${rel.recipe.estimatedTime || 30} mins</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.attachModalInteractiveEvents();
  }

  attachModalInteractiveEvents() {
    const heroImg = this.modalContent.querySelector('.modal-hero-img');
    if (heroImg) {
      heroImg.addEventListener('error', () => {
        heroImg.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';
      }, { once: true });
    }

    const scaleUp = document.getElementById('btnScaleUp');
    const scaleDown = document.getElementById('btnScaleDown');
    const unitMetric = document.getElementById('btnUnitMetric');
    const unitImperial = document.getElementById('btnUnitImperial');
    const btnLaunchCook = document.getElementById('btnLaunchCookMode');
    const btnModalFav = document.getElementById('btnModalFav');
    const btnModalShare = document.getElementById('btnModalShare');
    const btnModalPrint = document.getElementById('btnModalPrint');
    const btnAddAllCart = document.getElementById('btnAddAllToCart');

    scaleUp?.addEventListener('click', () => {
      if (this.currentServings < 16) {
        this.currentServings += 1;
        this.render();
      }
    });

    scaleDown?.addEventListener('click', () => {
      if (this.currentServings > 1) {
        this.currentServings -= 1;
        this.render();
      }
    });

    unitMetric?.addEventListener('click', () => {
      if (this.unitSystem !== 'metric') {
        this.unitSystem = 'metric';
        this.render();
      }
    });

    unitImperial?.addEventListener('click', () => {
      if (this.unitSystem !== 'imperial') {
        this.unitSystem = 'imperial';
        this.render();
      }
    });

    btnModalFav?.addEventListener('click', () => {
      const isFav = toggleFavorite(this.currentRecipe);
      btnModalFav.innerHTML = isFav ? '❤️' : '🤍';
      btnModalFav.title = isFav ? 'Remove Favorite' : 'Save Favorite';
    });

    btnModalShare?.addEventListener('click', () => {
      const shareData = {
        title: `Culinaria - ${this.currentRecipe.title}`,
        text: `Check out this delicious recipe for ${this.currentRecipe.title} on Culinaria!`,
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).then(() => {
          window.dispatchEvent(new CustomEvent('culinaria:toast', { detail: { message: '🔗 Recipe link copied to clipboard!' } }));
        });
      }
    });

    btnModalPrint?.addEventListener('click', () => {
      window.print();
    });

    btnAddAllCart?.addEventListener('click', () => {
      const ratio = this.currentServings / this.baseServings;
      const items = this.currentRecipe.ingredients.map(i => ({
        name: i.name,
        measure: scaleMeasurement(i.measure, ratio, this.unitSystem),
        recipeTitle: this.currentRecipe.title
      }));
      addToShoppingList(items);
      window.dispatchEvent(new CustomEvent('culinaria:toast', {
        detail: { message: `🛒 Added ${items.length} ingredients to your Grocery List!` }
      }));
    });

    this.modalContent.querySelectorAll('.clickable-timer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mins = parseInt(btn.dataset.minutes, 10);
        activeTimer.start(mins * 60, `${this.currentRecipe.title}`);
        window.dispatchEvent(new CustomEvent('culinaria:toast', { detail: { message: `⏱️ Started ${mins}-minute timer!` } }));
      });
    });

    // Substitution advice popovers
    this.modalContent.querySelectorAll('.sub-hint-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const ingName = btn.dataset.ing;
        const subInfo = getIngredientSubstitution(ingName);
        if (subInfo) {
          window.dispatchEvent(new CustomEvent('culinaria:toast', {
            detail: { message: `💡 Substitute for ${ingName}: ${subInfo.substitute} • ${subInfo.note}` }
          }));
        }
      });
    });

    // Related Recommendation Cards Navigation
    this.modalContent.querySelectorAll('.modal-rec-card').forEach(card => {
      card.addEventListener('click', async () => {
        const targetId = card.dataset.recId;
        const found = await getRecipeById(targetId);
        if (found) {
          this.open(found);
          const scrollEl = document.getElementById('recipeModal') || document.getElementById('modalRecipeContent');
          scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Checkbox toggles with state preservation
    this.modalContent.querySelectorAll('.ing-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const item = e.target.closest('.ingredient-item');
        const name = (cb.dataset.name || '').toLowerCase();
        if (e.target.checked) {
          this.checkedIngredientNames.add(name);
          item?.classList.add('checked');
        } else {
          this.checkedIngredientNames.delete(name);
          item?.classList.remove('checked');
        }
      });
    });

    // Inline Step Timer chips click
    this.modalContent.querySelectorAll('.inline-step-timer-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const mins = parseInt(chip.dataset.minutes, 10) || 5;
        activeTimer.start(mins * 60, `${this.currentRecipe.title} (${mins}m)`);
        window.dispatchEvent(new CustomEvent('culinaria:toast', {
          detail: { message: `⏱️ Started ${mins}-minute kitchen timer for this step!` }
        }));
      });
    });

    // Video Facade Click-to-Play
    this.modalContent.querySelectorAll('.video-facade-card, .btn-facade-play').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const facade = el.closest('.video-facade-card');
        if (!facade) return;
        const ytId = facade.dataset.ytId;
        const ytTitle = facade.dataset.ytTitle || 'Recipe Video Guide';
        const parent = facade.closest('.video-frame-container');
        if (parent && ytId) {
          parent.innerHTML = `
            <iframe 
              src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=1&rel=0&modestbranding=1" 
              title="${ytTitle}" 
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen>
            </iframe>
          `;
        }
      });
    });

    btnLaunchCook?.addEventListener('click', () => {
      this.openCookMode();
    });
  }

  highlightTimers(text) {
    if (!text || typeof text !== 'string') return '';
    return sanitizeHtml(text).replace(/\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/gi, (match, count, unit) => {
      let mins = parseInt(count, 10);
      if (/hour|hr/i.test(unit)) mins *= 60;
      return `<button type="button" class="inline-step-timer-chip" data-minutes="${mins}" title="Click to start ${mins}-minute countdown timer">⏱️ ${match}</button>`;
    });
  }

  /* ==========================================================================
     Guided Hands-Free Cook Mode with Voice
     ========================================================================== */
  openCookMode() {
    this.currentCookStepIndex = 0;
    this.cookTitle.textContent = this.currentRecipe.title;
    this.cookOverlay.classList.add('open');
    this.btnToggleVoice.classList.add('active');
    this.btnToggleVoice.querySelector('.voice-label').textContent = 'Voice On';
    this.voiceActive = true;
    this.renderCurrentCookStep();
  }

  closeCookMode() {
    voiceAssistant.stop();
    this.cookOverlay.classList.remove('open');
  }

  renderCurrentCookStep() {
    const steps = this.currentRecipe.steps;
    const total = steps.length;
    const current = this.currentCookStepIndex;

    this.cookStepNum.textContent = `Step ${current + 1} of ${total}`;
    this.cookProgressPill.textContent = `${Math.round(((current + 1) / total) * 100)}% Complete`;
    this.cookProgressBar.style.width = `${((current + 1) / total) * 100}%`;

    const stepText = steps[current];
    this.cookStepText.textContent = stepText;

    const timerMatch = stepText.match(/\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
    if (timerMatch) {
      let mins = parseInt(timerMatch[1], 10);
      if (/hour|hr/i.test(timerMatch[2])) mins *= 60;
      this.stepTimerLabel.textContent = `Detected timer for this step:`;
      this.btnStartStepTimer.textContent = `Start Timer (${mins} min)`;
      this.btnStartStepTimer.dataset.minutes = mins;
      this.stepTimerContainer.classList.remove('hidden');
    } else {
      this.stepTimerContainer.classList.add('hidden');
    }

    this.btnCookPrev.disabled = current === 0;
    if (current === total - 1) {
      this.btnCookNext.textContent = '🎉 Finish & Enjoy!';
    } else {
      this.btnCookNext.textContent = 'Next Step →';
    }

    if (this.voiceActive) {
      this.speakCurrentStep();
    }
  }

  speakCurrentStep() {
    const current = this.currentCookStepIndex;
    const stepText = this.currentRecipe.steps[current];
    voiceAssistant.speak(`Step ${current + 1}. ${stepText}`);
  }

  nextCookStep() {
    const total = this.currentRecipe.steps.length;
    if (this.currentCookStepIndex < total - 1) {
      this.currentCookStepIndex++;
      this.renderCurrentCookStep();
    } else {
      voiceAssistant.speak(`Congratulations! You have perfected ${this.currentRecipe.title}. Bon appetit!`);
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.6 }
      });
      window.dispatchEvent(new CustomEvent('culinaria:toast', {
        detail: { message: `👨‍🍳 Bon Appétit! You completed ${this.currentRecipe.title}!` }
      }));
      setTimeout(() => this.closeCookMode(), 1500);
    }
  }

  prevCookStep() {
    if (this.currentCookStepIndex > 0) {
      this.currentCookStepIndex--;
      this.renderCurrentCookStep();
    }
  }
}
