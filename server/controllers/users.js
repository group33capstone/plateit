import { pool } from "../config/database.js";

// Ensures the user is logged in
const checkAuth = (req, res) => {
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: "Unauthorized: Must be logged in." });
    return false;
  }
  return true;
};

// Checks if the logged-in user matches the requested user ID for private data access
const checkAuthorization = (req, res, requestedUserId) => {
  if (!checkAuth(req, res)) return false;

  // Compare logged-in user's ID with requested ID from params
  if (req.user.id !== parseInt(requestedUserId)) {
    res
      .status(403)
      .json({ error: "Forbidden: You can only view your own private items." });
    return false;
  }
  return true;
};

// GET /users/:id
const getUserInfo = async (req, res) => {
  try {
    const userId = req.params.id;

    // Select only non-sensitive public columns
    const result = await pool.query(
      "SELECT id, username, avatarurl FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(200).json({ user: result.rows[0] });
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /users/username
const changeUsername = async (req, res) => {
  if (!checkAuth(req, res)) return;

  const loggedInUserId = req.user.id;
  const newUsername = req.body.username;

  if (
    !newUsername ||
    typeof newUsername !== "string" ||
    newUsername.trim().length === 0
  ) {
    return res.status(400).json({ error: "New username must be provided." });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username",
      [newUsername.trim(), loggedInUserId]
    );

    res.status(200).json({
      message: "Username updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating username:", error);
    // Check for PostgreSQL unique violation error code
    if (error.code === "23505") {
      return res.status(409).json({ error: "Username already taken." });
    }
    res.status(500).json({ error: error.message });
  }
};

// GET /users/:id/recipes
const getUserRecipes = async (req, res) => {
  try {
    const userId = req.params.id;

    // Select recipes created by this user ID
    const result = await pool.query(
      `SELECT id, title, description, servings, image_url, created_at
       FROM recipes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching recipes for user ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// GET /users/:id/saved
const getSavedRecipes = async (req, res) => {
  const userId = req.params.id;

  if (!checkAuthorization(req, res, userId)) return;

  try {
    // Join saved_recipes with recipes to get details of saved items.
    const result = await pool.query(
      `SELECT r.id, r.title, r.description, r.image_url, r.created_at
       FROM recipes r
       JOIN saved_recipes sr ON r.id = sr.recipe_id
       WHERE sr.user_id = $1
       ORDER BY sr.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching saved recipes for user ${userId}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// GET /users/:id/comments
const getUserComments = async (req, res) => {
  const userId = req.params.id;

  if (!checkAuthorization(req, res, userId)) return;

  try {
    // Select comments and the title/id of the recipe they belong to.
    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at, r.title AS recipe_title, r.id AS recipe_id
       FROM comments c
       JOIN recipes r ON c.recipe_id = r.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching comments for user ${userId}:`, error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getUserInfo,
  changeUsername,
  getUserRecipes,
  getSavedRecipes,
  getUserComments,
};
