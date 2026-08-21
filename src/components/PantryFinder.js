/**
 * PantryFinder Component
 * "What's in your fridge?" multi-ingredient matching engine
 */
import { filterByIngredient } from '../services/mealDbApi.js';
import { getPantryBasket, savePantryBasket } from '../services/storageService.js';
import { sanitizeHtml } from '../utils/securitySanitizer.js';
import { createRecipeCard } from './RecipeCard.js';

/**
 * Builds the pantry chip strip markup. Exported as a pure function so the
 * user-input escaping contract is directly unit-testable.
 */
export function buildPantryChipsHtml(items) {
  return items.map(item => `
    <span class="pantry-item-chip">
      <span>${sanitizeHtml(item)}</span>
      <button type="button" data-remove="${encodeURIComponent(item)}" aria-label="Remove ${sanitizeHtml(item)}">✕</button>
    </span>
  `).join('');
}

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

    // Initialize Voice Dictate
    this.initVoiceInput();
  }

  initVoiceInput() {
    const btnVoice = document.getElementById('btnVoicePantry');
    if (!btnVoice) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnVoice.title = 'Voice recognition not supported in this browser';
      return;
    }

    let recognition = null;
    let isListening = false;

    const resetBtn = () => {
      isListening = false;
      btnVoice.classList.remove('listening');
      btnVoice.textContent = '🎙️ Speak';
    };

    btnVoice.addEventListener('click', () => {
      if (isListening) {
        recognition?.stop();
        resetBtn();
        return;
      }

      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
          isListening = true;
          btnVoice.classList.add('listening');
          btnVoice.textContent = '🔴 Listening...';
          window.dispatchEvent(new CustomEvent('culinaria:toast', {
            detail: { message: '🎙️ Speak ingredients aloud (e.g. "Garlic, Butter, Shrimp")' }
          }));
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          if (transcript) {
            const rawTokens = transcript
              .split(/,|\sand\s|\spluss\s|\splus\s/i)
              .map(s => s.replace(/^add\s/i, '').replace(/[.,!]/g, '').trim())
              .filter(s => s.length > 1);

            rawTokens.forEach(token => this.addItem(token));

            window.dispatchEvent(new CustomEvent('culinaria:toast', {
              detail: { message: `🎙️ Added from voice: ${rawTokens.join(', ')}` }
            }));
          }
          resetBtn();
        };

        recognition.onerror = (e) => {
          console.warn('Voice recognition error:', e);
          resetBtn();
        };

        recognition.onend = () => {
          resetBtn();
        };

        recognition.start();
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
        resetBtn();
      }
    });
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

    this.chipsBox.innerHTML = buildPantryChipsHtml(this.items);

    this.chipsBox.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeItem(decodeURIComponent(btn.dataset.remove));
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
