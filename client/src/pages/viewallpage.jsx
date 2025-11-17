import React, { useEffect, useState } from "react";
import "../styles/viewallpage.css";

export default function ViewAllPage() {
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState("");

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

          // If the recipe rows did not include creator metadata, fetch
          // unique users and attach username/avatar to the recipes so the
          // UI can display "Created by" consistently (detail page already
          // does a fallback fetch for single recipe views).
          try {
            const userIds = Array.from(
              new Set(
                list
                  .filter((r) => !r.creator_username && r.user_id != null)
                  .map((r) => r.user_id)
              )
            );

            if (userIds.length > 0) {
              const userFetches = userIds.map((id) =>
                fetch(`${devBase}/users/${id}`)
                  .then(async (res) => {
                    if (!res.ok) return null;
                    try {
                      return await res.json();
                    } catch {
                      return null;
                    }
                  })
                  .catch(() => null)
              );

              const users = await Promise.all(userFetches);
              const userMap = {};
              users.forEach((u, i) => {
                const id = userIds[i];
                if (u && u.user) userMap[id] = u.user;
              });

              for (let i = 0; i < list.length; i++) {
                const r = list[i];
                const uid = r.user_id;
                if (!r.creator_username && uid != null && userMap[uid]) {
                  list[i] = {
                    ...r,
                    creator_username: userMap[uid].username,
                    creator_avatar: userMap[uid].avatarurl,
                  };
                }
              }
            }
          } catch (err) {
            // Non-fatal: if user fetches fail, just continue with original list
            console.debug("Could not fetch creator usernames:", err);
          }

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

      {/* Creator search filter */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <label htmlFor="creatorFilter" style={{ marginRight: 8, fontSize: 14 }}>
          Filter by creator:
        </label>
        <input
          id="creatorFilter"
          type="search"
          value={creatorFilter}
          onChange={(e) => setCreatorFilter(e.target.value)}
          placeholder="Type creator username (case-insensitive)"
          style={{ padding: "6px 8px", flex: "1 1 300px" }}
        />
        <button
          type="button"
          onClick={() => setCreatorFilter("")}
          className="btn btn-outline-secondary"
        >
          Clear
        </button>
      </div>

      {loading && <div>Loading recipes…</div>}
      {error && (
        <div style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && Array.isArray(recipes) && recipes.length === 0 && (
        <div>No recipes yet.</div>
      )}

      {!loading &&
        !error &&
        Array.isArray(recipes) &&
        recipes.length > 0 &&
        (() => {
          const filter = (creatorFilter || "").trim().toLowerCase();
          const displayed = filter
            ? recipes.filter((r) =>
                (r.creator_username || "").toLowerCase().includes(filter)
              )
            : recipes;

          if (!displayed || displayed.length === 0) {
            return <div>No recipes match that creator.</div>;
          }

          return (
            <div className="recipes-grid">
              {displayed.map((r) => (
                <div key={r.id} className="recipe-card">
                  <h3 className="recipe-title">{r.title}</h3>
                  <div className="recipe-desc">{r.description}</div>
                  <div className="recipe-meta">
                    Created by: {r.creator_username ?? "-"} · date{" "}
                    {r.created_at ?? "-"} · ID {r.id}
                  </div>
                  <div className="view-link">
                    <a href={`/recipes/${r.id}`}>View</a>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
    </div>
  );
}
