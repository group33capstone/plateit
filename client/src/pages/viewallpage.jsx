import React, { useEffect, useState } from "react";
import "../styles/viewallpage.css";

export default function ViewAllPage() {
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const devBase =
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.DEV
        ? "http://localhost:3001"
        : "";

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${devBase}/api/recipes`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) {
          // Sort newest first. Prefer created_at timestamp if present,
          // otherwise fall back to numeric id descending.
          const list = (json || []).slice().sort((a, b) => {
            if (a.created_at && b.created_at) {
              return new Date(b.created_at) - new Date(a.created_at);
            }
            if (typeof b.id === "number" && typeof a.id === "number") {
              return b.id - a.id;
            }
            return 0;
          });
          setRecipes(list);
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>All Recipes</h2>

      {loading && <div>Loading recipes…</div>}
      {error && (
        <div style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && Array.isArray(recipes) && recipes.length === 0 && (
        <div>No recipes yet.</div>
      )}

      {!loading && !error && Array.isArray(recipes) && recipes.length > 0 && (
        <div className="recipes-grid">
          {recipes.map((r) => (
            <div key={r.id} className="recipe-card">
              <h3 className="recipe-title">{r.title}</h3>
              <div className="recipe-desc">{r.description}</div>
              <div className="recipe-meta">
                Servings: {r.servings ?? "-"} · Prep: {r.prep_time ?? "-"} min ·
                Cook: {r.cook_time ?? "-"} min
              </div>
              <div className="view-link">
                <a href={`/recipes/${r.id}`}>View</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
