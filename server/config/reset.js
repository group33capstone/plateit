// reset.js only works for hard coded data from config/data/*.js
// It creates all tables from scratch and seeds them with data if present

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", "..", ".env");
const d = await import("dotenv");
const dotenvImpl = d?.default || d;
if (dotenvImpl && typeof dotenvImpl.config === "function") {
  dotenvImpl.config({ path: envPath });
}

const dbMod = await import("./database.js");
const { pool } = dbMod;

const createAllTables = async () => {
  const createTablesQuery = `
-- drop in dependency order
DROP TABLE IF EXISTS recipe_steps CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS saved_recipes CASCADE;
DROP TABLE IF EXISTS recipe_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  githubid TEXT NOT NULL UNIQUE,
  avatarurl TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- recipes
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  servings INTEGER NOT NULL,
  prep_time INTEGER NOT NULL,
  cook_time INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- recipe_ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC,
  unit TEXT,
  preparation TEXT,
  "order" INTEGER
);

-- tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- recipe_tags
CREATE TABLE IF NOT EXISTS recipe_tags (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE
);

-- saved_recipes
CREATE TABLE IF NOT EXISTS saved_recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- likes
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- comments
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- recipe_steps
CREATE TABLE IF NOT EXISTS recipe_steps (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

  try {
    await pool.query(createTablesQuery);
    console.log("🎉 All tables created successfully");
  } catch (err) {
    console.error("⚠️ error creating tables", err);
    throw err;
  }
};

const seedRecipesTable = async (recipes = []) => {
  if (!recipes || recipes.length === 0) {
    console.log("⏭️ No recipes data to seed.");
    return;
  }

  try {
    for (const recipe of recipes) {
      const text = `INSERT INTO recipes (user_id, title, description, servings, prep_time, cook_time, image_url, created_at, updated_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8, NOW()), COALESCE($9, NOW()))`;
      const values = [
        recipe.user_id || null,
        recipe.title,
        recipe.description,
        recipe.servings ?? 1,
        recipe.prep_time ?? 0,
        recipe.cook_time ?? 0,
        recipe.image_url || null,
        recipe.created_at || null,
        recipe.updated_at || null,
      ];
      await pool.query(text, values);
      console.log(`✅ ${recipe.title} added successfully`);
    }
  } catch (error) {
    console.error("⚠️ error inserting recipes", error);
    throw error;
  }
};

const seedUsersTable = async (users = []) => {
  if (!users || users.length === 0) {
    console.log("⏭️ No users data to seed.");
    return;
  }
  try {
    for (const u of users) {
      const text = `
        INSERT INTO users (githubid, username, email, avatarurl, created_at, updated_at)
        VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), COALESCE($6, NOW()))
      `;

      const values = [
        u.githubid,
        u.username,
        u.email,
        u.avatarurl,
        u.created_at || null,
        u.updated_at || null,
      ];

      await pool.query(text, values);
      console.log(`✅ user ${u.username} added (githubid: ${u.githubid})`);
    }
  } catch (error) {
    console.error("⚠️ error inserting users", error);
    throw error;
  }
};

const seedIngredientsTable = async (ingredients = []) => {
  if (!ingredients || ingredients.length === 0) {
    console.log("⏭️ No ingredients data to seed.");
    return;
  }
  try {
    for (const ing of ingredients) {
      const text = `INSERT INTO ingredients (name, created_at, updated_at) VALUES ($1, COALESCE($2, NOW()), COALESCE($3, NOW())) ON CONFLICT (name) DO NOTHING`;
      const values = [ing.name, ing.created_at || null, ing.updated_at || null];
      await pool.query(text, values);
    }
    console.log("✅ ingredients seeded");
  } catch (error) {
    console.error("⚠️ error inserting ingredients", error);
    throw error;
  }
};

const seedRecipeIngredientsTable = async (ri = []) => {
  if (!ri || ri.length === 0) {
    console.log("⏭️ No recipe_ingredients data to seed.");
    return;
  }
  try {
    for (const r of ri) {
      const text = `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, preparation, "order") VALUES ($1,$2,$3,$4,$5,$6)`;
      const values = [
        r.recipe_id,
        r.ingredient_id,
        r.quantity ?? null,
        r.unit || null,
        r.preparation || null,
        r.order ?? null,
      ];
      await pool.query(text, values);
    }
    console.log("✅ recipe_ingredients seeded");
  } catch (error) {
    console.error("⚠️ error inserting recipe_ingredients", error);
    throw error;
  }
};

const seedTagsTable = async (tags = []) => {
  if (!tags || tags.length === 0) {
    console.log("⏭️ No tags data to seed.");
    return;
  }
  try {
    for (const t of tags) {
      const text = `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`;
      await pool.query(text, [t.name]);
    }
    console.log("✅ tags seeded");
  } catch (error) {
    console.error("⚠️ error inserting tags", error);
    throw error;
  }
};

const seedRecipeTagsTable = async (rTags = []) => {
  if (!rTags || rTags.length === 0) {
    console.log("⏭️ No recipe_tags data to seed.");
    return;
  }
  try {
    for (const rt of rTags) {
      const text = `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1,$2)`;
      await pool.query(text, [rt.recipe_id, rt.tag_id]);
    }
    console.log("✅ recipe_tags seeded");
  } catch (error) {
    console.error("⚠️ error inserting recipe_tags", error);
    throw error;
  }
};

const seedSavedRecipesTable = async (saved = []) => {
  if (!saved || saved.length === 0) {
    console.log("⏭️ No saved_recipes data to seed.");
    return;
  }
  try {
    for (const s of saved) {
      const text = `INSERT INTO saved_recipes (user_id, recipe_id, created_at) VALUES ($1,$2, COALESCE($3, NOW()))`;
      await pool.query(text, [s.user_id, s.recipe_id, s.created_at || null]);
    }
    console.log("✅ saved_recipes seeded");
  } catch (error) {
    console.error("⚠️ error inserting saved_recipes", error);
    throw error;
  }
};

const seedLikesTable = async (likes = []) => {
  if (!likes || likes.length === 0) {
    console.log("⏭️ No likes data to seed.");
    return;
  }
  try {
    for (const l of likes) {
      const text = `INSERT INTO likes (user_id, recipe_id, created_at) VALUES ($1,$2, COALESCE($3, NOW()))`;
      await pool.query(text, [l.user_id, l.recipe_id, l.created_at || null]);
    }
    console.log("✅ likes seeded");
  } catch (error) {
    console.error("⚠️ error inserting likes", error);
    throw error;
  }
};

const seedCommentsTable = async (comments = []) => {
  if (!comments || comments.length === 0) {
    console.log("⏭️ No comments data to seed.");
    return;
  }
  try {
    for (const c of comments) {
      const text = `INSERT INTO comments (user_id, recipe_id, content, created_at) VALUES ($1,$2,$3, COALESCE($4, NOW()))`;
      await pool.query(text, [
        c.user_id,
        c.recipe_id,
        c.content,
        c.created_at || null,
      ]);
    }
    console.log("✅ comments seeded");
  } catch (error) {
    console.error("⚠️ error inserting comments", error);
    throw error;
  }
};

const seedRecipeStepsTable = async (steps = []) => {
  if (!steps || steps.length === 0) {
    console.log("⏭️ No recipe_steps data to seed.");
    return;
  }
  try {
    for (const s of steps) {
      const text = `INSERT INTO recipe_steps (recipe_id, step_number, instruction, created_at) VALUES ($1,$2,$3, COALESCE($4, NOW()))`;
      await pool.query(text, [
        s.recipe_id,
        s.step_number,
        s.instruction,
        s.created_at || null,
      ]);
    }
    console.log("✅ recipe_steps seeded");
  } catch (error) {
    console.error("⚠️ error inserting recipe_steps", error);
    throw error;
  }
};

// add: verify DB connection before migrations
const verifyDbConnection = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connection OK");
  } catch (err) {
    console.error("❌ Unable to connect to database:", err);
    process.exit(1);
  }
};

const seedAllTables = async () => {
  try {
    // verify DB first
    await verifyDbConnection();

    await createAllTables();

    // try to dynamically import optional data files; fall back to empty arrays
    let usersData = [];
    let ingredientsData = [];
    let recipeIngredientsData = [];
    let tagsData = [];
    let recipeTagsData = [];
    let savedRecipesData = [];
    let likesData = [];
    let commentsData = [];
    let recipeStepsData = [];
    let recipeData = [];

    try {
      // these imports are optional; if files don't exist we leave arrays empty
      const usersMod = await import("../data/users.js").catch(() => ({
        default: [],
      }));
      usersData = usersMod.default || [];

      const ingredientsMod = await import("../data/ingredients.js").catch(
        () => ({ default: [] })
      );
      ingredientsData = ingredientsMod.default || [];

      const riMod = await import("../data/recipe_ingredients.js").catch(() => ({
        default: [],
      }));
      recipeIngredientsData = riMod.default || [];

      const tagsMod = await import("../data/tags.js").catch(() => ({
        default: [],
      }));
      tagsData = tagsMod.default || [];

      const rTagsMod = await import("../data/recipe_tags.js").catch(() => ({
        default: [],
      }));
      recipeTagsData = rTagsMod.default || [];

      const savedMod = await import("../data/saved_recipes.js").catch(() => ({
        default: [],
      }));
      savedRecipesData = savedMod.default || [];

      const likesMod = await import("../data/likes.js").catch(() => ({
        default: [],
      }));
      likesData = likesMod.default || [];

      const commentsMod = await import("../data/comments.js").catch(() => ({
        default: [],
      }));
      commentsData = commentsMod.default || [];

      const stepsMod = await import("../data/recipe_steps.js").catch(() => ({
        default: [],
      }));
      recipeStepsData = stepsMod.default || [];

      // dynamically load recipes if present
      const recipesMod = await import("../data/recipes.js").catch(() => ({
        default: [],
      }));
      recipeData = recipesMod.default || [];
    } catch (e) {
      // if dynamic import fails entirely, continue with empty arrays
    }

    console.log("🏁 Seeding users...");
    await seedUsersTable(usersData);

    console.log("🏁 Seeding recipes...");
    await seedRecipesTable(Array.isArray(recipeData) ? recipeData : []);

    console.log("🏁 Seeding ingredients...");
    await seedIngredientsTable(ingredientsData);

    console.log("🏁 Seeding recipe_ingredients...");
    await seedRecipeIngredientsTable(recipeIngredientsData);

    console.log("🏁 Seeding tags...");
    await seedTagsTable(tagsData);

    console.log("🏁 Seeding recipe_tags...");
    await seedRecipeTagsTable(recipeTagsData);

    console.log("🏁 Seeding saved_recipes...");
    await seedSavedRecipesTable(savedRecipesData);

    console.log("🏁 Seeding likes...");
    await seedLikesTable(likesData);

    console.log("🏁 Seeding comments...");
    await seedCommentsTable(commentsData);

    console.log("🏁 Seeding recipe_steps...");
    await seedRecipeStepsTable(recipeStepsData);

    console.log("🎉 All data migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

seedAllTables();
