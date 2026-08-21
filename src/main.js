/**
 * Culinaria - Application Orchestrator
 */
import { sanitizeHtml, sanitizeUrl } from './utils/securitySanitizer.js';
import { initDomWatchdog } from './utils/domWatchdog.js';
import { initErrorBoundary } from './utils/errorBoundary.js';
import { initNetworkMonitor } from './utils/networkMonitor.js';
import {
  searchRecipes,
  getRecipeById,
  getCategories,
  getAreas,
  filterByCategoryAndArea
} from './services/mealDbApi.js';
import {
  getFavorites,
  getStoredTheme,
  setStoredTheme
} from './services/storageService.js';
import { activeTimer } from './services/timerManager.js';
import { getPersonalizedRecommendations } from './services/recommendationEngine.js';
import { getChefPreferences } from './services/preferencesService.js';
import { createRecipeCard } from './components/RecipeCard.js';
import { CookingStudioModal } from './components/CookingStudioModal.js';
import { PantryFinder } from './components/PantryFinder.js';
import { ShoppingListDrawer } from './components/ShoppingListDrawer.js';
import { RouletteModal } from './components/RouletteModal.js';
import { PreferencesDrawer } from './components/PreferencesDrawer.js';
import { mealPlannerDrawer } from './components/MealPlannerDrawer.js';
import { getActivePaletteId, setActivePalette } from './services/paletteService.js';

// Arm real-time defenses, error boundary, and offline network monitor
initErrorBoundary();
initDomWatchdog();
initNetworkMonitor();

class CulinariaApp {
  constructor() {
    this.currentView = 'explore';
    this.currentRecipes = [];
    this.activeCategory = 'all';
    this.activeArea = 'all';
    this.activeQuickFilter = null;
    this.searchQuery = '';
    this.searchDebounceTimer = null;

    // Component Instances
    this.cookingStudio = new CookingStudioModal();
    this.pantryFinder = new PantryFinder();
    this.shoppingDrawer = new ShoppingListDrawer();
    this.rouletteModal = new RouletteModal();
    this.preferencesDrawer = new PreferencesDrawer();
    this.mealPlannerDrawer = mealPlannerDrawer;

    this.initDOM();
    this.initTheme();
    this.initPreferences();
    this.initNavigation();
    this.initSearchAndFilters();
    this.initTimerDock();
    this.initGlobalEvents();

    this.bootstrapApp();
  }

  initPreferences() {
    const prefs = getChefPreferences();
    this.applyPreferences(prefs);
  }

  applyPreferences(prefs) {
    if (this.recipeGrid) {
      this.recipeGrid.classList.toggle('compact-grid', Boolean(prefs.compactGrid));
    }
    if (this.favoritesGrid) {
      this.favoritesGrid.classList.toggle('compact-grid', Boolean(prefs.compactGrid));
    }
  }

