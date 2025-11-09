import express from "express";
import usersController from "../controllers/users.js";

const router = express.Router();

// GET /users/:id
router.get("/:id", usersController.getUserInfo);

// PUT /users/username
router.put("/username", usersController.changeUsername);

// GET /users/:id/recipes
router.get("/:id/recipes", usersController.getUserRecipes);

// GET /users/:id/saved
router.get("/:id/saved", usersController.getSavedRecipes);

// GET /users/:id/comments
router.get("/:id/comments", usersController.getUserComments);

export default router;
