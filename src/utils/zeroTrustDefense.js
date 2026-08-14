/**
 * Client-side data integrity and schema validation helpers.
 * Provides best-effort checks and strict schema assertions
 * without mutating global browser built-in prototypes or window properties.
 */

// ---------------------------------------------------------------------------
// 1. Best-effort Storage Corruption Guard
// ---------------------------------------------------------------------------
const INTEGRITY_SALT = 'culinaria_entropy_v1_' + (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

export function signData(data) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0x811c9dc5;
  const combined = serialized + INTEGRITY_SALT;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return {
    payload: data,
    sig: (hash >>> 0).toString(16),
    ts: Date.now()
  };
}

export function verifySignedData(envelope) {
  if (!envelope || typeof envelope !== 'object' || !envelope.sig || !envelope.payload) {
    return null;
  }
  const recalculated = signData(envelope.payload).sig;
  if (recalculated !== envelope.sig) {
    console.warn('[SECURITY] Storage integrity check: using safe fallback.');
    return null;
  }
  return envelope.payload;
}

// ---------------------------------------------------------------------------
// 2. Strict Client-Side Recipe Schema Validator
// ---------------------------------------------------------------------------
export function validateRecipeSchema(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;

  return {
    id: String(recipe.id || recipe.idMeal || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32),
    title: String(recipe.title || recipe.strMeal || 'Gourmet Dish').replace(/[<>&]/g, '').slice(0, 100),
    thumbnail: String(recipe.thumbnail || recipe.strMealThumb || '').startsWith('http') ? String(recipe.thumbnail || recipe.strMealThumb) : '',
    category: String(recipe.category || recipe.strCategory || 'Miscellaneous').replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 50),
    area: String(recipe.area || recipe.strArea || 'Global').replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 50),
    estimatedTime: Math.max(5, Math.min(360, parseInt(recipe.estimatedTime, 10) || 30)),
    servings: Math.max(1, Math.min(16, parseInt(recipe.servings, 10) || 4)),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 40) : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps.slice(0, 30) : [],
    instructions: String(recipe.instructions || recipe.strInstructions || '').slice(0, 10000),
    youtubeId: recipe.youtubeId ? String(recipe.youtubeId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) : null
  };
}
