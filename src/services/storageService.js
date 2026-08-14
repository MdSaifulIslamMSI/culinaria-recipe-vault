/**
 * Storage Service
 * LocalStorage wrapper for persistent Favorites (Cookbook), Shopping List & User Preferences
 */

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
    return parsed;
  } catch (e) {
    console.warn(`Error parsing ${key} from localStorage, resetting to fallback:`, e);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
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
  const recipeId = String(recipe.id || recipe.idMeal || '');
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
      title: recipe.title || recipe.strMeal || 'Gourmet Creation',
      thumbnail: recipe.thumbnail || recipe.strMealThumb || '',
      category: recipe.category || recipe.strCategory || 'Miscellaneous',
      area: recipe.area || recipe.strArea || 'Global',
      estimatedTime: recipe.estimatedTime || 30,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      instructions: recipe.instructions || recipe.strInstructions || '',
      youtubeId: recipe.youtubeId || null,
      servings: recipe.servings || 4,
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
    const name = typeof newItem === 'string' ? newItem : newItem.name;
    const measure = typeof newItem === 'string' ? '' : newItem.measure || '';
    const recipeTitle = typeof newItem === 'string' ? 'Custom item' : newItem.recipeTitle || '';

    if (!name || !name.trim()) return;

    // Check if duplicate already exists
    const existingIndex = currentList.findIndex(i => i.name.toLowerCase() === name.trim().toLowerCase());
    if (existingIndex >= 0) {
      if (measure) {
        currentList[existingIndex].measure = measure.trim();
      }
    } else {
      currentList.push({
        id: `shop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: name.trim(),
        measure: measure.trim(),
        recipeTitle,
        checked: false,
        addedAt: Date.now()
      });
    }
  });

  safeSet(STORAGE_KEYS.SHOPPING_LIST, currentList);
  window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { list: currentList } }));
  return currentList;
}

export function toggleShoppingItem(itemId) {
  const currentList = getShoppingList();
  const item = currentList.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    safeSet(STORAGE_KEYS.SHOPPING_LIST, currentList);
    window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { list: currentList } }));
  }
}

export function removeShoppingItem(itemId) {
  const currentList = getShoppingList().filter(i => i.id !== itemId);
  safeSet(STORAGE_KEYS.SHOPPING_LIST, currentList);
  window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { list: currentList } }));
  return currentList;
}

export function clearShoppingList() {
  safeSet(STORAGE_KEYS.SHOPPING_LIST, []);
  window.dispatchEvent(new CustomEvent('culinaria:cart-updated', { detail: { list: [] } }));
}

/* ==========================================================================
   Pantry Basket Persistence
   ========================================================================== */
export function getPantryBasket() {
  return safeGet(STORAGE_KEYS.PANTRY_BASKET, ['Chicken', 'Garlic', 'Tomato']);
}

export function savePantryBasket(items) {
  safeSet(STORAGE_KEYS.PANTRY_BASKET, items);
}

/* ==========================================================================
   Theme Preference
   ========================================================================== */
export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch {
    return 'light';
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (e) {
    console.error(e);
  }
}
