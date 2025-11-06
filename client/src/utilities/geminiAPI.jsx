// Utility to call the GenAI proxy and return a normalized response.
export async function generateText({
  model,
  question,
  persist,
  structured,
  asRecipe = false,
} = {}) {
  try {
    // If caller requests recipe generation, wrap the ingredients into a
    // deterministic prompt instructing the model to return a JSON recipe.
    let promptText = String(question || "");
    if (asRecipe) {
      // Ensure we request structured output
      structured = true;
      const prompt = `You are a helpful, precise chef. Given the list of ingredients, produce a single valid JSON object ONLY (no extra text) with the following top-level keys: recipe, ingredients, recipe_ingredients, steps, tags.\n- recipe should contain title, description, servings, prep_time, cook_time, image_url.\n- ingredients should be an array of objects with name.\n- recipe_ingredients should be an array mapping ingredient_name to quantity, unit, preparation and order.\n- steps should be an array of {step_number, instruction}.\n- tags should be an array of {name}.\nReturn parsable JSON only.\n\nIngredients:`;
      promptText = `${prompt}\n${promptText}`;
    }

    const content = { parts: [{ text: String(promptText || "Hello") }] };
    const body = { model, contents: [content] };

    const devBase =
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.DEV
        ? "http://localhost:3001"
        : "";

    const r = await fetch(`${devBase}/api/genai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let json = null;
    let textBody = null;
    const contentType = r.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        json = await r.json();
      } catch (parseErr) {
        textBody = await r.text();
        return {
          ok: false,
          error: `Response JSON parse error: ${String(
            parseErr
          )}\nBody: ${textBody}`,
        };
      }
    } else {
      textBody = await r.text();
      if (!r.ok) {
        return {
          ok: false,
          error: String(textBody || r.statusText || "Unknown error"),
        };
      }
      // If structured requested, attempt to parse plain text too
      if (structured) {
        try {
          const structured = parseStructuredResponse({
            json: null,
            respText: textBody,
          });
          return { ok: true, respText: textBody, isJson: false, structured };
        } catch (err) {
          return {
            ok: true,
            respText: textBody,
            isJson: false,
            structured: null,
            warning: String(err),
          };
        }
      }
      return { ok: true, respText: textBody, isJson: false };
    }

    if (!r.ok) {
      const msg = json?.error || json?.message || r.statusText || "Unknown";
      return { ok: false, error: String(msg) };
    }

    let respText = null;
    let isJson = false;

    if (json?.text) {
      respText = String(json.text);
      isJson = false;
    } else if (
      json?.candidates &&
      Array.isArray(json.candidates) &&
      json.candidates[0]?.content &&
      Array.isArray(json.candidates[0].content?.parts)
    ) {
      try {
        const parts = json.candidates[0].content.parts;
        const texts = parts
          .map((p) => (p && p.text ? String(p.text) : null))
          .filter(Boolean);
        respText = texts.join("\n\n");
        isJson = false;
      } catch {
        respText = JSON.stringify(json, null, 2);
        isJson = true;
      }
    } else if (
      json &&
      json.output &&
      Array.isArray(json.output) &&
      json.output[0]?.content &&
      Array.isArray(json.output[0].content)
    ) {
      const c = json.output[0].content[0];
      if (c?.text) {
        respText = String(c.text);
        isJson = false;
      } else {
        respText = JSON.stringify(json, null, 2);
        isJson = true;
      }
    } else {
      respText = JSON.stringify(json, null, 2);
      isJson = true;
    }

    // If structured output requested, try to parse structured content
    let structuredResult = null;
    if (structured) {
      try {
        structuredResult = parseStructuredResponse({ json, respText });
      } catch (err) {
        console.warn("structured parse failed", err);
      }
    }

    // Persist submission if requested
    try {
      if (persist) {
        const id =
          Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const submission = {
          id,
          title: persist?.title || "Submission",
          question: persist?.question || "",
          model: persist?.model || "",
          responseText: respText,
          createdAt: new Date().toISOString(),
        };
        const list = JSON.parse(localStorage.getItem("submissions") || "[]");
        list.unshift(submission);
        localStorage.setItem("submissions", JSON.stringify(list));
      }
    } catch (err) {
      console.error("failed to save submission", err);
    }

    return { ok: true, respText, isJson, structured: structuredResult };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Helper: normalize GenAI response (json or text) into DB-friendly structures
function parseStructuredResponse({ json, respText }) {
  // If JSON already contains desired keys, normalize and return
  const safeNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  if (json && typeof json === "object") {
    // Accept several possible shapes: { recipe: {...}, ingredients: [...], steps: [...] }
    if (json.recipe || json.ingredients || json.steps || json.tags) {
      const topRecipe = json.recipe || json.recipes?.[0] || json;
      const recipe = {
        title: topRecipe.title || topRecipe.name || "",
        description: topRecipe.description || "",
        servings: safeNumber(topRecipe.servings, 1),
        prep_time: safeNumber(topRecipe.prep_time ?? topRecipe.prepTime, 0),
        cook_time: safeNumber(topRecipe.cook_time ?? topRecipe.cookTime, 0),
        image_url: topRecipe.image_url || topRecipe.image || null,
      };

      // Ensure ingredients include explicit id=null so callers know they must be
      // upserted/linked to DB ingredient ids before inserting recipe_ingredients.
      const ingredients = (json.ingredients || topRecipe.ingredients || []).map(
        (ing) => {
          if (typeof ing === "string") {
            return {
              id: null,
              name: ing.trim(),
              created_at: null,
              updated_at: null,
            };
          }
          return {
            id: ing.id ?? null,
            name: ing.name || ing.ingredient || "",
            created_at: ing.created_at || null,
            updated_at: ing.updated_at || null,
          };
        }
      );

      const steps = (json.steps || topRecipe.steps || []).map((s, idx) =>
        typeof s === "string"
          ? { step_number: idx + 1, instruction: s }
          : {
              step_number: s.step_number ?? idx + 1,
              instruction: s.instruction || s.text || "",
            }
      );

      const tags = (json.tags || topRecipe.tags || []).map((t) =>
        typeof t === "string" ? { name: t } : { name: t.name || "" }
      );

      // Build recipe_ingredients referencing ingredient names (ingredient_id unknown until DB)
      const recipe_ingredients = (
        json.recipe_ingredients ||
        topRecipe.recipe_ingredients ||
        []
      ).length
        ? (json.recipe_ingredients || topRecipe.recipe_ingredients).map(
            (ri, idx) => ({
              recipe_id: null,
              ingredient_id: ri.ingredient_id ?? null,
              ingredient_name:
                ri.ingredient_name || ri.name || ri.ingredient || null,
              quantity: ri.quantity ?? null,
              unit: ri.unit || null,
              preparation: ri.preparation || null,
              order: ri.order ?? idx + 1,
            })
          )
        : ingredients.map((ing, idx) => ({
            recipe_id: null,
            ingredient_id: null,
            ingredient_name: ing.name,
            quantity: null,
            unit: null,
            preparation: null,
            order: idx + 1,
          }));

      return { recipe, ingredients, recipe_ingredients, steps, tags };
    }
  }

  // Fallback: parse plaintext (simple heuristics)
  const text = String(respText || "");
  const sections = {};
  // split into sections by heading lines like "Ingredients:", "Steps:", "Instructions:", "Tags:", "Title:", "Description:"
  const lines = text.split(/\r?\n/);
  let current = "body";
  sections[current] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) {
      // keep blank
      sections[current].push(l);
      continue;
    }
    const m = l.match(
      /^(?:title|description|ingredients|steps|instructions|tags)\s*:\s*$/i
    );
    if (m) {
      current = m[0].replace(/:\s*$/, "").toLowerCase();
      sections[current] = [];
      continue;
    }
    sections[current].push(l);
  }

  // helper to parse ingredient lines like "1 cup flour - sifted"
  const parseIngredientLine = (line) => {
    // try "quantity unit name - preparation" or fallback to name only
    const ingRe = /^\s*([0-9]+(?:\.[0-9]+)?)\s*(\w+)?\s+(.+?)(?:\s*-\s*(.*))?$/;
    const m = line.match(ingRe);
    if (m) {
      return {
        name: (m[3] || "").trim(),
        quantity: safeNumber(m[1], null),
        unit: m[2] || null,
        preparation: m[4] || null,
      };
    }
    return { name: line, quantity: null, unit: null, preparation: null };
  };

  const ingredientsSection = sections["ingredients"] || [];
  const ingredients = ingredientsSection
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parsed = parseIngredientLine(l);
      return {
        id: null,
        name: parsed.name,
        created_at: null,
        updated_at: null,
      };
    });

  const recipe_ingredients = ingredientsSection.map((l, idx) => {
    const parsed = parseIngredientLine(l);
    return {
      recipe_id: null,
      ingredient_id: null,
      ingredient_name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      preparation: parsed.preparation,
      order: idx + 1,
    };
  });

  const stepsSection = sections["steps"] || sections["instructions"] || [];
  const steps = stepsSection
    .map((l) => l.trim())
    .filter(Boolean)
    .map((s, idx) => ({ step_number: idx + 1, instruction: s }));

  const tagsSection = sections["tags"] || [];
  const tags = tagsSection
    .map((l) => l.trim())
    .filter(Boolean)
    .map((t) => ({ name: t }));

  // Title/Description detection (first lines of body or explicit)
  const title =
    (sections["title"] && sections["title"].join(" ").trim()) ||
    (lines[0] || "").trim();
  const description =
    (sections["description"] && sections["description"].join("\n").trim()) ||
    (sections["body"] && sections["body"].slice(0, 5).join(" ").trim()) ||
    "";

  const recipe = {
    title: title || "Generated Recipe",
    description: description || "",
    servings: 1,
    prep_time: 0,
    cook_time: 0,
    image_url: null,
  };

  return { recipe, ingredients, recipe_ingredients, steps, tags };
}

export default { generateText };

// add named export for testing
export { parseStructuredResponse };

// Helper: build a server-friendly payload from the parsed structured result.
// The payload includes a list of ingredient names to upsert and recipe_ingredients
// that reference ingredient_name. The server should upsert ingredients (returning ids)
// and then insert recipe_ingredients using those ids.
export function buildSavePayload(structured) {
  if (!structured) return null;
  const { recipe, ingredients, recipe_ingredients, steps, tags } = structured;

  const ingredientsToUpsert = (ingredients || []).map((i) => ({
    name: i.name,
  }));

  const ri = (recipe_ingredients || []).map((r) => ({
    ingredient_id: r.ingredient_id ?? null,
    ingredient_name: r.ingredient_name ?? null,
    quantity: r.quantity ?? null,
    unit: r.unit ?? null,
    preparation: r.preparation ?? null,
    order: r.order ?? null,
  }));

  return {
    recipe,
    ingredients: ingredientsToUpsert,
    recipe_ingredients: ri,
    steps: steps || [],
    tags: tags || [],
  };
}
