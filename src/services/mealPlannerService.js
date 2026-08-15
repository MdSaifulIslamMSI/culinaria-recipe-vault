/**
 * Weekly Meal Planner Service
 * Manages 7-day gourmet meal planning with persistent storage & automated grocery aggregation
 */
import { safeGet, safeSet, addToShoppingList } from './storageService.js';

const PLANNER_STORAGE_KEY = 'culinaria_meal_planner_v1';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['lunch', 'dinner'];

function createEmptyPlan() {
  const plan = {};
  DAYS.forEach(day => {
    plan[day] = {
      lunch: null,
      dinner: null
    };
  });
  return plan;
}

class MealPlannerService {
  constructor() {
    this.days = DAYS;
    this.slots = SLOTS;
  }

  getPlan() {
    const raw = safeGet(PLANNER_STORAGE_KEY, null);
    if (!raw || typeof raw !== 'object') {
      return createEmptyPlan();
    }
    
    // Ensure all days exist
    const plan = createEmptyPlan();
    DAYS.forEach(day => {
      if (raw[day]) {
        plan[day] = {
          lunch: raw[day].lunch || null,
          dinner: raw[day].dinner || null
        };
      }
    });
    return plan;
  }

  savePlan(plan) {
    safeSet(PLANNER_STORAGE_KEY, plan);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('culinaria:meal-planner-updated', { detail: plan }));
    }
  }

  assignRecipe(day, slot, recipe) {
    if (!DAYS.includes(day) || !SLOTS.includes(slot) || !recipe) return;
    const plan = this.getPlan();
    plan[day][slot] = {
      id: recipe.id || recipe.idMeal,
      title: recipe.title || recipe.strMeal,
      thumbnail: recipe.thumbnail || recipe.strMealThumb,
      category: recipe.category || recipe.strCategory || 'Dish',
      area: recipe.area || recipe.strArea || '',
      ingredients: recipe.ingredients || []
    };
    this.savePlan(plan);
  }

  removeSlot(day, slot) {
    if (!DAYS.includes(day) || !SLOTS.includes(slot)) return;
    const plan = this.getPlan();
    plan[day][slot] = null;
    this.savePlan(plan);
  }

  clearWeek() {
    const plan = createEmptyPlan();
    this.savePlan(plan);
  }

  /**
   * Aggregates all ingredients across the entire week and transfers them to the shopping list
   */
  exportIngredientsToShoppingList() {
    const plan = this.getPlan();
    let addedCount = 0;

    DAYS.forEach(day => {
      SLOTS.forEach(slot => {
        const meal = plan[day][slot];
        if (meal && Array.isArray(meal.ingredients)) {
          meal.ingredients.forEach(ing => {
            if (ing && ing.name) {
              addToShoppingList(ing.name, ing.measure || '');
              addedCount++;
            }
          });
        }
      });
    });

    return addedCount;
  }

  getPlannedCount() {
    const plan = this.getPlan();
    let count = 0;
    DAYS.forEach(day => {
      SLOTS.forEach(slot => {
        if (plan[day][slot]) count++;
      });
    });
    return count;
  }
}

export const mealPlannerService = new MealPlannerService();
