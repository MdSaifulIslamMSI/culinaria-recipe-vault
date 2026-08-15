/**
 * MealPlannerDrawer Component
 * 7-Day interactive gourmet meal planner with grocery aggregation
 */
import { mealPlannerService } from '../services/mealPlannerService.js';
import { sanitizeHtml } from '../utils/securitySanitizer.js';

export class MealPlannerDrawer {
  constructor() {
    this.drawerEl = null;
    this.overlayEl = null;
    this.isOpen = false;
    this.previousActiveElement = null;
    this.init();
  }

  init() {
    // Create drawer DOM if not existing
    let existing = document.getElementById('mealPlannerDrawer');
    if (!existing) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.id = 'mealPlannerOverlay';
      this.overlayEl.className = 'drawer-overlay';
      document.body.appendChild(this.overlayEl);

      this.drawerEl = document.createElement('aside');
      this.drawerEl.id = 'mealPlannerDrawer';
      this.drawerEl.className = 'side-drawer meal-planner-drawer';
      this.drawerEl.setAttribute('role', 'dialog');
      this.drawerEl.setAttribute('aria-modal', 'true');
      this.drawerEl.setAttribute('aria-label', 'Weekly Meal Planner');
      document.body.appendChild(this.drawerEl);
    } else {
      this.drawerEl = existing;
      this.overlayEl = document.getElementById('mealPlannerOverlay');
    }

    this.setOpenState(false);

    this.overlayEl.addEventListener('click', () => this.close());
    
    // Listen for custom trigger to open or plan a recipe
    window.addEventListener('culinaria:open-meal-planner', () => this.open());
    window.addEventListener('culinaria:plan-recipe', (e) => {
      const { day, slot, recipe } = e.detail || {};
      if (day && slot && recipe) {
        mealPlannerService.assignRecipe(day, slot, recipe);
        this.open();
      }
    });

