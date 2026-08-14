# 🍲 Culinaria — World-Class Recipe Finder & Michelin Cooking Studio

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MdSaifulIslamMSI/culinaria-recipe-vault)

A premier, editorial-grade recipe discovery engine and interactive kitchen studio powered by the open-source **TheMealDB API**.

---

## 🌟 Live Demo
* **Live Website**: [https://mdsaifulislammsi.github.io/culinaria-recipe-vault/](https://mdsaifulislammsi.github.io/culinaria-recipe-vault/)

---

## 🚀 1-Click Deploy to Render

Click the button below to deploy this application to your Render account in one click:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MdSaifulIslamMSI/culinaria-recipe-vault)

---

## ✨ Features
* **🍷 Master Sommelier & Beverage Pairing Engine**: Curated wine, cocktail, and flavor profile pairings for every dish.
* **🔊 Hands-Free Voice Cooking Assistant**: Built-in voice narration that reads out each step using the Web Speech Synthesis API.
* **⚖️ Dynamic Portion Scaler & Unit Converter**: Real-time fractional scaling (1 to 16 servings) and Metric $\leftrightarrow$ US Imperial conversion.
* **🥕 Zero-Waste Pantry Matcher**: Match recipes against what's currently in your fridge.
* **⏱️ Floating Kitchen Timers & Grocery Cart**: Auto-detects durations in steps with synthesized Web Audio chimes and offline shopping list.

---

## 🛠️ Tech Stack
* **Vite** (Blazing fast build system)
* **Vanilla JavaScript & CSS Design System** (Custom tokens, typography, dark mode)
* **TheMealDB REST API** (Open-source recipe database)
* **Canvas Confetti & Web Audio API** (Tactile feedback and notifications)

## Verification and storage model

The release gate runs `npm test`, `npm run build`, and `npm audit --audit-level=high`.
Successful pushes to `master` publish the verified `dist/` artifact to the configured
GitHub Pages `gh-pages` branch and write `release.json` with the source commit.

Favorites, pantry items, preferences, and shopping items are sanitized client-local
data. They are not an encrypted secret store and should not contain passwords, tokens,
health information, or other sensitive data.
