/**
 * RecipeCard Component
 * Renders high-aesthetic recipe cards with interactive favorite button & details trigger
 */
import { isFavorite, toggleFavorite } from '../services/storageService.js';
import { sanitizeHtml, sanitizeUrl } from '../utils/securitySanitizer.js';

export function createRecipeCard(recipe, options = {}) {
  const isFav = isFavorite(recipe.id);
  const { pantryMatch = null } = options;

  const card = document.createElement('article');
  card.className = 'recipe-card';
  card.dataset.id = sanitizeHtml(recipe.id);

  const fallbackImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  const imgUrl = sanitizeUrl(recipe.thumbnail || '', fallbackImg);
  const safeTitle = sanitizeHtml(recipe.title);
  const safeCategory = sanitizeHtml(recipe.category || 'Dish');
  const safeArea = sanitizeHtml(recipe.area || '');

  card.innerHTML = `
    <div class="recipe-image-wrap">
      <img src="${imgUrl}" alt="${safeTitle}" class="recipe-image" loading="lazy" />
      <div class="card-badges-top">
        <span class="card-cat-badge">${safeCategory}</span>
        ${recipe.area && recipe.area !== 'Global' ? `<span class="card-area-badge">${safeArea}</span>` : ''}
      </div>
      <button class="btn-card-fav ${isFav ? 'is-favorite' : ''}" aria-label="Save to favorites" title="${isFav ? 'Remove from favorites' : 'Save recipe'}">
        ${isFav ? '❤️' : '🤍'}
      </button>
    </div>

    <div class="recipe-card-content">
      ${pantryMatch ? `
        <div class="pantry-match-badge">
          <span>✨</span>
          <span>${sanitizeHtml(pantryMatch.matchedCount)} of ${sanitizeHtml(pantryMatch.totalCount)} pantry items (${sanitizeHtml(pantryMatch.percent)}%)</span>
        </div>
      ` : ''}

      <h3 class="recipe-card-title" title="${safeTitle}">${safeTitle}</h3>

      <div class="recipe-card-meta">
        <span class="meta-item">
          <span>⏱️</span>
          <span>${sanitizeHtml(recipe.estimatedTime || 30)} mins</span>
        </span>
        <span class="meta-item">
          <span>🔥</span>
          <span>~${sanitizeHtml(recipe.calories || (recipe.estimatedTime ? recipe.estimatedTime * 14 : 450))} kcal</span>
        </span>
      </div>

      <div class="recipe-card-footer">
        <button class="card-view-btn" data-action="open-modal" data-id="${sanitizeHtml(recipe.id)}">
          <span>View Recipe & Cook</span>
          <span>→</span>
        </button>
      </div>
    </div>
  `;

  // Defensive image fallback handler
  const imgEl = card.querySelector('.recipe-image');
  if (imgEl) {
    imgEl.addEventListener('error', () => {
      imgEl.src = fallbackImg;
    }, { once: true });
  }

  // Favorite button handler
  const favBtn = card.querySelector('.btn-card-fav');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const updatedStatus = toggleFavorite(recipe);
    favBtn.classList.toggle('is-favorite', updatedStatus);
    favBtn.innerHTML = updatedStatus ? '❤️' : '🤍';
    favBtn.title = updatedStatus ? 'Remove from favorites' : 'Save recipe';
  });

  // Card click opens modal
  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn-card-fav')) return;
    window.dispatchEvent(new CustomEvent('culinaria:open-recipe', { detail: { recipeId: recipe.id } }));
  });

  return card;
}
