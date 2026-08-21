/**
 * Dynamic Ingredient Scaler & Unit Converter
 * Accurately parses fractions, decimals, grams, cups, spoons and scales by servings ratio
 */

/**
 * Parses mixed numbers & fractions like "1 1/2", "1/4", "3", "0.5" into a numeric float
 */
function parseFraction(str) {
  if (!str) return null;
  str = str.trim();

  // Unicode vulgar fractions
  const unicodeFractions = {
    '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
    '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.167, '⅚': 0.833,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
  };

  for (const [char, val] of Object.entries(unicodeFractions)) {
    if (str.includes(char)) {
      const rest = str.replace(char, '').trim();
      const base = rest ? parseFloat(rest) : 0;
      return base + val;
    }
  }

  // Mixed fractions e.g. "1 1/2"
  if (/^\d+\s+\d+\/\d+$/.test(str)) {
    const parts = str.split(/\s+/);
    const whole = parseFloat(parts[0]);
    const [num, den] = parts[1].split('/').map(Number);
    return whole + (num / den);
  }

  // Simple fractions e.g. "3/4"
  if (/^\d+\/\d+$/.test(str)) {
    const [num, den] = str.split('/').map(Number);
    return den !== 0 ? num / den : 0;
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Formats a decimal back into a clean culinary fraction representation
 */
function formatFraction(num) {
  if (num <= 0) return '0';
  
  const whole = Math.floor(num);
  const remainder = num - whole;

  if (remainder < 0.08) return whole > 0 ? `${whole}` : '0';
  if (remainder >= 0.08 && remainder < 0.18) return whole > 0 ? `${whole} ⅛` : '⅛';
  if (remainder >= 0.18 && remainder < 0.29) return whole > 0 ? `${whole} ¼` : '¼';
  if (remainder >= 0.29 && remainder < 0.42) return whole > 0 ? `${whole} ⅓` : '⅓';
  if (remainder >= 0.42 && remainder < 0.58) return whole > 0 ? `${whole} ½` : '½';
  if (remainder >= 0.58 && remainder < 0.70) return whole > 0 ? `${whole} ⅔` : '⅔';
  if (remainder >= 0.70 && remainder < 0.83) return whole > 0 ? `${whole} ¾` : '¾';
  if (remainder >= 0.83 && remainder < 0.92) return whole > 0 ? `${whole} ⅞` : '⅞';
  
  return `${whole + 1}`;
}

/**
 * Scale a measurement string according to servings multiplier
 * @param {string} measureStr - e.g. "2 cups", "1 1/2 tsp", "500g", "To taste"
 * @param {number} ratio - targetServings / baseServings (e.g. 6/4 = 1.5)
 * @param {string} unitSystem - 'metric' or 'imperial'
 */
export function scaleMeasurement(measureStr, ratio = 1, unitSystem = 'metric') {
  if (!measureStr || typeof measureStr !== 'string') return '';
  const trimmed = measureStr.trim();
  if (['to taste', 'as needed', 'pinch', 'garnish', 'dash', 'to serve', 'optional'].some(term => trimmed.toLowerCase().includes(term))) {
    return trimmed;
  }

  // Regex pattern matching leading numeric part and trailing unit part
  const regex = /^([\d\s/.\u00BC-\u00BE\u2150-\u215E]+)(.*)$/;
  const match = trimmed.match(regex);

  if (!match) return trimmed;

  const numPart = match[1].trim();
  const unitPart = match[2].trim();

  const parsedVal = parseFraction(numPart);
  if (parsedVal === null) return trimmed;

  const scaledVal = parsedVal * ratio;

  // Handle unit conversions
  if (unitSystem === 'metric') {
    // Convert oz -> g (1 oz ≈ 28.35 g)
    if (/^oz\b|ounces?/i.test(unitPart)) {
      const grams = Math.round(scaledVal * 28.35);
      return `${grams} g`;
    }
    // Convert lbs -> g / kg
    if (/^lbs?\b|pounds?/i.test(unitPart)) {
      const grams = scaledVal * 453.592;
      return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${Math.round(grams)} g`;
    }
    // Convert cups -> ml (1 cup ≈ 240 ml) for liquids
    if (/^cups?/i.test(unitPart)) {
      const ml = Math.round(scaledVal * 240);
      return `${formatFraction(scaledVal)} cup${scaledVal > 1 ? 's' : ''} (${ml} ml)`;
    }
    // Convert tbsp -> ml (1 tbsp ≈ 15 ml)
    if (/^tbsp\b|tablespoons?/i.test(unitPart) && scaledVal >= 2) {
      const ml = Math.round(scaledVal * 15);
      return `${formatFraction(scaledVal)} tbsp (${ml} ml)`;
    }
  } else if (unitSystem === 'imperial') {
    // Convert g -> oz
    if (/^g\b|grams?/i.test(unitPart)) {
      const oz = (scaledVal / 28.35).toFixed(1);
      return `${oz} oz`;
    }
    // Convert kg -> lbs
    if (/^kg\b|kilograms?/i.test(unitPart)) {
      const lbs = (scaledVal * 2.20462).toFixed(1);
      return `${lbs} lbs`;
    }
    // Convert ml -> cups / fl oz
    if (/^ml\b|millilitres?|milliliters?/i.test(unitPart)) {
      const cups = scaledVal / 240;
      if (cups >= 0.25) {
        return `${formatFraction(cups)} cup${cups > 1 ? 's' : ''}`;
      }
      const flOz = (scaledVal / 29.5735).toFixed(1);
      return `${flOz} fl oz`;
    }
  }

  // Large whole numbers like "500 g"
  if (scaledVal >= 10 && Number.isInteger(Math.round(scaledVal))) {
    return `${Math.round(scaledVal)} ${unitPart}`.trim();
  }

  return `${formatFraction(scaledVal)} ${unitPart}`.trim();
}

