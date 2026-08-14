/**
 * Storage Service
 * LocalStorage wrapper for persistent Favorites, Shopping List & User Preferences
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
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
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
   Favorites API
   ========================================================================== */
export function getFavorites() {
  return safeGet(STORAGE_KEYS.FAVORITES, []);
}

export function isFavorite(recipeId) {
  const favs = getFavorites();
  return favs.some(r => r.id === recipeId);
}

export function toggleFavorite(recipe) {
  if (!recipe || !recipe.id) return false;
  const favs = getFavorites();
  const index = favs.findIndex(r => r.id === recipe.id);
  let isFav = false;

  if (index >= 0) {
    favs.splice(index, 1);
    isFav = false;
  } else {
    // Save lightweight recipe snapshot
    favs.unshift({
      id: recipe.id,
      title: recipe.title,
      thumbnail: recipe.thumbnail,
      category: recipe.category,
      area: recipe.area,
      estimatedTime: recipe.estimatedTime || 30
    });
    isFav = true;
  }

  safeSet(STORAGE_KEYS.FAVORITES, favs);
  window.dispatchEvent(new CustomEvent('culinaria:favs-updated', { detail: { favorites: favs } }));
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

    // Check if duplicate already exists
    const existing = currentList.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
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
