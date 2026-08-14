/**
 * PantryFinder Component
 * "What's in your fridge?" multi-ingredient matching engine
 */
import { filterByIngredient, getRecipeById } from '../services/mealDbApi.js';
import { getPantryBasket, savePantryBasket } from '../services/storageService.js';
import { createRecipeCard } from './RecipeCard.js';

export class PantryFinder {
  constructor() {
    this.input = document.getElementById('pantryIngredientInput');
    this.btnAdd = document.getElementById('btnAddPantryItem');
    this.chipsBox = document.getElementById('pantryChipsBox');
    this.emptyHint = document.getElementById('pantryEmptyHint');
    this.btnClear = document.getElementById('btnClearPantry');
    this.btnFind = document.getElementById('btnFindPantryRecipes');
    this.staplesContainer = document.getElementById('quickStaplesContainer');
    this.countSpan = document.getElementById('pantryBasketCount');
    this.resultsArea = document.getElementById('pantryCardsGrid');
    this.resultsHeader = document.getElementById('pantryResultsHeader');
    this.resultsTitle = document.getElementById('pantryResultsCount');

    this.items = getPantryBasket();
    this.init();
  }

  init() {
    this.renderChips();

    // Add via button
    this.btnAdd.addEventListener('click', () => this.addItemFromInput());

    // Add via Enter key
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addItemFromInput();
      }
    });

    // Quick staples click
    this.staplesContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.staple-chip');
      if (chip) {
        const ingredient = chip.dataset.ingredient;
        this.addItem(ingredient);
      }
    });

    // Clear all
    this.btnClear.addEventListener('click', () => {
      this.items = [];
      savePantryBasket(this.items);
      this.renderChips();
      this.resultsArea.innerHTML = '';
      this.resultsHeader.classList.add('hidden');
    });

    // Find recipes button
    this.btnFind.addEventListener('click', () => this.findMatchedRecipes());
  }

  addItemFromInput() {
    const val = this.input.value.trim();
    if (val) {
      this.addItem(val);
      this.input.value = '';
    }
  }

  addItem(name) {
    const normalized = name.trim();
    if (!normalized) return;
    if (!this.items.some(i => i.toLowerCase() === normalized.toLowerCase())) {
      this.items.push(normalized);
      savePantryBasket(this.items);
      this.renderChips();
    }
  }

  removeItem(name) {
    this.items = this.items.filter(i => i.toLowerCase() !== name.toLowerCase());
    savePantryBasket(this.items);
    this.renderChips();
    if (this.items.length === 0) {
      this.clearResults();
    }
  }

  clearResults() {
    if (this.resultsArea) this.resultsArea.innerHTML = '';
    if (this.resultsHeader) this.resultsHeader.classList.add('hidden');
  }

  renderChips() {
    this.countSpan.textContent = this.items.length;
    this.btnFind.disabled = this.items.length === 0;

    if (this.items.length === 0) {
      this.chipsBox.innerHTML = '<p class="pantry-empty-hint">No ingredients added yet. Pick staples above or type any ingredient!</p>';
      this.clearResults();
      return;
    }

    this.chipsBox.innerHTML = this.items.map(item => `
      <span class="pantry-item-chip">
        <span>${item}</span>
        <button type="button" data-remove="${item}" aria-label="Remove ${item}">✕</button>
      </span>
    `).join('');

    this.chipsBox.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeItem(btn.dataset.remove);
      });
    });
  }

  async findMatchedRecipes() {
    if (this.items.length === 0) return;

    this.btnFind.disabled = true;
    this.btnFind.innerHTML = '<span>Matching Ingredients...</span>';
    this.resultsArea.innerHTML = '<div class="culinary-spinner"></div>';
    this.resultsHeader.classList.remove('hidden');
    this.resultsTitle.textContent = 'Searching your pantry recipes...';

    try {
      // Query MealDB for up to first 3 ingredients
      const queryPromises = this.items.slice(0, 4).map(ing => filterByIngredient(ing));
      const resultsArrays = await Promise.all(queryPromises);

      // Score recipes by frequency of appearance across queries
      const recipeMap = new Map();

      resultsArrays.forEach((list) => {
        list.forEach(meal => {
          if (!recipeMap.has(meal.id)) {
            recipeMap.set(meal.id, { meal, matchCount: 1 });
          } else {
            recipeMap.get(meal.id).matchCount++;
          }
        });
      });

      const ranked = Array.from(recipeMap.values())
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 16);

      if (ranked.length === 0) {
        this.resultsTitle.textContent = 'No recipes found for these specific ingredients.';
        this.resultsArea.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">🥣</div>
            <h3 class="empty-title">No direct matches</h3>
            <p class="empty-desc">Try adding common staples like Chicken, Garlic, Eggs, Rice, or Tomato.</p>
          </div>
        `;
        return;
      }

      this.resultsTitle.textContent = `Found ${ranked.length} Delicious Recipes for your Pantry`;
      this.resultsArea.innerHTML = '';

      ranked.forEach(({ meal, matchCount }) => {
        const percent = Math.min(100, Math.round((matchCount / Math.min(this.items.length, 4)) * 100));
        const card = createRecipeCard(meal, {
          pantryMatch: {
            matchedCount: matchCount,
            totalCount: this.items.length,
            percent
          }
        });
        this.resultsArea.appendChild(card);
      });

      // Scroll smoothly down to results
      this.resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('Pantry search error:', err);
      this.resultsTitle.textContent = 'Unable to complete pantry search';
      this.resultsArea.innerHTML = '<p class="empty-desc">Please try again.</p>';
    } finally {
      this.btnFind.disabled = false;
      this.btnFind.innerHTML = '<span>Find Matched Recipes</span> <span class="btn-arrow">→</span>';
    }
  }
}
