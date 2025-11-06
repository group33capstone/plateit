import React, { useEffect, useState } from "react";

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
        if (!cancelled) setRecipes(json || []);
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
        <div style={{ display: "grid", gap: 12 }}>
          {recipes.map((r) => (
            <div
              key={r.id}
              style={{ padding: 12, border: "1px solid #eee", borderRadius: 6 }}
            >
              <h3 style={{ margin: 0 }}>{r.title}</h3>
              <div style={{ color: "#666", fontSize: 13 }}>{r.description}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                Servings: {r.servings ?? "-"} · Prep: {r.prep_time ?? "-"} min ·
                Cook: {r.cook_time ?? "-"} min
              </div>
              <div style={{ marginTop: 8 }}>
                <a href={`/recipes/${r.id}`}>View</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
