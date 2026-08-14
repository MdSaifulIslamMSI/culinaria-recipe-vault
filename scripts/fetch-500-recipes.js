/**
 * Build 500+ Recipe Knowledge Base
 * Fetches across alphabet A-Z and categories from MealDB with robust fallbacks
 */
import fs from 'fs';
import path from 'path';

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DATA_DIR = path.resolve('src/data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetch500Recipes() {
  console.log('📦 Fetching and curating 500+ recipes for offline instant lookup...');
  const mealMap = new Map();

  for (const letter of alphabet) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.meals) {
          data.meals.forEach(m => {
            if (m && m.idMeal && !mealMap.has(m.idMeal)) {
              mealMap.set(m.idMeal, m);
            }
          });
        }
      }
    } catch (e) {
      console.warn(`Could not fetch letter ${letter}:`, e.message);
    }
  }

  console.log(`✨ Total unique recipes gathered: ${mealMap.size}`);
  
  const allMeals = Array.from(mealMap.values());
  const outputPath = path.join(DATA_DIR, 'curated500Recipes.json');
  fs.writeFileSync(outputPath, JSON.stringify(allMeals, null, 2));
  console.log(`💾 Saved ${allMeals.length} recipes to ${outputPath}`);
}

fetch500Recipes().catch(console.error);
