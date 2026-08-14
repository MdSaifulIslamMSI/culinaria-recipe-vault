/**
 * Culinaria - Application Orchestrator
 */
import './utils/zeroTrustDefense.js';
import { sanitizeHtml } from './utils/securitySanitizer.js';
import {
  searchRecipes,
  getRecipeById,
  getCategories,
  getAreas,
  filterByCategory,
  filterByArea,
  filterByCategoryAndArea
} from './services/mealDbApi.js';
import {
  getFavorites,
  getStoredTheme,
  setStoredTheme
} from './services/storageService.js';
import { activeTimer } from './services/timerManager.js';
import { createRecipeCard } from './components/RecipeCard.js';
import { CookingStudioModal } from './components/CookingStudioModal.js';
import { PantryFinder } from './components/PantryFinder.js';
import { ShoppingListDrawer } from './components/ShoppingListDrawer.js';
import { RouletteModal } from './components/RouletteModal.js';

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

    this.initDOM();
    this.initTheme();
    this.initNavigation();
    this.initSearchAndFilters();
    this.initTimerDock();
    this.initGlobalEvents();

    this.bootstrapApp();
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
     Theme Management
     ========================================================================== */
  initTheme() {
    const savedTheme = getStoredTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    themeToggle?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      setStoredTheme(nextTheme);
    });
  }

  /* ==========================================================================
     Navigation & Views
     ========================================================================== */
  initNavigation() {
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    document.getElementById('navHome')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('explore');
    });

    this.btnExploreFromFavs?.addEventListener('click', () => {
      this.switchView('explore');
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
     Search & Filters with Suggestions
     ========================================================================== */
  initSearchAndFilters() {
    this.searchInput.addEventListener('input', () => {
      const query = this.searchInput.value.trim();
      this.clearSearchBtn.classList.toggle('hidden', !query);

      if (query.length >= 2) {
        this.renderSuggestions(query);
      } else {
        this.suggestionsDropdown.classList.add('hidden');
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
      this.searchInput.value = '';
      this.searchQuery = '';
      this.clearSearchBtn.classList.add('hidden');
      this.suggestionsDropdown?.classList.add('hidden');
      this.executeFilterAndSearch();
    });

    this.searchSubmitBtn.addEventListener('click', () => {
      this.searchQuery = this.searchInput.value.trim();
      this.suggestionsDropdown?.classList.add('hidden');
      this.executeFilterAndSearch();
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.searchQuery = this.searchInput.value.trim();
        this.suggestionsDropdown?.classList.add('hidden');
        this.executeFilterAndSearch();
      }
    });

    document.querySelectorAll('.trend-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        this.searchInput.value = q;
        this.searchQuery = q;
        this.clearSearchBtn.classList.remove('hidden');
        this.suggestionsDropdown?.classList.add('hidden');
        this.switchView('explore');
        this.executeFilterAndSearch();
      });
    });

    this.cuisineSelect.addEventListener('change', (e) => {
      this.activeArea = e.target.value;
      this.executeFilterAndSearch();
    });

    const setupQuickToggle = (btn, filterKey) => {
      btn.addEventListener('click', () => {
        if (this.activeQuickFilter === filterKey) {
          this.activeQuickFilter = null;
          btn.classList.remove('active');
        } else {
          [this.filterUnder30, this.filterVeg, this.filterProtein].forEach(b => b.classList.remove('active'));
          this.activeQuickFilter = filterKey;
          btn.classList.add('active');
        }
        this.applyLocalFilters();
      });
    };

    setupQuickToggle(this.filterUnder30, 'under30');
    setupQuickToggle(this.filterVeg, 'vegetarian');
    setupQuickToggle(this.filterProtein, 'highprotein');

    this.btnResetFilters.addEventListener('click', () => {
      this.activeCategory = 'all';
      this.activeArea = 'all';
      this.activeQuickFilter = null;
      this.searchQuery = '';
      this.searchInput.value = '';
      this.clearSearchBtn.classList.add('hidden');
      this.suggestionsDropdown?.classList.add('hidden');
      this.cuisineSelect.value = 'all';
      [this.filterUnder30, this.filterVeg, this.filterProtein].forEach(b => b.classList.remove('active'));
      
      this.categoryNav.querySelectorAll('.cat-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.category === 'all');
      });

      this.executeFilterAndSearch();
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
        <div class="suggestion-item" data-id="${r.id}">
          <img src="${r.thumbnail}" alt="${r.title}" class="suggestion-thumb" />
          <div class="suggestion-info">
            <div class="suggestion-title">${r.title}</div>
            <div class="suggestion-meta">🌍 ${r.area} • ${r.category}</div>
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
        <button class="cat-pill" data-category="${cat.name}">
          <span class="cat-icon">${emoji}</span>
          <span>${cat.name}</span>
        </button>
      `;
    }).join('');

    this.categoryNav.insertAdjacentHTML('beforeend', pillsHtml);

    this.categoryNav.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.categoryNav.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeCategory = pill.dataset.category;
        this.executeFilterAndSearch();
      });
    });
  }

  renderCuisineDropdown(areas) {
    const optionsHtml = areas.map(area => `
      <option value="${area}">${area}</option>
    `).join('');
    this.cuisineSelect.insertAdjacentHTML('beforeend', optionsHtml);
  }

  /* ==========================================================================
     Query & Execution
     ========================================================================== */
  async executeFilterAndSearch() {
    this.setGridLoading(true);
    this.gridEmpty.classList.add('hidden');

    try {
      let results = [];

      if (this.searchQuery) {
        results = await searchRecipes(this.searchQuery);
        // If user has a category or area filter active during search, apply it
        if (this.activeCategory !== 'all') {
          results = results.filter(r => (r.category || '').toLowerCase() === this.activeCategory.toLowerCase());
        }
        if (this.activeArea !== 'all') {
          results = results.filter(r => (r.area || '').toLowerCase() === this.activeArea.toLowerCase());
        }
      } else {
        // Multi-dimensional filtering by Category AND Cuisine Area
        results = await filterByCategoryAndArea(this.activeCategory, this.activeArea);
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

    if (this.activeQuickFilter === 'under30') {
      filtered = filtered.filter(r => (r.estimatedTime || 30) <= 30);
    } else if (this.activeQuickFilter === 'vegetarian') {
      filtered = filtered.filter(r => 
        r.category === 'Vegetarian' || 
        r.category === 'Vegan' || 
        r.category === 'Side' ||
        (r.title && /(salad|veggie|cheese|mushroom|paneer|tofu|vegetarian|vegan)/i.test(r.title))
      );
    } else if (this.activeQuickFilter === 'highprotein') {
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
    this.recipeGrid.innerHTML = '';
    const count = recipes.length;

    this.resultsCount.textContent = `Showing ${count} ${count === 1 ? 'recipe' : 'recipes'}`;

    if (count === 0) {
      const catText = this.activeCategory !== 'all' ? `"${this.activeCategory}"` : '';
      const areaText = this.activeArea !== 'all' ? `"${this.activeArea}"` : '';
      const filterDesc = [catText, areaText].filter(Boolean).join(' in ');

      const emptyTitle = filterDesc 
        ? `No ${filterDesc} dishes found in the database`
        : `No matching culinary creations found`;

      const emptyDesc = document.querySelector('#gridEmpty .empty-desc');
      const emptyHeader = document.querySelector('#gridEmpty .empty-title');
      if (emptyHeader) emptyHeader.textContent = emptyTitle;
      if (emptyDesc) {
        emptyDesc.textContent = `Try selecting "All World Traditions" in the region selector or picking another category.`;
      }

      this.gridEmpty.classList.remove('hidden');
      return;
    }

    this.gridEmpty.classList.add('hidden');

    recipes.forEach(recipe => {
      const card = createRecipeCard(recipe);
      this.recipeGrid.appendChild(card);
    });
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
    activeTimer.subscribe((state) => {
      if (state.remainingSeconds > 0 || state.isRunning) {
        this.floatingTimerBar.classList.remove('hidden');
        this.timerDishTitle.textContent = state.title;
        this.timerDigits.textContent = state.formatted;
        this.timerToggleBtn.textContent = state.isRunning ? '⏸️' : '▶️';
      }

      if (state.event === 'completed') {
        this.timerDigits.textContent = '00:00';
        this.timerToggleBtn.textContent = '▶️';
        this.showToast(`⏰ Timer Complete for "${state.title}"!`);
      }
    });

    this.timerToggleBtn.addEventListener('click', () => {
      if (activeTimer.isRunning) {
        activeTimer.pause();
      } else {
        activeTimer.resume();
      }
    });

    this.timerResetBtn.addEventListener('click', () => {
      activeTimer.reset();
    });

    this.timerDismissBtn.addEventListener('click', () => {
      activeTimer.stop();
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
          this.cookingStudio.open(fullRecipe);
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

      // 3. Re-render favorites view if active
      if (this.currentView === 'favorites') {
        this.renderFavoritesView();
      }
    });

    window.addEventListener('culinaria:toast', (e) => {
      this.showToast(e.detail.message);
    });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
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
});
