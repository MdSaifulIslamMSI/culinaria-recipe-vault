import test from 'node:test';
import assert from 'node:assert/strict';

const localStore = new Map();
globalThis.localStorage = {
  getItem: key => localStore.has(key) ? localStore.get(key) : null,
  setItem: (key, value) => localStore.set(key, String(value)),
  removeItem: key => localStore.delete(key),
  clear: () => localStore.clear()
};

globalThis.fetch = async url => {
  if (String(url).includes('filter.php?c=Malicious')) {
    return {
      ok: true,
      json: async () => ({
        meals: [{
          idMeal: '<script>alert(1)</script>',
          strMeal: '<img src=x onerror=alert(1)>',
          strCategory: 'Chicken',
          strMealThumb: 'javascript:alert(1)'
        }]
      })
    };
  }

  throw new Error('offline test transport');
};

const api = await import('../src/services/mealDbApi.js');
const storage = await import('../src/services/storageService.js');
const { computeIntegrityHash } = await import('../src/utils/securitySanitizer.js');

test('ingredient matcher accepts direct ingredients and rejects compound false positives', () => {
  assert.equal(api.matchesIngredient('Eggs', 'egg'), true);
  assert.equal(api.matchesIngredient('free-range eggs, beaten', 'eggs'), true);
  assert.equal(api.matchesIngredient('Egg Roll Wrappers', 'egg'), false);
  assert.equal(api.matchesIngredient('Egg Plants', 'egg'), false);
  assert.equal(api.matchesIngredient('Eggplant', 'egg'), false);
});

test('offline pantry matching returns no unknown ingredients and real matches', async () => {
  assert.ok((await api.filterByIngredient('chicken')).length > 0);
  assert.equal((await api.filterByIngredient('unobtanium')).length, 0);
  assert.equal((await api.filterByIngredient('dragon_dust_999')).length, 0);
});

test('offline category, area, and intersection filters remain populated and null-safe', async () => {
  assert.ok((await api.filterByCategory('Chicken')).length > 0);
  assert.ok((await api.filterByArea('Indian')).length > 0);
  const intersection = await api.filterByCategoryAndArea('Chicken', 'Indian');
  assert.ok(intersection.length > 0);
  assert.ok(intersection.every(recipe => recipe.id && recipe.title));
});

test('network list data is sanitized before it reaches HTML templates', async () => {
  const [recipe] = await api.filterByCategory('Malicious');
  assert.equal(recipe.id, 'scriptalert1script');
  assert.equal(recipe.title, '&lt;img src&#61;x onerror&#61;alert(1)&gt;');
  assert.equal(recipe.thumbnail, '');
});

test('storage getters normalize hostile local data before rendering', () => {
  localStore.set('culinaria_favorites_v1', JSON.stringify([{
    id: 'fav-1',
    title: '<img src=x onerror=alert(1)>',
    thumbnail: 'javascript:alert(1)'
  }]));
  const [favorite] = storage.getFavorites();
  assert.equal(favorite.title, '&lt;img src&#61;x onerror&#61;alert(1)&gt;');
  assert.equal(favorite.thumbnail, '');

  localStore.set('culinaria_pantry_basket_v1', JSON.stringify(['<img src=x onerror=alert(1)>']));
  assert.equal(storage.getStoredPantryBasket()[0], '&lt;img src&#61;x onerror&#61;alert(1)&gt;');
});

test('storage checksum detects accidental mutation without pretending to authenticate an attacker', () => {
  const original = [{ id: '1', title: 'Original' }];
  const tampered = [{ id: '1', title: 'Tampered' }];
  localStore.set('checksum-test', JSON.stringify({
    _v: 2,
    _sig: computeIntegrityHash(original),
    _data: tampered
  }));
  assert.deepEqual(storage.safeGet('checksum-test', []), []);
});
