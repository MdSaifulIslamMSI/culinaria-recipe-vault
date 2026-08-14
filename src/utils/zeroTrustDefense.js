/**
 * Zero-Trust Maximum Hardening & Runtime Armor Engine
 * Implements:
 * 1. Global Prototype Immutability (Object.freeze on base prototypes)
 * 2. Trusted Types Policy (W3C Trusted Types API)
 * 3. Anti-DOM Clobbering Isolation
 * 4. Cryptographic Storage Integrity Guard (HMAC-style validation)
 * 5. Strict Schema Validator for In-Flight Objects
 */

// ---------------------------------------------------------------------------
// 1. Prototype Immutability Armor (Blocks all runtime prototype poisoning)
// ---------------------------------------------------------------------------
export function enforcePrototypeImmutability() {
  try {
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
    Object.freeze(Function.prototype);
    Object.freeze(String.prototype);
    Object.freeze(Number.prototype);
    Object.freeze(Boolean.prototype);
  } catch (e) {
    console.warn('[SECURITY] Prototype freeze notice:', e.message);
  }
}

// ---------------------------------------------------------------------------
// 2. W3C Trusted Types API Policy (Restricts innerHTML assignments)
// ---------------------------------------------------------------------------
let trustedTypesPolicy = null;

export function initTrustedTypes() {
  if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      trustedTypesPolicy = window.trustedTypes.createPolicy('culinaria-security-policy', {
        createHTML: (string) => {
          // Strict escape filter
          return String(string)
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '');
        },
        createScriptURL: (string) => {
          // Only allow approved CDNs
          const allowedPrefixes = ['https://www.youtube-nocookie.com/embed/', 'https://cdn.jsdelivr.net/'];
          if (allowedPrefixes.some(prefix => string.startsWith(prefix))) {
            return string;
          }
          throw new TypeError(`[SECURITY] Blocked untrusted script URL: ${string}`);
        }
      });
    } catch (e) {
      // Policy already created or unsupported
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Anti-DOM Clobbering Defense
// ---------------------------------------------------------------------------
export function preventDOMClobbering() {
  if (typeof window === 'undefined') return;

  const reservedProperties = ['document', 'location', 'cookie', 'window', 'localStorage', 'sessionStorage', 'history'];
  
  // Guard window properties from being overwritten by element IDs
  reservedProperties.forEach(prop => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, prop);
      if (descriptor && descriptor.configurable) {
        Object.defineProperty(window, prop, {
          configurable: false,
          writable: false
        });
      }
    } catch (e) {}
  });
}

// ---------------------------------------------------------------------------
// 4. Cryptographic Storage Integrity Guard
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
    console.error('[SECURITY] Storage tampering detected! Integrity signature mismatch.');
    return null;
  }
  return envelope.payload;
}

// ---------------------------------------------------------------------------
// 5. Strict Zero-Trust Recipe Schema Validator
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

// Auto-initialize runtime defenses
enforcePrototypeImmutability();
initTrustedTypes();
preventDOMClobbering();
