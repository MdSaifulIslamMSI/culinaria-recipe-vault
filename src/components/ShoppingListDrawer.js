/**
 * ShoppingListDrawer Component
 * Slide-over grocery list manager with persistence, checkbox strikethrough & clipboard copy
 */
import {
  getShoppingList,
  toggleShoppingItem,
  removeShoppingItem,
  clearShoppingList,
  addToShoppingList
} from '../services/storageService.js';
import { sanitizeClipboardText } from '../utils/securitySanitizer.js';
import {
  registerOverlay,
  setOverlayState,
  acquireScrollLock,
  releaseScrollLock
} from '../utils/overlayManager.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class ShoppingListDrawer {
  constructor() {
    this.drawer = document.getElementById('shoppingDrawer');
    this.overlay = document.getElementById('shoppingDrawerOverlay');
    this.triggerBtn = document.getElementById('btnShoppingList');
    this.closeBtn = document.getElementById('btnCloseShoppingDrawer');
    this.itemsContainer = document.getElementById('shoppingListItems');
    this.itemCountBadge = document.getElementById('cartCountBadge');
    this.itemCountText = document.getElementById('shoppingItemCount');
    this.manualInput = document.getElementById('manualGroceryInput');
    this.btnAddManual = document.getElementById('btnAddManualGrocery');
    this.btnCopy = document.getElementById('btnCopyShoppingList');
    this.btnClear = document.getElementById('btnClearShoppingList');

    this.setOpenState(false);
    this.init();
  }

  setOpenState(isOpen) {
    setOverlayState([this.drawer, this.overlay], isOpen);
  }

  init() {
    this.updateUI();

    // Drawer Open/Close
    this.triggerBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    // Manual input add
    this.btnAddManual.addEventListener('click', () => this.addManualItem());
    this.manualInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addManualItem();
      }
    });

    // Copy to clipboard
    this.btnCopy.addEventListener('click', () => this.copyToClipboard());

    // Clear all
    this.btnClear.addEventListener('click', () => {
      clearShoppingList();
      window.dispatchEvent(new CustomEvent('culinaria:toast', { detail: { message: '🗑️ Cleared grocery list' } }));
    });

    // Keyboard controls (Escape/Tab handled centrally by overlayManager)
    registerOverlay({
      name: 'shopping-list-drawer',
      getContainer: () => this.drawer,
      isOpen: () => this.drawer?.classList.contains('open') ?? false,
      close: () => this.close()
    });

    // Global cart updated event listener
    window.addEventListener('culinaria:cart-updated', () => {
      this.updateUI();
    });
  }

  open() {
    this.previousActiveElement = document.activeElement;
    this.setOpenState(true);
    this.drawer.classList.add('open');
    this.overlay.classList.add('open');
    acquireScrollLock();
    setTimeout(() => this.manualInput.focus(), 50);
  }

  close() {
    this.setOpenState(false);
    this.drawer.classList.remove('open');
    this.overlay.classList.remove('open');
    releaseScrollLock();
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  addManualItem() {
    const val = this.manualInput.value.trim();
    if (val) {
      addToShoppingList({ name: val, measure: '', recipeTitle: 'Personal' });
      this.manualInput.value = '';
    }
  }

  updateUI() {
    const list = getShoppingList();
    const count = list.length;
    const uncheckedCount = list.filter(i => !i.checked).length;

    this.itemCountBadge.textContent = uncheckedCount;
    this.itemCountText.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    if (count === 0) {
      this.itemsContainer.innerHTML = `
        <div class="empty-drawer">
          <div class="empty-cart-icon">🛒</div>
          <p>Your grocery list is empty.</p>
          <small>Add missing ingredients from any recipe with one click!</small>
        </div>
      `;
      return;
    }

    this.itemsContainer.innerHTML = list.map(item => `
      <div class="shopping-item-row ${item.checked ? 'checked' : ''}" data-id="${item.id}">
        <label class="shopping-item-left">
          <input type="checkbox" ${item.checked ? 'checked' : ''} class="shop-check" />
          <span class="shopping-item-name">${item.measure ? `<b>${escapeHtml(item.measure)}</b> ` : ''}${escapeHtml(item.name)}</span>
        </label>
        <button class="btn-remove-shopping" title="Remove" aria-label="Remove item">✕</button>
      </div>
    `).join('');

    // Attach listeners to row checkboxes & remove buttons
    this.itemsContainer.querySelectorAll('.shopping-item-row').forEach(row => {
      const id = row.dataset.id;
      const cb = row.querySelector('.shop-check');
      const del = row.querySelector('.btn-remove-shopping');

      cb.addEventListener('change', () => toggleShoppingItem(id));
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        removeShoppingItem(id);
      });
    });
  }

  copyToClipboard() {
    const list = getShoppingList();
    if (list.length === 0) {
      window.dispatchEvent(new CustomEvent('culinaria:toast', { detail: { message: 'Shopping list is empty!' } }));
      return;
    }

    const lines = list.map(item => {
      const checkbox = item.checked ? '[x]' : '[ ]';
      const measure = item.measure ? `${item.measure} ` : '';
      return `${checkbox} ${measure}${item.name}`;
    });
    const rawText = `🛒 Culinaria Grocery List:\n\n${lines.join('\n')}`;
    const safeText = sanitizeClipboardText(rawText);
    navigator.clipboard.writeText(safeText).then(() => {
      window.dispatchEvent(new CustomEvent('culinaria:toast', { detail: { message: '📋 Grocery list copied to clipboard!' } }));
    }).catch(err => {
      console.error(err);
    });
  }
}
