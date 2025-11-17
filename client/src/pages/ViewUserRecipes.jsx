import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function ViewUserRecipes() {
  // GET /users/:id/recipes will be used
  const { id } = useParams();
  const API_URL = import.meta.env.VITE_API_URL || "";
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchRecipes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/users/${id}/recipes`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRecipes(data || []);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRecipes();
    return () => {
      cancelled = true;
    };
  }, [API_URL, id]);

  if (loading) return <div>Loading recipes…</div>;
  if (error) return <div style={{ color: "#b00020" }}>Error: {error}</div>;

  return (
    <div>
      <h2>User Recipes</h2>
      {recipes.length === 0 ? (
        <div>No recipes found for this user.</div>
      ) : (
        <div className="list-group">
          {recipes.map((r) => (
            <Link
              to={`/detail/${r.id}`}
              key={r.id}
              className="list-group-item list-group-item-action"
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">{r.title}</h5>
                <small>{new Date(r.created_at).toLocaleString()}</small>
              </div>
              <p className="mb-1 text-truncate">{r.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ViewUserRecipes;
