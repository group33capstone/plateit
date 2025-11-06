import { pool } from "../config/database.js";

const getRecipes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recipes ORDER BY "created_at"'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(409).json({ error: error.message });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const recipeId = req.params.recipeId;
    const result = await pool.query("SELECT * FROM recipes WHERE id = $1", [
      recipeId,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Recipe not found" });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(409).json({ error: error.message });
  }
};

// Create a recipe and related rows from structured payload
const createRecipe = async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.recipe) {
    return res.status(400).json({ error: "Invalid payload: missing recipe" });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("Database connection failed:", err?.message || err);
    return res.status(503).json({ error: "Database unavailable" });
  }

  try {
    await client.query("BEGIN");

    // Helpers: parse quantities like "1/2", "1 1/2", or unicode fractions (½) into decimals
    const parseQuantity = (val) => {
      if (val == null) return null;
      if (typeof val === "number") return Number.isFinite(val) ? val : null;
      let s = String(val).trim();
      if (!s) return null;

      // map common unicode vulgar fractions to ascii
      const unicodeMap = {
        "½": "1/2",
        "⅓": "1/3",
        "⅔": "2/3",
        "¼": "1/4",
        "¾": "3/4",
        "⅛": "1/8",
      };
      s = s.replace(/[¼½¾⅓⅔⅛]/g, (m) => unicodeMap[m] || m);

      // handle mixed numbers like "1 1/2"
      const mixedMatch = s.match(/^\s*(\d+)\s+(\d+)\/(\d+)\s*$/);
      if (mixedMatch) {
        const whole = Number(mixedMatch[1]);
        const num = Number(mixedMatch[2]);
        const den = Number(mixedMatch[3]);
        if (den === 0) return null;
        return whole + num / den;
      }

      // simple fraction like "1/2"
      const fracMatch = s.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/
      );
      if (fracMatch) {
        const num = Number(fracMatch[1]);
        const den = Number(fracMatch[2]);
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0)
          return null;
        return num / den;
      }

      // fallback: extract first number (handles "0.5", "1.5", "1.0")
      const numMatch = s.match(/-?\d+(?:\.\d+)?/);
      if (numMatch) return Number(numMatch[0]);
      return null;
    };

    const parseTimeNumber = (v, fallback = 0) => {
      if (v == null) return fallback;
      if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
      const s = String(v);
      const m = s.match(/(\d+(?:\.\d+)?)/);
      return m ? Number(m[1]) : fallback;
    };

    // 1) Upsert ingredients
    const ingredientNames = Array.isArray(payload.ingredients)
      ? [...new Set(payload.ingredients.map((i) => String(i.name).trim()))]
      : [];

    if (ingredientNames.length) {
      // Insert names using ON CONFLICT DO NOTHING
      const insertVals = ingredientNames.map((_, i) => `($${i + 1})`).join(",");
      const insertText = `INSERT INTO ingredients (name) VALUES ${insertVals} ON CONFLICT (name) DO NOTHING`;
      await client.query(insertText, ingredientNames);
    }

    // 2) Upsert tags (if any)
    const tagNames = Array.isArray(payload.tags)
      ? [...new Set(payload.tags.map((t) => String(t.name).trim()))]
      : [];
    if (tagNames.length) {
      const insertVals = tagNames.map((_, i) => `($${i + 1})`).join(",");
      const insertText = `INSERT INTO tags (name) VALUES ${insertVals} ON CONFLICT (name) DO NOTHING`;
      await client.query(insertText, tagNames);
    }

    // 3) Insert recipe
    const r = payload.recipe || {};
    const insertRecipeText = `INSERT INTO recipes (user_id, title, description, servings, prep_time, cook_time, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`;
    const insertRecipeValues = [
      null,
      r.title || "Untitled",
      r.description || "",
      r.servings ?? 1,
      parseTimeNumber(r.prep_time ?? r.prepTime, 0),
      parseTimeNumber(r.cook_time ?? r.cookTime, 0),
      r.image_url || null,
    ];
    const recipeResult = await client.query(
      insertRecipeText,
      insertRecipeValues
    );
    const recipeId = recipeResult.rows[0].id;

    // 4) Map ingredient names -> ids
    let nameToId = {};
    if (ingredientNames.length) {
      const sel = await client.query(
        `SELECT id, name FROM ingredients WHERE name = ANY($1)`,
        [ingredientNames]
      );
      for (const row of sel.rows) {
        nameToId[row.name] = row.id;
      }
    }

    // 5) Insert recipe_ingredients
    const ris = Array.isArray(payload.recipe_ingredients)
      ? payload.recipe_ingredients
      : [];
    for (const ri of ris) {
      const ingName = ri.ingredient_name || null;
      const ingredient_id =
        ri.ingredient_id ?? (ingName ? nameToId[ingName] : null);
      const text = `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, preparation, "order") VALUES ($1,$2,$3,$4,$5,$6)`;
      const parsedQty = parseQuantity(ri.quantity);
      // debug log if parsing failed or original looks non-numeric
      if (parsedQty === null && ri.quantity != null) {
        console.warn("createRecipe: could not parse quantity", {
          original: ri.quantity,
          ingredient: ingName,
        });
      }
      const values = [
        recipeId,
        ingredient_id,
        // sanitize quantity to numeric or null
        parsedQty,
        ri.unit ?? null,
        ri.preparation ?? null,
        ri.order ?? null,
      ];
      await client.query(text, values);
    }

    // 6) Insert steps
    const steps = Array.isArray(payload.steps) ? payload.steps : [];
    for (const s of steps) {
      const text = `INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES ($1,$2,$3)`;
      await client.query(text, [
        recipeId,
        s.step_number ?? null,
        s.instruction ?? "",
      ]);
    }

    // 7) Link tags -> recipe_tags
    if (tagNames.length) {
      const selTags = await client.query(
        `SELECT id, name FROM tags WHERE name = ANY($1)`,
        [tagNames]
      );
      const nameToTagId = {};
      for (const row of selTags.rows) nameToTagId[row.name] = row.id;
      for (const t of tagNames) {
        const tagId = nameToTagId[t];
        if (tagId) {
          await client.query(
            `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1,$2)`,
            [recipeId, tagId]
          );
        }
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ ok: true, recipeId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating recipe:", err);
    res.status(500).json({ error: String(err) });
  } finally {
    client.release();
  }
};

export default { getRecipes, getRecipeById, createRecipe };
