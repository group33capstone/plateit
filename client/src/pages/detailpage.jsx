import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function DetailPage() {
  const { id } = useParams();
  const API_URL = import.meta.env.VITE_API_URL || "";
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [creator, setCreator] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/recipes/${id}`);
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRecipe(data);
        if (!cancelled) {
          setEditText(data?.raw_markdown || data?.description || "");
          setEditTitle(data?.title || "");
          // fetch creator username separately (server exposes /users/:id)
          if (data?.user_id) {
            try {
              const ures = await fetch(`${API_URL}/users/${data.user_id}`);
              if (ures.ok) {
                const uj = await ures.json();
                if (!cancelled) setCreator(uj.user || uj);
              }
            } catch (e) {
              // ignore creator fetch errors
              console.warn("Failed to fetch recipe creator", e);
            }
          }
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
  }, [API_URL, id]);

  if (loading) return <div>Loading recipe…</div>;
  if (error) return <div style={{ color: "#b00020" }}>Error: {error}</div>;
  if (!recipe) return <div>No recipe found.</div>;

  return (
    <div style={{ padding: 20 }}>
      <div className="d-flex justify-content-between align-items-start">
        <h2>{recipe.title || "Untitled"}</h2>
        <div>
          {!isEditing ? (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          ) : (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setIsEditing(false);
                setEditText(recipe.raw_markdown || recipe.description || "");
                setEditTitle(recipe.title || "");
                setSaveStatus(null);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="text-muted mb-2">
        {creator?.username ? (
          <span className="me-2">By {creator.username}</span>
        ) : recipe.creator_username ? (
          <span className="me-2">By {recipe.creator_username}</span>
        ) : null}
        {recipe.created_at && (
          <span className="me-2">
            {new Date(recipe.created_at).toLocaleString()}
          </span>
        )}
        {recipe.servings ? `${recipe.servings} servings · ` : ""}
        {recipe.prep_time ? `Prep ${recipe.prep_time} min · ` : ""}
        {recipe.cook_time ? `Cook ${recipe.cook_time} min` : ""}
      </div>
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.title || "recipe image"}
          style={{ maxWidth: "100%", marginBottom: 12 }}
        />
      )}

      {isEditing ? (
        <div>
          <input
            className="form-control mb-2"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            className="form-control mb-2"
            rows={12}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setSaveStatus(null);
                try {
                  const res = await fetch(`${API_URL}/api/recipes/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      raw_markdown: editText,
                      title: editTitle,
                    }),
                  });
                  if (!res.ok) {
                    let j = null;
                    try {
                      j = await res.json();
                    } catch {
                      j = { error: "parse_error" };
                    }
                    setSaveStatus(`error: ${j?.error || res.statusText}`);
                  } else {
                    const updated = await res.json();
                    setRecipe(updated);
                    setIsEditing(false);
                    setSaveStatus("ok");
                  }
                } catch (err) {
                  setSaveStatus(`error: ${String(err)}`);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                setIsEditing(false);
                setEditText(recipe.raw_markdown || recipe.description || "");
                setEditTitle(recipe.title || "");
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger ms-auto"
              onClick={async () => {
                if (
                  !window.confirm("Delete this recipe? This cannot be undone.")
                )
                  return;
                try {
                  const dres = await fetch(`${API_URL}/api/recipes/${id}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  if (!dres.ok) {
                    // try to read JSON, but fall back to text so we can show the real server response
                    let bodyText = null;
                    try {
                      bodyText = await dres.text();
                    } catch {
                      bodyText = null;
                    }
                    const message = bodyText
                      ? `HTTP ${dres.status} - ${bodyText}`
                      : `HTTP ${dres.status} - ${dres.statusText}`;
                    alert(`Delete failed: ${message}`);
                  } else {
                    // navigate back to list
                    navigate("/list");
                  }
                } catch (err) {
                  alert(`Delete failed: ${String(err)}`);
                }
              }}
            >
              Delete
            </button>
            {saveStatus && (
              <div className="ms-2 align-self-center small">{saveStatus}</div>
            )}
          </div>
        </div>
      ) : recipe.raw_markdown ? (
        <div className="card p-3">
          <ReactMarkdown>{recipe.raw_markdown}</ReactMarkdown>
        </div>
      ) : (
        <div>
          <p>{recipe.description}</p>
        </div>
      )}
    </div>
  );
}
