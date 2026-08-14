/**
 * Storage Service
 * LocalStorage wrapper with prototype pollution defense, rate limiting, and integrity checking
 */
import {
  sanitizeObject,
  sanitizeIdentifier,
  sanitizeTextInput,
  sanitizeUrl,
  computeIntegrityHash,
  storageRateLimiter
} from '../utils/securitySanitizer.js';

const STORAGE_KEYS = {
  FAVORITES: 'culinaria_favorites_v1',
  SHOPPING_LIST: 'culinaria_shopping_list_v1',
  PANTRY_BASKET: 'culinaria_pantry_basket_v1',
  THEME: 'culinaria_theme_preference'
};

function safeGet(key, fallback = []) {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'null' || item === 'undefined') return fallback;
    const parsed = JSON.parse(item);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    // Deep clean parsed object against prototype pollution
    return sanitizeObject(parsed);
  } catch (e) {
    console.warn(`[SECURITY] Error parsing ${key} from localStorage, resetting to fallback:`, e);
    return fallback;
  }
}

function safeSet(key, value) {
  if (!storageRateLimiter.canExecute()) return;
  try {
    const cleanValue = sanitizeObject(value);
    localStorage.setItem(key, JSON.stringify(cleanValue));
  } catch (e) {
    console.error(`[SECURITY] Error saving ${key} to localStorage:`, e);
  }
}

/* ==========================================================================
   Cookbook & Favorites API (Normalized & Complete Storage)
   ========================================================================== */
export function getFavorites() {
  return safeGet(STORAGE_KEYS.FAVORITES, []);
}

export function isFavorite(recipeId) {
  if (!recipeId) return false;
  const strId = String(recipeId);
  const favs = getFavorites();
  return favs.some(r => String(r.id || r.idMeal) === strId);
}

export function toggleFavorite(recipe) {
  if (!recipe) return false;
  const rawId = String(recipe.id || recipe.idMeal || '');
  const recipeId = sanitizeIdentifier(rawId);
  if (!recipeId) return false;

  const favs = getFavorites();
  const index = favs.findIndex(r => String(r.id || r.idMeal) === recipeId);
  let isFav = false;

  if (index >= 0) {
    favs.splice(index, 1);
    isFav = false;
  } else {
    // Save full recipe snapshot for instantaneous offline access in Cookbook
    favs.unshift({
      id: recipeId,
      title: sanitizeTextInput(recipe.title || recipe.strMeal || 'Gourmet Creation', 100),
      thumbnail: sanitizeUrl(recipe.thumbnail || recipe.strMealThumb || ''),
      category: sanitizeTextInput(recipe.category || recipe.strCategory || 'Miscellaneous', 50),
      area: sanitizeTextInput(recipe.area || recipe.strArea || 'Global', 50),
      estimatedTime: Math.max(5, parseInt(recipe.estimatedTime, 10) || 30),
      ingredients: sanitizeObject(recipe.ingredients || []),
      steps: sanitizeObject(recipe.steps || []),
      instructions: sanitizeTextInput(recipe.instructions || recipe.strInstructions || '', 5000),
      youtubeId: sanitizeIdentifier(recipe.youtubeId || null),
      servings: Math.max(1, Math.min(16, parseInt(recipe.servings, 10) || 4)),
      savedAt: Date.now()
    });
    isFav = true;
  }

  safeSet(STORAGE_KEYS.FAVORITES, favs);
  window.dispatchEvent(new CustomEvent('culinaria:favs-updated', { detail: { favorites: favs, recipeId, isFav } }));
  return isFav;
}

/* ==========================================================================
   Shopping List API
   ========================================================================== */
export function getShoppingList() {
  return safeGet(STORAGE_KEYS.SHOPPING_LIST, []);
}

export function addToShoppingList(items) {
  const currentList = getShoppingList();
  const itemsToAdd = Array.isArray(items) ? items : [items];

  itemsToAdd.forEach(newItem => {
    const rawName = typeof newItem === 'string' ? newItem : newItem.name;
    const rawMeasure = typeof newItem === 'string' ? '' : newItem.measure || '';
    const rawRecipeTitle = typeof newItem === 'string' ? 'Custom item' : newItem.recipeTitle || '';

    const name = sanitizeTextInput(rawName, 80);
    const measure = sanitizeTextInput(rawMeasure, 40);
    const recipeTitle = sanitizeTextInput(rawRecipeTitle, 80);

    if (!name) return;

    const existing = currentList.find(i => i.name.toLowerCase() === name.toLowerCase() && !i.checked);

    if (existing) {
      if (measure && !existing.measure.includes(measure)) {
        existing.measure = `${existing.measure} + ${measure}`.trim();
      }
    } else {
      currentList.push({
        id: 'shop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name,
        measure,
        recipeTitle,
        checked: false,
        addedAt: Date.now()
      });
    }
  });

  safeSet(STORAGE_KEYS.SHOPPING_LIST, currentList);
  window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { shoppingList: currentList } }));
}

export function toggleShoppingItem(itemId) {
  const cleanId = sanitizeTextInput(itemId, 50);
  const list = getShoppingList();
  const item = list.find(i => i.id === cleanId);
  if (item) {
    item.checked = !item.checked;
    safeSet(STORAGE_KEYS.SHOPPING_LIST, list);
    window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { shoppingList: list } }));
  }
}

export function removeShoppingItem(itemId) {
  const cleanId = sanitizeTextInput(itemId, 50);
  let list = getShoppingList();
  list = list.filter(i => i.id !== cleanId);
  safeSet(STORAGE_KEYS.SHOPPING_LIST, list);
  window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { shoppingList: list } }));
}

export function clearShoppingList() {
  safeSet(STORAGE_KEYS.SHOPPING_LIST, []);
  window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { shoppingList: [] } }));
}

/* ==========================================================================
   Pantry Basket Persistence
   ========================================================================== */
export function getStoredPantryBasket() {
  return safeGet(STORAGE_KEYS.PANTRY_BASKET, ['chicken', 'garlic', 'tomatoes', 'pasta']);
}

export function setStoredPantryBasket(basket) {
  if (Array.isArray(basket)) {
    const cleanBasket = basket.map(item => sanitizeTextInput(item, 50)).filter(Boolean);
    safeSet(STORAGE_KEYS.PANTRY_BASKET, cleanBasket);
  }
}

export const getPantryBasket = getStoredPantryBasket;
export const savePantryBasket = setStoredPantryBasket;

/* ==========================================================================
   Theme Preference
   ========================================================================== */
export function getStoredTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  return theme === 'dark' ? 'dark' : 'light';
}

export function setStoredTheme(theme) {
  const cleanTheme = theme === 'dark' ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEYS.THEME, cleanTheme);
}