    window.addEventListener('culinaria:meal-planner-updated', () => {
      if (this.isOpen) this.render();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  setOpenState(isOpen) {
    [this.drawerEl, this.overlayEl].forEach((element) => {
      if (!element) return;
      element.setAttribute('aria-hidden', String(!isOpen));
      element.inert = !isOpen;
    });
  }

  open() {
    this.previousActiveElement = document.activeElement;
    this.isOpen = true;
    this.render();
    this.setOpenState(true);
    this.drawerEl.classList.add('open');
    this.overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus close button
    const closeBtn = this.drawerEl.querySelector('#btnClosePlannerDrawer');
    if (closeBtn) closeBtn.focus();
  }

  close() {
    this.isOpen = false;
    this.setOpenState(false);
    this.drawerEl.classList.remove('open');
    this.overlayEl.classList.remove('open');
    document.body.style.overflow = '';

    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  render() {
    const plan = mealPlannerService.getPlan();
    const plannedCount = mealPlannerService.getPlannedCount();

    this.drawerEl.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title-wrap">
          <span class="drawer-icon">📅</span>
          <div class="drawer-title-sub">
            <h2 class="drawer-title" id="plannerTitle">Weekly Meal Planner</h2>
            <span class="drawer-subtitle">${plannedCount} ${plannedCount === 1 ? 'Meal' : 'Meals'} Scheduled this Week</span>
          </div>
        </div>
        <button class="drawer-close-btn" id="btnClosePlannerDrawer" aria-label="Close meal planner">✕</button>
      </div>

      <div class="planner-actions-bar">
        <button class="primary-btn btn-export-planner" id="btnExportPlannerGrocery">
          <span>🛒 Add All to Grocery List</span>
        </button>
        <button class="secondary-btn btn-clear-planner" id="btnClearPlanner">
          <span>Clear Week</span>
        </button>
      </div>

      <div class="drawer-body planner-days-list">
        ${mealPlannerService.days.map(day => {
          const lunch = plan[day].lunch;
          const dinner = plan[day].dinner;

          return `
            <div class="planner-day-card" data-day="${day}">
              <div class="planner-day-header">
                <span class="planner-day-name">${day}</span>
              </div>

              <div class="planner-slots-grid">
                <!-- Lunch Slot -->
                <div class="planner-slot ${lunch ? 'slot-filled' : 'slot-empty'}">
                  <div class="slot-type-tag">☀️ Lunch</div>
                  ${lunch ? `
                    <div class="slot-recipe-card">
                      <img src="${lunch.thumbnail || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" alt="${sanitizeHtml(lunch.title)}" class="slot-recipe-img" />
                      <div class="slot-recipe-info">
                        <h4 class="slot-recipe-title" title="${sanitizeHtml(lunch.title)}">${sanitizeHtml(lunch.title)}</h4>
                        <span class="slot-recipe-cat">${sanitizeHtml(lunch.category)}</span>
                      </div>
                      <div class="slot-recipe-btns">
                        <button class="slot-btn-view" data-action="view-recipe" data-id="${lunch.id}" title="View Recipe">👁️</button>
                        <button class="slot-btn-remove" data-action="remove-slot" data-day="${day}" data-slot="lunch" title="Remove">✕</button>
                      </div>
                    </div>
                  ` : `
                    <div class="slot-placeholder">
                      <span class="slot-empty-text">No dish planned</span>
                    </div>
                  `}
                </div>

                <!-- Dinner Slot -->
                <div class="planner-slot ${dinner ? 'slot-filled' : 'slot-empty'}">
                  <div class="slot-type-tag">🌙 Dinner</div>
                  ${dinner ? `
                    <div class="slot-recipe-card">
                      <img src="${dinner.thumbnail || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" alt="${sanitizeHtml(dinner.title)}" class="slot-recipe-img" />
                      <div class="slot-recipe-info">
                        <h4 class="slot-recipe-title" title="${sanitizeHtml(dinner.title)}">${sanitizeHtml(dinner.title)}</h4>
                        <span class="slot-recipe-cat">${sanitizeHtml(dinner.category)}</span>
                      </div>
                      <div class="slot-recipe-btns">
                        <button class="slot-btn-view" data-action="view-recipe" data-id="${dinner.id}" title="View Recipe">👁️</button>
                        <button class="slot-btn-remove" data-action="remove-slot" data-day="${day}" data-slot="dinner" title="Remove">✕</button>
                      </div>
                    </div>
                  ` : `
                    <div class="slot-placeholder">
                      <span class="slot-empty-text">No dish planned</span>
                    </div>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const closeBtn = this.drawerEl.querySelector('#btnClosePlannerDrawer');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Export ingredients to grocery list
    const exportBtn = this.drawerEl.querySelector('#btnExportPlannerGrocery');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const added = mealPlannerService.exportIngredientsToShoppingList();
        if (added > 0) {
          window.dispatchEvent(new CustomEvent('culinaria:toast', {
            detail: { message: `🛒 Added ${added} ingredients to your grocery list!` }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('culinaria:toast', {
            detail: { message: `No meals scheduled to export.` }
          }));
        }
      });
    }

    // Clear Week
    const clearBtn = this.drawerEl.querySelector('#btnClearPlanner');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        mealPlannerService.clearWeek();
        this.render();
      });
    }

    // View Recipe Buttons
    this.drawerEl.querySelectorAll('[data-action="view-recipe"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.dispatchEvent(new CustomEvent('culinaria:open-recipe', { detail: { recipeId: id } }));
      });
    });

    // Remove Slot Buttons
    this.drawerEl.querySelectorAll('[data-action="remove-slot"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = btn.dataset.day;
        const slot = btn.dataset.slot;
        mealPlannerService.removeSlot(day, slot);
        this.render();
      });
    });
  }
}

export const mealPlannerDrawer = new MealPlannerDrawer();
