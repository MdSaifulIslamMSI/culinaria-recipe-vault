/**
 * High-Performance In-Memory Search & Indexing Engine for Culinaria Backend
 * Provides O(1) indexed lookups, inverted token indices, and demonym normalization
 */
import curatedRecipes from '../../src/data/curated500Recipes.js';
import { INGREDIENT_SUBSTITUTIONS } from '../../src/services/recommendationEngine.js';

// Demonym Normalization Dictionary
export const AREA_DEMONYM_MAP = {
  'indian': ['indian', 'india'],
  'american': ['american', 'united states', 'usa', 'us'],
  'british': ['british', 'uk', 'united kingdom', 'england'],
  'canadian': ['canadian', 'canada'],
  'chinese': ['chinese', 'china'],
  'croatian': ['croatian', 'croatia'],
  'dutch': ['dutch', 'netherlands', 'holland'],
  'egyptian': ['egyptian', 'egypt'],
  'filipino': ['filipino', 'philippines'],
  'french': ['french', 'france'],
  'greek': ['greek', 'greece'],
  'irish': ['irish', 'ireland'],
  'italian': ['italian', 'italy'],
  'jamaican': ['jamaican', 'jamaica'],
  'japanese': ['japanese', 'japan'],
  'kenyan': ['kenyan', 'kenya'],
  'malaysian': ['malaysian', 'malaysia'],
  'mexican': ['mexican', 'mexico'],
  'moroccan': ['moroccan', 'morocco'],
  'polish': ['polish', 'poland'],
  'portuguese': ['portuguese', 'portugal'],
  'russian': ['russian', 'russia'],
  'spanish': ['spanish', 'spain'],
  'thai': ['thai', 'thailand'],
  'tunisian': ['tunisian', 'tunisia'],
  'turkish': ['turkish', 'turkey'],
  'ukrainian': ['ukrainian', 'ukraine'],
  'vietnamese': ['vietnamese', 'vietnam']
};

export function matchesArea(targetArea, recipeArea) {
  if (!targetArea || !recipeArea) return false;
  const t = targetArea.toLowerCase().trim();
  const r = recipeArea.toLowerCase().trim();
  if (t === r) return true;
  for (const aliases of Object.values(AREA_DEMONYM_MAP)) {
    if (aliases.includes(t) && aliases.includes(r)) return true;
  }
  return false;
}

class RecipeEngine {
  constructor() {
    this.recipes = curatedRecipes;
    this.idIndex = new Map();
    this.categoryIndex = new Map();
    this.areaIndex = new Map();
    this.tokenIndex = new Map();
    this.pantryIndex = new Map();
    this.categoryCounts = [];
    this.areaCounts = [];

    this.buildIndices();
  }

