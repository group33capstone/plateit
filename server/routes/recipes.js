import express from "express";

import recipesController from "../controllers/recipes.js";

const router = express.Router();

// Route to get all recipes (API endpoint)
router.get("/", recipesController.getRecipes);

// Health check for router
router.get("/ping", (req, res) =>
  res.json({ ok: true, route: "/api/recipes/ping" })
);

// Route to create a new recipe from structured payload
router.post("/", recipesController.createRecipe);

// Route to get a specific recipe by ID (serves HTML)
router.get("/:recipeId", recipesController.getRecipeById);

// API endpoint to get recipe data by ID
router.get("/:recipeId/data", recipesController.getRecipeById);

export default router;
