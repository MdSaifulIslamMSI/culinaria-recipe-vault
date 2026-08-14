/**
 * Sommelier & Culinary Flavor Pairing Service
 * Generates wine pairings, beverage recommendations, taste profiles & chef techniques
 */

const PAIRING_DATABASE = {
  Beef: {
    wine: "Full-Bodied Cabernet Sauvignon or Barolo",
    wineNote: "Bold tannins cut through rich savory fats with notes of black cherry and cedar.",
    beverage: "Smoked Old Fashioned or Sparkling San Pellegrino with Rosemary",
    flavorProfile: ["Rich & Savory", "Deep Umami", "Caramelized", "Hearty"],
    chefTip: "Sear over screaming high cast iron to form a deeply browned Maillard crust before braising or resting."
  },
  Chicken: {
    wine: "Oaked Chardonnay or Light Pinot Noir",
    wineNote: "Creamy vanilla and stone fruit notes complement delicate poultry seasonings.",
    beverage: "Yuzu Sparkling Soda or Ginger Lemongrass Cooler",
    flavorProfile: ["Golden Herbaceous", "Tender & Juicy", "Zesty", "Comforting"],
    chefTip: "Always pat the poultry completely dry with paper towels before cooking to achieve maximum crispness."
  },
  Pasta: {
    wine: "Chianti Classico DOCG or Crisp Pinot Grigio",
    wineNote: "Bright acidity balances rich tomato marinara and velvety cheeses seamlessly.",
    beverage: "Italian Aperol Spritz or Fresh Basil Lemonade",
    flavorProfile: ["Velvety & Al Dente", "Garlic Herb", "Creamy Rich", "Sun-Ripened Tomato"],
    chefTip: "Emulsify pasta water with parmesan and butter in the last 2 minutes off the heat for a glossy sauce."
  },
  Seafood: {
    wine: "Crisp Sauvignon Blanc or Champagne Brut",
    wineNote: "High mineral acidity and citrus notes enhance the delicate sweetness of ocean fare.",
    beverage: "Cucumber Mint Gin & Tonic or Cold Brew Sparkling Jasmine Tea",
    flavorProfile: ["Delicate & Oceanic", "Citrus Herb", "Light & Crisp", "Buttery"],
    chefTip: "Baste continuously with foaming melted butter, fresh crushed garlic, and herbs during the final minute."
  },
  Dessert: {
    wine: "Tawny Port or Late Harvest Riesling",
    wineNote: "Honeyed floral notes and luscious raisin undertones accentuate cocoa and vanilla.",
    beverage: "Espresso Martini or Madagascar Spiced Hot Cocoa",
    flavorProfile: ["Molten Cocoa", "Silky & Indulgent", "Caramelized", "Velvety"],
    chefTip: "A tiny pinch of flaky Maldon sea salt elevates chocolate and caramel flavors by ten-fold."
  },
  Vegetarian: {
    wine: "Dry Provençal Rosé or Gruner Veltliner",
    wineNote: "Fresh botanical aromas and crisp white pepper highlight garden-fresh produce.",
    beverage: "Hibiscus Mint Mocktail or Herbal Kombucha",
    flavorProfile: ["Vibrant Garden", "Earthy Herb", "Nutrient-Dense", "Crisp & Zesty"],
    chefTip: "Roast vegetables at high heat (425°F/220°C) without overcrowding to caramelize natural sugars."
  },
  Default: {
    wine: "Medium-Bodied Côtes du Rhône or Crisp Sparkling Prosecco",
    wineNote: "Versatile berry fruit and balanced acidity pairing wonderfully across global spice profiles.",
    beverage: "Craft Botanical Soda or Iced Hibiscus Tea",
    flavorProfile: ["Harmonious", "Spiced & Aromatic", "Balanced", "Mouthwatering"],
    chefTip: "Always taste and adjust seasoning at the very end with a squeeze of fresh acid (lemon/lime/vinegar)."
  }
};

export function getCulinaryPairing(recipe) {
  if (!recipe) return PAIRING_DATABASE.Default;

  const category = recipe.category || '';
  for (const key of Object.keys(PAIRING_DATABASE)) {
    if (key !== 'Default' && category.toLowerCase().includes(key.toLowerCase())) {
      return PAIRING_DATABASE[key];
    }
  }

  // Check recipe title
  const title = (recipe.title || '').toLowerCase();
  if (title.includes('beef') || title.includes('steak') || title.includes('taco')) return PAIRING_DATABASE.Beef;
  if (title.includes('chicken') || title.includes('curry')) return PAIRING_DATABASE.Chicken;
  if (title.includes('pasta') || title.includes('spaghetti') || title.includes('lasagna')) return PAIRING_DATABASE.Pasta;
  if (title.includes('salmon') || title.includes('fish') || title.includes('shrimp')) return PAIRING_DATABASE.Seafood;
  if (title.includes('cake') || title.includes('chocolate') || title.includes('pie')) return PAIRING_DATABASE.Dessert;

  return PAIRING_DATABASE.Default;
}