  initDOM() {
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.viewPanels = document.querySelectorAll('.view-panel');
    this.favCountPill = document.getElementById('favCountPill');

    this.searchInput = document.getElementById('recipeSearchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.searchSubmitBtn = document.getElementById('searchSubmitBtn');
    this.suggestionsDropdown = document.getElementById('searchSuggestionsDropdown');
    this.categoryNav = document.getElementById('categoryNav');
    this.cuisineSelect = document.getElementById('cuisineSelect');
    this.filterUnder30 = document.getElementById('filterUnder30');
    this.filterVeg = document.getElementById('filterVeg');
    this.filterProtein = document.getElementById('filterProtein');
    this.resultsCount = document.getElementById('resultsCount');
    this.recipeGrid = document.getElementById('recipeCardsGrid');
    this.gridLoading = document.getElementById('gridLoading');
    this.gridEmpty = document.getElementById('gridEmpty');
    this.btnResetFilters = document.getElementById('btnResetFilters');

    this.favoritesGrid = document.getElementById('favoritesGrid');
    this.favoritesEmpty = document.getElementById('favoritesEmpty');
    this.btnExploreFromFavs = document.getElementById('btnExploreFromFavs');

    this.floatingTimerBar = document.getElementById('floatingTimerBar');
    this.timerDishTitle = document.getElementById('timerDishTitle');
    this.timerDigits = document.getElementById('timerDigits');
    this.timerToggleBtn = document.getElementById('timerToggleBtn');
    this.timerResetBtn = document.getElementById('timerResetBtn');
    this.timerDismissBtn = document.getElementById('timerDismissBtn');

    this.toastContainer = document.getElementById('toastContainer');
  }

  /* ==========================================================================
     Theme Management & Zero-Flicker Synchronizer
     ========================================================================== */
  initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    const syncThemeUI = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      setStoredTheme(theme);
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#121413' : '#faf8f5');
      }
      if (themeToggle) {
        themeToggle.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
        themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
      }
    };

    const currentTheme = document.documentElement.getAttribute('data-theme') || getStoredTheme();
    syncThemeUI(currentTheme);
    setActivePalette(getActivePaletteId());

    themeToggle?.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = active === 'dark' ? 'light' : 'dark';
      syncThemeUI(nextTheme);
    });
  }

  /* ==========================================================================
     Navigation & Views
     ========================================================================== */
  initNavigation() {
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'explore' && this.currentView === 'explore') {
          this.resetFiltersToDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.searchInput.focus();
          this.showToast('🍽️ Refreshed to All Dishes');
          return;
        }
        this.switchView(view);
      });
    });

    document.getElementById('navHome')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.resetFiltersToDefault();
      this.switchView('explore');
    });

    this.btnExploreFromFavs?.addEventListener('click', () => {
      this.switchView('explore');
    });

    document.getElementById('btnMealPlanner')?.addEventListener('click', () => {
      this.mealPlannerDrawer.open();
    });

    this.updateFavCountBadge();
  }

  switchView(viewName) {
    this.currentView = viewName;

    this.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    this.viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    });

    if (viewName === 'favorites') {
      this.renderFavoritesView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateFavCountBadge() {
    const count = getFavorites().length;
    document.querySelectorAll('.fav-count-pill').forEach(el => {
      el.textContent = count;
    });
  }

  /* ==========================================================================
     Advanced Explore Discovery & Search Engine
     ========================================================================== */
  async triggerExplore(options = {}) {
    const { scrollToResults = true, refreshIfEmpty = true } = options;

    clearTimeout(this.searchDebounceTimer);
    const query = this.searchInput.value.trim();
    this.searchQuery = query;
    this.suggestionsDropdown?.classList.add('hidden');

    const originalBtnText = this.searchSubmitBtn.innerHTML;
    this.searchSubmitBtn.classList.add('exploring');
    this.searchSubmitBtn.innerHTML = '<span>✨ Exploring...</span>';

    try {
      if (this.currentView !== 'explore') {
        this.switchView('explore');
      }

      if (!query && refreshIfEmpty) {
        this.setGridLoading(true);
        const allRecipes = await filterByCategoryAndArea(this.activeCategory, this.activeArea);
        // Fisher-Yates shuffle for unbiased dynamic discovery inspiration
        const shuffled = [...allRecipes];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        this.currentRecipes = shuffled;
        this.applyLocalFilters();
        this.setGridLoading(false);
        this.showToast('✨ Discovered fresh chef specials!');
      } else {
        await this.executeFilterAndSearch();
        if (query) {
          const count = this.currentRecipes ? this.currentRecipes.length : 0;
          this.showToast(`🔍 Found ${count} ${count === 1 ? 'dish' : 'dishes'} for "${query}"`);
        }
      }

      if (scrollToResults) {
        setTimeout(() => {
          const targetEl = document.getElementById('filtersContainer') || document.getElementById('recipeCardsGrid');
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    } catch (err) {
      console.error('Explore discovery error:', err);
      this.executeFilterAndSearch();
    } finally {
      this.setGridLoading(false);
      this.searchSubmitBtn.classList.remove('exploring');
      this.searchSubmitBtn.innerHTML = originalBtnText;
    }
  }

  resetFiltersToDefault() {
    clearTimeout(this.searchDebounceTimer);
    this.activeCategory = 'all';
    this.activeArea = 'all';
    this.activeQuickFilter = null;
    this.searchQuery = '';
    this.searchInput.value = '';
    this.clearSearchBtn.classList.add('hidden');
    this.suggestionsDropdown?.classList.add('hidden');
    this.cuisineSelect.value = 'all';
    [this.filterUnder30, this.filterVeg, this.filterProtein].forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });

    this.categoryNav.querySelectorAll('.cat-pill').forEach(p => {
      const active = p.dataset.category === 'all';
      p.classList.toggle('active', active);
      p.setAttribute('aria-pressed', String(active));
    });

    this.executeFilterAndSearch();
  }

  /* ==========================================================================
     Search & Filters with Suggestions
     ========================================================================== */
  initSearchAndFilters() {
    this.searchInput.addEventListener('input', () => {
      const query = this.searchInput.value.trim();
      this.clearSearchBtn.classList.toggle('hidden', !query);

      if (query.length >= 2) {
        this.renderSuggestions(query);
      } else {
        this.suggestionsDropdown?.classList.add('hidden');
      }

      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.searchQuery = query;
        this.executeFilterAndSearch();
      }, 350);
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box-wrapper')) {
        this.suggestionsDropdown?.classList.add('hidden');
      }
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.resetFiltersToDefault();
    });

    this.searchSubmitBtn.addEventListener('click', () => {
      this.triggerExplore({ scrollToResults: true, refreshIfEmpty: true });
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.triggerExplore({ scrollToResults: true, refreshIfEmpty: false });
      }
    });

    document.querySelectorAll('.trend-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        clearTimeout(this.searchDebounceTimer);
        const q = chip.dataset.query;
        this.searchInput.value = q;
        this.searchQuery = q;
        this.clearSearchBtn.classList.remove('hidden');
        this.suggestionsDropdown?.classList.add('hidden');
        this.switchView('explore');
        this.triggerExplore({ scrollToResults: true, refreshIfEmpty: false });
      });
    });

    this.cuisineSelect.addEventListener('change', (e) => {
      this.activeArea = e.target.value;
      this.executeFilterAndSearch();
    });

    const setupQuickToggle = (btn, filterKey) => {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        if (this.activeQuickFilter === filterKey) {
          this.activeQuickFilter = null;
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          [this.filterUnder30, this.filterVeg, this.filterProtein].forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          });
          this.activeQuickFilter = filterKey;
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        this.applyLocalFilters();
      });
    };

    setupQuickToggle(this.filterUnder30, 'under30');
    setupQuickToggle(this.filterVeg, 'vegetarian');
    setupQuickToggle(this.filterProtein, 'highprotein');

    this.btnResetFilters.addEventListener('click', () => {
      this.resetFiltersToDefault();
    });
  }

  async renderSuggestions(query) {
    try {
      const results = await searchRecipes(query);
      const topFive = results.slice(0, 5);

      if (topFive.length === 0) {
        this.suggestionsDropdown.innerHTML = `
          <div class="suggestion-empty-item">
            <span class="empty-icon">🔍</span>
            <div class="suggestion-info">
              <div class="suggestion-title">No dishes matching "${sanitizeHtml(query)}"</div>
              <div class="suggestion-meta">Try searching for "pasta", "curry", "salmon", or "beef"</div>
            </div>
          </div>
        `;
        this.suggestionsDropdown.classList.remove('hidden');
        return;
      }

      this.suggestionsDropdown.innerHTML = topFive.map(r => `
        <div class="suggestion-item" data-id="${sanitizeHtml(r.id)}">
          <img src="${sanitizeUrl(r.thumbnail || '', '')}" alt="${sanitizeHtml(r.title)}" class="suggestion-thumb" />
          <div class="suggestion-info">
            <div class="suggestion-title">${sanitizeHtml(r.title)}</div>
            <div class="suggestion-meta">🌍 ${sanitizeHtml(r.area)} • ${sanitizeHtml(r.category)}</div>
          </div>
        </div>
      `).join('');

      this.suggestionsDropdown.classList.remove('hidden');

      this.suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          this.suggestionsDropdown.classList.add('hidden');
          window.dispatchEvent(new CustomEvent('culinaria:open-recipe', { detail: { recipeId: id } }));
        });
      });
    } catch {
      this.suggestionsDropdown.classList.add('hidden');
    }
  }

  /* ==========================================================================
     Bootstrap App Data
     ========================================================================== */
  async bootstrapApp() {
    this.setGridLoading(true);

    try {
      const categories = await getCategories();
      this.renderCategoryPills(categories);

      const areas = await getAreas();
      this.renderCuisineDropdown(areas);

      const initialMeals = await searchRecipes('Chicken');
      const pastaMeals = await searchRecipes('Pasta');
      const seafoodMeals = await searchRecipes('Salmon');
      
      const combined = [...initialMeals, ...pastaMeals, ...seafoodMeals].slice(0, 18);
      this.currentRecipes = combined;
      this.renderRecipeGrid(combined);

    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      this.setGridLoading(false);
    }
  }

  renderCategoryPills(categories) {
    const categoryEmojis = {
      Beef: '🥩',
      Chicken: '🍗',
      Dessert: '🍰',
      Lamb: '🍖',
      Miscellaneous: '🍲',
      Pasta: '🍝',
      Pork: '🥓',
      Seafood: '🦐',
      Side: '🥗',
      Starter: '🥟',
      Vegan: '🥑',
      Vegetarian: '🌱',
      Breakfast: '🥞',
      Goat: '🐐'
    };

    const pillsHtml = categories.map(cat => {
      const emoji = categoryEmojis[cat.name] || '🍽️';
      return `
        <button class="cat-pill" data-category="${cat.name}" aria-pressed="${cat.name === 'all'}">
          <span class="cat-icon">${emoji}</span>
          <span>${cat.name}</span>
        </button>
      `;
    }).join('');

    this.categoryNav.insertAdjacentHTML('beforeend', pillsHtml);

    this.categoryNav.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.categoryNav.querySelectorAll('.cat-pill').forEach(p => {
          const active = p === pill;
          p.classList.toggle('active', active);
          p.setAttribute('aria-pressed', String(active));
        });
        this.activeCategory = pill.dataset.category;
        this.executeFilterAndSearch();
      });
    });
  }

  renderCuisineDropdown(areas) {
    const fragment = document.createDocumentFragment();
    areas.forEach(area => {
      const option = document.createElement('option');
      option.value = area;
      option.textContent = area;
      fragment.appendChild(option);
    });
    this.cuisineSelect.appendChild(fragment);
  }

  /* ==========================================================================
     Query & Execution
     ========================================================================== */
  async executeFilterAndSearch() {
    this.setGridLoading(true);
    this.gridEmpty.classList.add('hidden');
    const prefs = getChefPreferences();

    try {
      let results = [];
      let effectiveCat = this.activeCategory;
      if (effectiveCat === 'all' && prefs.vegetarianOnly) {
        effectiveCat = 'Vegetarian';
      }

      if (this.searchQuery) {
        results = await searchRecipes(this.searchQuery);
        // If user has a category or area filter active during search, apply it
        if (effectiveCat !== 'all') {
          results = results.filter(r => (r.category || '').toLowerCase() === effectiveCat.toLowerCase());
        }
        if (this.activeArea !== 'all') {
          results = results.filter(r => (r.area || '').toLowerCase() === this.activeArea.toLowerCase());
        }
      } else {
        // Multi-dimensional filtering by Category AND Cuisine Area
        results = await filterByCategoryAndArea(effectiveCat, this.activeArea);
      }

      this.currentRecipes = results;
      this.applyLocalFilters();

    } catch (err) {
      console.error('Filter search error:', err);
      this.currentRecipes = [];
      this.renderRecipeGrid([]);
    } finally {
      this.setGridLoading(false);
    }
  }

  applyLocalFilters() {
    let filtered = [...this.currentRecipes];
    const prefs = getChefPreferences();

    if (prefs.quickUnder30 || this.activeQuickFilter === 'under30') {
      filtered = filtered.filter(r => (r.estimatedTime || 30) <= 30);
    }
    
    if (prefs.vegetarianOnly || this.activeQuickFilter === 'vegetarian') {
      filtered = filtered.filter(r => 
        r.category === 'Vegetarian' || 
        r.category === 'Vegan' || 
        r.category === 'Side' ||
        (r.title && /(salad|veggie|cheese|mushroom|paneer|tofu|vegetarian|vegan)/i.test(r.title))
      );
    }
    
    if (prefs.highProteinOnly || this.activeQuickFilter === 'highprotein') {
      filtered = filtered.filter(r => 
        r.category === 'Beef' || 
        r.category === 'Chicken' || 
        r.category === 'Seafood' || 
        r.category === 'Pork' ||
        r.category === 'Lamb' ||
        r.category === 'Goat'
      );
    }

    this.renderRecipeGrid(filtered);
  }

  renderRecipeGrid(recipes) {
    this.setGridLoading(false);
    this.recipeGrid.innerHTML = '';
    const count = recipes.length;

    this.resultsCount.textContent = `Showing ${count} ${count === 1 ? 'recipe' : 'recipes'}`;

    if (count === 0) {
      let emptyTitle = 'No matching culinary creations found';
      let emptyDesc = 'Try exploring another ingredient, dish name, or resetting your cuisine filters.';
      let resetBtnText = 'Reset All Filters';

      const catText = this.activeCategory !== 'all' ? `"${this.activeCategory}"` : '';
      const areaText = this.activeArea !== 'all' ? `"${this.activeArea}"` : '';
      const filterDesc = [catText, areaText].filter(Boolean).join(' in ');

      if (this.searchQuery) {
        if (filterDesc) {
          emptyTitle = `No dishes matching "${this.searchQuery}" in ${filterDesc}`;
          emptyDesc = `We couldn't find any ${filterDesc} recipes with "${this.searchQuery}". Try clearing your search or switching to "All Dishes".`;
          resetBtnText = `Clear Search & Reset ${filterDesc}`;
        } else {
          emptyTitle = `No recipes found matching "${this.searchQuery}"`;
          emptyDesc = `We searched through our entire culinary vault, but couldn't find any dishes matching "${this.searchQuery}". Try searching for "pasta", "chicken", "salmon", or "curry".`;
          resetBtnText = 'Clear Search Query';
        }
      } else if (filterDesc) {
        emptyTitle = `No ${filterDesc} dishes found in the database`;
        emptyDesc = `Try selecting "All World Traditions" in the region selector or picking another category pill.`;
        resetBtnText = 'Reset All Filters';
      }

      const emptyHeader = document.querySelector('#gridEmpty .empty-title');
      const emptyParagraph = document.querySelector('#gridEmpty .empty-desc');
      if (emptyHeader) emptyHeader.textContent = emptyTitle;
      if (emptyParagraph) emptyParagraph.textContent = emptyDesc;
      if (this.btnResetFilters) this.btnResetFilters.textContent = resetBtnText;

      this.gridEmpty.classList.remove('hidden');
      return;
    }

    this.gridEmpty.classList.add('hidden');

    recipes.forEach(recipe => {
      const card = createRecipeCard(recipe);
      this.recipeGrid.appendChild(card);
    });

    this.renderPalateRibbon();
  }

  async renderPalateRibbon() {
    const ribbonEl = document.getElementById('palateRibbon');
    const stripEl = document.getElementById('palateCardsStrip');
    if (!ribbonEl || !stripEl) return;

    // Only show ribbon in explore view when not searching
    if (this.currentView !== 'explore' || this.searchQuery) {
      ribbonEl.classList.add('hidden');
      return;
    }

    const favorites = getFavorites();
    const recs = await getPersonalizedRecommendations(favorites, undefined, 5);
    if (!recs || recs.length === 0) {
      ribbonEl.classList.add('hidden');
      return;
    }

    stripEl.innerHTML = recs.map(item => `
      <div class="palate-card" data-rec-id="${sanitizeHtml(item.recipe.id || item.recipe.idMeal)}">
        <div class="palate-thumb-wrap">
          <img src="${sanitizeUrl(item.recipe.thumbnail || item.recipe.strMealThumb || '', '')}" alt="${sanitizeHtml(item.recipe.title || item.recipe.strMeal)}" class="palate-img" loading="lazy" />
          <span class="palate-rationale-pill">${sanitizeHtml(item.rationale)}</span>
        </div>
        <div class="palate-info">
          <h4 class="palate-dish-title">${sanitizeHtml(item.recipe.title || item.recipe.strMeal)}</h4>
          <div class="palate-meta">
            <span>🍽️ ${sanitizeHtml(item.recipe.category || item.recipe.strCategory)}</span>
            <span>⏱️ ${sanitizeHtml(item.recipe.estimatedTime || 30)}m</span>
          </div>
        </div>
      </div>
    `).join('');

    stripEl.querySelectorAll('.palate-card').forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.dataset.recId;
        const recipe = await getRecipeById(id);
        if (recipe) {
          await this.cookingStudio.open(recipe);
        }
      });
    });

    ribbonEl.classList.remove('hidden');
  }

  setGridLoading(isLoading) {
    this.gridLoading.classList.toggle('hidden', !isLoading);
    if (isLoading) {
      this.recipeGrid.style.opacity = '0.3';
      this.recipeGrid.style.pointerEvents = 'none';
    } else {
      this.recipeGrid.style.opacity = '1';
      this.recipeGrid.style.pointerEvents = 'auto';
    }
  }

  /* ==========================================================================
     Favorites & Cookbook View
     ========================================================================== */
  renderFavoritesView() {
    const favs = getFavorites();
    this.favoritesGrid.innerHTML = '';

    if (favs.length === 0) {
      this.favoritesEmpty.classList.remove('hidden');
      this.favoritesGrid.classList.add('hidden');
      return;
    }

    this.favoritesEmpty.classList.add('hidden');
    this.favoritesGrid.classList.remove('hidden');
    favs.forEach(recipe => {
      const card = createRecipeCard(recipe);
      this.favoritesGrid.appendChild(card);
    });
  }

  /* ==========================================================================
     Kitchen Timer Dock
     ========================================================================== */
  initTimerDock() {
    // Id of the timer currently shown in the dock (most urgent running/paused timer).
    this.dockTimerId = null;

    const pickDockTimer = (timers) => {
      const active = timers.filter(t => t.status === 'running' || t.status === 'paused');
      if (active.length === 0) return null;
      return active.reduce((a, b) => (a.remainingSeconds <= b.remainingSeconds ? a : b));
    };

    activeTimer.subscribe((state) => {
      const dockTimer = pickDockTimer(state.timers);
      this.dockTimerId = dockTimer ? dockTimer.id : null;

      if (dockTimer) {
        this.floatingTimerBar.classList.remove('hidden');
        this.timerDishTitle.textContent = dockTimer.title;
        this.timerDigits.textContent = activeTimer.formatTime(dockTimer.remainingSeconds);
        this.timerToggleBtn.textContent = dockTimer.status === 'running' ? '⏸️' : '▶️';
      } else {
        this.floatingTimerBar.classList.add('hidden');
      }
    });

    this.timerToggleBtn.addEventListener('click', () => {
      const timer = this.dockTimerId && activeTimer.getAll().find(t => t.id === this.dockTimerId);
      if (!timer) return;
      if (timer.status === 'running') {
        activeTimer.pauseTimer(timer.id);
      } else if (timer.status === 'paused') {
        activeTimer.resumeTimer(timer.id);
      }
    });

    this.timerResetBtn.addEventListener('click', () => {
      if (this.dockTimerId) activeTimer.removeTimer(this.dockTimerId);
    });

    this.timerDismissBtn.addEventListener('click', () => {
      if (this.dockTimerId) activeTimer.removeTimer(this.dockTimerId);
      this.floatingTimerBar.classList.add('hidden');
    });
  }

  /* ==========================================================================
     Global App Events, Favorites Synchronization & Toasts
     ========================================================================== */
  initGlobalEvents() {
    window.addEventListener('culinaria:open-recipe', async (e) => {
      const { recipeId } = e.detail;
      this.showToast('🔍 Preparing haute cuisine studio...');
      try {
        const fullRecipe = await getRecipeById(recipeId);
        if (fullRecipe) {
          await this.cookingStudio.open(fullRecipe);
        }
      } catch (err) {
        console.error(err);
        this.showToast('⚠️ Could not load recipe details.');
      }
    });

    // Real-time synchronization of all heart buttons across all views & modals
    window.addEventListener('culinaria:favs-updated', (e) => {
      const favs = e.detail?.favorites || getFavorites();
      this.updateFavCountBadge();

      const favIds = new Set(favs.map(r => String(r.id || r.idMeal)));

      // 1. Sync all card heart buttons
      document.querySelectorAll('.btn-card-fav').forEach(btn => {
        const card = btn.closest('.recipe-card');
        const cardId = card?.dataset?.id;
        if (cardId) {
          const isFav = favIds.has(String(cardId));
          btn.classList.toggle('is-favorite', isFav);
          btn.innerHTML = isFav ? '❤️' : '🤍';
          btn.title = isFav ? 'Remove from favorites' : 'Save recipe';
        }
      });

      // 2. Sync modal heart button if currently open
      const modalFavBtn = document.getElementById('btnModalFav');
      if (modalFavBtn && this.cookingStudio?.currentRecipe) {
        const modalRecipeId = String(this.cookingStudio.currentRecipe.id || this.cookingStudio.currentRecipe.idMeal);
        const isFav = favIds.has(modalRecipeId);
        modalFavBtn.innerHTML = isFav ? '❤️' : '🤍';
        modalFavBtn.title = isFav ? 'Remove Favorite' : 'Save Favorite';
      }

      // 3. Re-render favorites view if active, and refresh palate recommendations
      if (this.currentView === 'favorites') {
        this.renderFavoritesView();
      } else if (this.currentView === 'explore') {
        this.renderPalateRibbon();
      }
    });

    // Reactive handler for 10 Chef Kitchen Preferences Toggles
    window.addEventListener('culinaria:pref-updated', (e) => {
      const { key, preferences } = e.detail;
      this.applyPreferences(preferences);

      if (['vegetarianOnly', 'highProteinOnly', 'quickUnder30'].includes(key)) {
        this.executeFilterAndSearch();
      }
      if (key === 'compactGrid') {
        this.showToast(`🖼️ Compact Chef View: ${preferences.compactGrid ? 'Active' : 'Cinematic'}`);
      }
    });

    window.addEventListener('culinaria:toast', (e) => {
      this.showToast(e.detail.message);
    });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CulinariaApp();

  // Register the Progressive Web App service worker for offline support.
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration skipped:', err);
        });
    });
  }
});