  buildIndices() {
    const catMap = new Map();
    const areaMap = new Map();

    for (const r of this.recipes) {
      const id = String(r.idMeal);
      this.idIndex.set(id, r);

      // Category indexing
      if (r.strCategory) {
        const cat = r.strCategory.toLowerCase().trim();
        if (!this.categoryIndex.has(cat)) this.categoryIndex.set(cat, []);
        this.categoryIndex.get(cat).push(r);
        catMap.set(r.strCategory, (catMap.get(r.strCategory) || 0) + 1);
      }

      // Area indexing
      if (r.strArea) {
        const ar = r.strArea.toLowerCase().trim();
        if (!this.areaIndex.has(ar)) this.areaIndex.set(ar, []);
        this.areaIndex.get(ar).push(r);
        areaMap.set(r.strArea, (areaMap.get(r.strArea) || 0) + 1);
      }

      // Token Inverted Index for fast text search
      const tokens = new Set();
      const textCorpus = `${r.strMeal || ''} ${r.strCategory || ''} ${r.strArea || ''} ${r.strTags || ''}`.toLowerCase();
      textCorpus.split(/[^a-z0-9]+/i).forEach(tok => {
        if (tok.length >= 2) tokens.add(tok);
      });

      // Index ingredients
      for (let i = 1; i <= 20; i++) {
        const ing = (r[`strIngredient${i}`] || '').toLowerCase().trim();
        if (ing) {
          ing.split(/[^a-z0-9]+/i).forEach(tok => {
            if (tok.length >= 2) {
              tokens.add(tok);
              if (!this.pantryIndex.has(tok)) this.pantryIndex.set(tok, new Set());
              this.pantryIndex.get(tok).add(id);
            }
          });
        }
      }

      for (const tok of tokens) {
        if (!this.tokenIndex.has(tok)) this.tokenIndex.set(tok, new Set());
        this.tokenIndex.get(tok).add(id);
      }
    }

    this.categoryCounts = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));
    this.areaCounts = Array.from(areaMap.entries()).map(([name, count]) => ({ name, count }));
  }

  getById(id) {
    return this.idIndex.get(String(id)) || null;
  }

  getRandom() {
    const idx = Math.floor(Math.random() * this.recipes.length);
    return this.recipes[idx];
  }

  getCategories() {
    return this.categoryCounts;
  }

  getAreas() {
    return this.areaCounts;
  }

  search({ q = '', category = '', area = '', limit = 100 } = {}) {
    let candidateIds = /** @type {Set<string>|null} */ (null);

    // Fast keyword lookup via inverted token index
    if (q) {
      const qTokens = q.toLowerCase().split(/[^a-z0-9]+/i).filter(t => t.length >= 2);
      if (qTokens.length > 0) {
        for (const tok of qTokens) {
          const matchingIds = new Set();
          for (const [indexTok, ids] of this.tokenIndex.entries()) {
            if (indexTok.includes(tok) || tok.includes(indexTok)) {
              for (const id of ids) matchingIds.add(id);
            }
          }
          if (candidateIds === null) {
            candidateIds = matchingIds;
          } else {
            // Intersect
            candidateIds = new Set([...candidateIds].filter(id => matchingIds.has(id)));
          }
        }
      }
    }

    let candidates = candidateIds !== null 
      ? Array.from(candidateIds).map(id => this.idIndex.get(id)).filter(Boolean)
      : this.recipes;

    // Category filter
    if (category) {
      const c = category.toLowerCase().trim();
      candidates = candidates.filter(r => (r.strCategory || '').toLowerCase() === c);
    }

    // Area filter with demonym resolution
    if (area) {
      candidates = candidates.filter(r => matchesArea(area, r.strArea));
    }

    return {
      total: candidates.length,
      recipes: candidates.slice(0, Math.min(100, Math.max(1, limit)))
    };
  }

  matchPantry(ingredients = [], limit = 50) {
    const cleanPantry = ingredients
      .map(i => String(i).trim().toLowerCase())
      .filter(i => i.length >= 2)
      .slice(0, 50); // Hard boundary

    if (cleanPantry.length === 0) {
      return { total: 0, matches: [] };
    }

    const matches = [];

    for (const r of this.recipes) {
      const rIngredients = [];
      for (let i = 1; i <= 20; i++) {
        const ing = (r[`strIngredient${i}`] || '').trim().toLowerCase();
        if (ing) rIngredients.push(ing);
      }

      let matchedCount = 0;
      for (const p of cleanPantry) {
        const isMatched = rIngredients.some(rIng => {
          if (rIng === p) return true;
          if (rIng.includes(p) || p.includes(rIng)) {
            const words = rIng.split(/\s+/);
            return words.includes(p) || p.split(/\s+/).some(w => words.includes(w));
          }
          return false;
        });
        if (isMatched) matchedCount++;
      }

      if (matchedCount > 0) {
        const matchPercent = Math.min(100, Math.round((matchedCount / cleanPantry.length) * 100));
        matches.push({
          recipe: r,
          matchedCount,
          totalProvided: cleanPantry.length,
          matchPercent
        });
      }
    }

    matches.sort((a, b) => b.matchedCount - a.matchedCount || b.matchPercent - a.matchPercent);

    return {
      total: matches.length,
      matches: matches.slice(0, Math.min(100, Math.max(1, limit)))
    };
  }

  getSubstitution(ingredient) {
    if (!ingredient) return { substitutions: INGREDIENT_SUBSTITUTIONS };
    const key = ingredient.trim().toLowerCase();
    return {
      ingredient: key,
      match: INGREDIENT_SUBSTITUTIONS[key] || null
    };
  }
}

export const recipeEngine = new RecipeEngine();
