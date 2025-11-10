import React, { useState } from "react";

export default function HomePage() {
  const [query, setQuery] = useState("");

  // dietary filters state
  const [filters, setFilters] = useState({
    vegan: false,
    kosher: false,
    halal: false,
  });

  const toggleFilter = (key) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleGenerate = () => {
    const payload = {
      query,
      dietary: Object.entries(filters)
        .filter(([, on]) => on)
        .map(([k]) => k), // ['vegan','kosher','halal']
    };
    console.log("Generate recipe with:", payload);
    // TODO: call your API here with `payload`
    // e.g., generateText({ question: query, options: payload.dietary, ... })
  };

  return (
    <div className="container py-4">
      <h1 id="title">PlateIt</h1>

      <h3 id="tagline" className="mt-2">
        Need ideas or a recipe for your meal?
      </h3>

      <div id="quote" className="mt-4 mb-4">
        <h4>Type it</h4>
        <h4 className="text-muted">Follow the recipe</h4>
        <h4>Plate it</h4>
      </div>

      {/* Ingredients input */}
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Enter ingredients (e.g., eggs, tomatoes, pasta)"
          aria-label="Ingredients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={handleGenerate}
          disabled={!query.trim()}
        >
          Generate
        </button>
      </div>

      {/* Dietary filters (checkboxes, not radios) */}
      <div className="d-flex justify-content-center gap-5 mb-3" role="group" aria-label="Dietary filters">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="filter-vegan"
            checked={filters.vegan}
            onChange={() => toggleFilter("vegan")}
          />
          <label className="form-check-label" htmlFor="filter-vegan">
            Vegan
          </label>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="filter-kosher"
            checked={filters.kosher}
            onChange={() => toggleFilter("kosher")}
          />
          <label className="form-check-label" htmlFor="filter-kosher">
            Kosher
          </label>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="filter-halal"
            checked={filters.halal}
            onChange={() => toggleFilter("halal")}
          />
          <label className="form-check-label" htmlFor="filter-halachic">
            Halal
          </label>
        </div>
      </div>

      <p className="mb-1">
        This CRUD app accepts text from a form. Model inference is handled by a
        server-side generative API.
      </p>
      <p className="mb-0">
        Use the <strong>New</strong> link to create a new recipe, or <strong>All</strong> to view saved
        recipes.
      </p>
    </div>
  );
}
