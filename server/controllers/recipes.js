import { pool } from "../config/database.js";
import { generate } from "../config/gemini.js";

// GET /api/recipes
const getRecipes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recipes ORDER BY "created_at" DESC'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/recipes/:recipeId
const getRecipeById = async (req, res) => {
  try {
    const recipeId = req.params.recipeId;
    // Include creator username and avatar when available
    const q = `SELECT r.*, u.username AS creator_username, u.avatarurl AS creator_avatar
               FROM recipes r
               LEFT JOIN users u ON r.user_id = u.id
               WHERE r.id = $1`;
    const result = await pool.query(q, [recipeId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Recipe not found" });
    } else {
      const row = result.rows[0];
      // If the JOIN didn't include creator fields for any reason, fetch user separately
      if (!row.creator_username && row.user_id) {
        try {
          const u = await pool.query(
            "SELECT username, avatarurl FROM users WHERE id = $1",
            [row.user_id]
          );
          if (u.rows[0]) {
            row.creator_username = u.rows[0].username;
            row.creator_avatar = u.rows[0].avatarurl;
          }
        } catch (uerr) {
          console.warn(
            "getRecipeById: failed to fetch creator user",
            uerr?.message || uerr
          );
        }
      }
      res.status(200).json(row);
    }
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/recipes/:recipeId
const updateRecipe = async (req, res) => {
  const recipeId = req.params.recipeId;
  const fields = req.body || {};

  // Build dynamic SET clause
  const allowed = [
    "title",
    "description",
    "raw_markdown",
    "servings",
    "prep_time",
    "cook_time",
    "image_url",
  ];
  const sets = [];
  const values = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      sets.push(`${k} = $${idx}`);
      values.push(fields[k]);
      idx++;
    }
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  try {
    const text = `UPDATE recipes SET ${sets.join(
      ", "
    )} , updated_at = now() WHERE id = $${idx} RETURNING *`;
    values.push(recipeId);
    const result = await pool.query(text, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error updating recipe:", err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/recipes/:recipeId
const deleteRecipe = async (req, res) => {
  const recipeId = req.params.recipeId;
  console.log(
    `deleteRecipe: received request for id=${recipeId} by user=${req.user?.id}`
  );
  try {
    const result = await pool.query(
      "DELETE FROM recipes WHERE id = $1 RETURNING id",
      [recipeId]
    );
    if (result.rows.length === 0) {
      console.log(`deleteRecipe: id=${recipeId} not found`);
      return res.status(404).json({ error: "Recipe not found" });
    }
    console.log(`deleteRecipe: deleted id=${result.rows[0].id}`);
    return res.status(200).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error deleting recipe:", err);
    // Include stack in logs but return clean message to client
    return res.status(500).json({ error: err.message });
  }
};

// Create a recipe and related rows from structured payload
const createRecipe = async (req, res) => {
  const payload = req.body;

  // accept either structured payload (payload.recipe) or markdown-only: { title, raw_markdown }
  if (!payload || (!payload.recipe && !payload.raw_markdown)) {
    return res
      .status(400)
      .json({ error: "Invalid payload: missing recipe or raw_markdown" });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("Database connection failed:", err?.message || err);
    return res.status(503).json({ error: "Database unavailable" });
  }
  // (no debug logging here)

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
        /^[\s]*(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/
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

    // Determine current authenticated user (if any) and prefer saving recipes under their id
    const currentUserId = req.user?.id ?? null;

    // If caller sent raw_markdown, attempt to parse it server-side using the LLM
    if (payload.raw_markdown) {
      try {
        const parsePrompt = `You are a strict parser. Given the following recipe in Markdown, return a single valid JSON object with these top-level keys: recipe, ingredients, recipe_ingredients, steps, tags. The recipe object should contain title, description, servings, prep_time, cook_time, image_url. Return only JSON and nothing else. Here is the markdown:\n\n${payload.raw_markdown}`;
        const genReq = {
          body: {
            contents: [{ parts: [{ text: String(parsePrompt) }] }],
          },
        };
        const genResult = await generate(genReq, process.env);
        let parsed = null;
        if (genResult && genResult.status === 200) {
          const body = genResult.body;
          // If body already an object with recipe, use it
          if (
            body &&
            typeof body === "object" &&
            (body.recipe || body.recipes)
          ) {
            parsed = body;
          } else if (body && typeof body === "object" && body.text) {
            try {
              parsed = JSON.parse(body.text);
            } catch (e) {
              // ignore, fallback below
            }
          } else if (
            body &&
            typeof body === "object" &&
            Array.isArray(body.candidates)
          ) {
            const parts = body.candidates[0]?.content?.parts;
            if (Array.isArray(parts)) {
              const joined = parts.map((p) => p.text || "").join("\n\n");
              try {
                parsed = JSON.parse(joined);
              } catch (e) {
                // ignore
              }
            }
          } else if (typeof genResult.body === "string") {
            try {
              parsed = JSON.parse(genResult.body);
            } catch (e) {
              // ignore
            }
          }
        }

        if (parsed && (parsed.recipe || parsed.recipes)) {
          // merge parsed structured fields into payload so normalized insertion code below runs
          payload.recipe =
            parsed.recipe ||
            (Array.isArray(parsed.recipes) ? parsed.recipes[0] : parsed);
          payload.ingredients = parsed.ingredients || parsed.ingredients || [];
          payload.recipe_ingredients =
            parsed.recipe_ingredients || parsed.recipe_ingredients || [];
          payload.steps = parsed.steps || payload.steps || [];
          payload.tags = parsed.tags || payload.tags || [];
          // keep payload.raw_markdown for storage
        } else {
          // Parsing failed - fallback to storing raw_markdown only
          const insertRecipeText = `INSERT INTO recipes (user_id, title, description, raw_markdown, servings, prep_time, cook_time, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`;
          const insertRecipeValues = [
            currentUserId,
            payload.title || "Untitled",
            "",
            payload.raw_markdown,
            payload.servings ?? 1,
            0,
            0,
            null,
          ];
          const recipeResult = await client.query(
            insertRecipeText,
            insertRecipeValues
          );
          const recipeId = recipeResult.rows[0].id;
          console.log("createRecipe: inserted (fallback) recipe id=", recipeId);
          await client.query("COMMIT");
          return res.status(201).json({ ok: true, recipeId, parsed: false });
        }
      } catch (genErr) {
        console.warn("LLM parse failed", genErr);
        const insertRecipeText = `INSERT INTO recipes (user_id, title, description, raw_markdown, servings, prep_time, cook_time, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`;
        const insertRecipeValues = [
          currentUserId,
          payload.title || "Untitled",
          "",
          payload.raw_markdown,
          payload.servings ?? 1,
          0,
          0,
          null,
        ];
        const recipeResult = await client.query(
          insertRecipeText,
          insertRecipeValues
        );
        const recipeId = recipeResult.rows[0].id;
        console.log("createRecipe: inserted (genErr) recipe id=", recipeId);
        await client.query("COMMIT");
        return res.status(201).json({ ok: true, recipeId, parsed: false });
      }
    }

    // 3) Insert recipe from structured payload (store raw_markdown if provided)
    const r = payload.recipe || {};
    const insertRecipeText = `INSERT INTO recipes (user_id, title, description, raw_markdown, servings, prep_time, cook_time, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`;
    const insertRecipeValues = [
      currentUserId,
      r.title || "Untitled",
      r.description || "",
      payload.raw_markdown || r.raw_markdown || null,
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
    console.log(
      "createRecipe: inserted recipe id=",
      recipeId,
      " raw_markdown=",
      Boolean(payload.raw_markdown)
    );

    // 4) Map ingredient names -> ids
    // Recompute ingredient names from payload in case we parsed markdown above
    const ingredientNames = Array.isArray(payload.ingredients)
      ? [...new Set(payload.ingredients.map((i) => String(i.name).trim()))]
      : [];
    let nameToId = {};
    if (ingredientNames.length) {
      const insertVals = ingredientNames.map((_, i) => `($${i + 1})`).join(",");
      const insertText = `INSERT INTO ingredients (name) VALUES ${insertVals} ON CONFLICT (name) DO NOTHING`;
      await client.query(insertText, ingredientNames);

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
    const tagNames = Array.isArray(payload.tags)
      ? [...new Set(payload.tags.map((t) => String(t.name).trim()))]
      : [];
    if (tagNames.length) {
      const insertVals = tagNames.map((_, i) => `($${i + 1})`).join(",");
      const insertText = `INSERT INTO tags (name) VALUES ${insertVals} ON CONFLICT (name) DO NOTHING`;
      await client.query(insertText, tagNames);

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

export default {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
