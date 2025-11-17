import React, { useState } from "react";
import { generateText, buildSavePayload } from "../utilities/geminiAPI";
import Markdown from "react-markdown";

export default function App() {
  // We only need the markdown value here; the setter was unused and triggered
  // lint/runtime complaints in some environments. Destructure only the value.
  const [markdown] = useState("");
  const [query, setQuery] = useState(""); // Used as 'question' for the API
  const [filters, setFilters] = useState({
    vegan: false,
    kosher: false,
    halal: false,
  });

  // State from FormPage
  const [modelId, setModelId] = useState("gemini-2.0-flash");
  const [textBusy, setTextBusy] = useState(false);
  const [error, setError] = useState(null);
  const [structuredResult, setStructuredResult] = useState(null);
  const [savePayload, setSavePayload] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // Helper from HomePage to toggle filters
  const toggleFilter = (key) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  async function handleSubmitForm(e) {
    e?.preventDefault?.();
    setTextBusy(true);
    setError(null);
    setStructuredResult(null);
    setSavePayload(null);
    setSaveStatus(null);

    // Get active dietary filters from HomePage's state
    const dietaryOptions = Object.entries(filters)
      .filter(([, on]) => on)
      .map(([k]) => k);

    try {
      const result = await generateText({
        model: modelId,
        question: query,
        options: dietaryOptions, // Pass the dietary filters
        persist: {
          title: (query || "Recipe").slice(0, 80),
          question: query,
          model: modelId,
        },
        structured: true,
        asRecipe: true,
      });

      if (!result.ok) {
        setError(result.error || "Unknown error");
        setStructuredResult(null);
        setSavePayload(null);
      } else {
        const structured = result.structured || null;
        setStructuredResult(structured);
        setSavePayload(structured ? buildSavePayload(structured) : null);
        setSaveStatus(null);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setTextBusy(false);
    }
  }

  const handleClear = () => {
    setQuery("");
    setStructuredResult(null);
    setSavePayload(null);
    setSaveStatus(null);
    setError(null);
    setFilters({ vegan: false, kosher: false, halal: false }); // Reset filters too
    setModelId("gemini-2.0-flash");
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      // Use execCommand for broader compatibility in restricted environments
      document.execCommand("copy");
      setSaveStatus("JSON Copied!");
      setTimeout(() => setSaveStatus(null), 2000); // Clear status after 2s
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setSaveStatus("Copy failed");
    }
    document.body.removeChild(textArea);
  };

  // Save recipe function from FormPage
  const handleSaveRecipe = async () => {
    setSaveStatus("saving...");
    try {
      // Logic from FormPage to determine API base URL
      const devBase =
        typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.DEV
          ? "http://localhost:3001"
          : "";

      const res = await fetch(`${devBase}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(savePayload), // savePayload is set by buildSavePayload
      });

      let j = null;
      try {
        j = await res.json();
      } catch {
        j = null;
      }

      if (!res.ok) {
        setSaveStatus(`error: ${j?.error || res.statusText}`);
      } else {
        setSaveStatus(`ok: recipeId=${j?.recipeId ?? j?.id ?? "unknown"}`);
      }
    } catch (err) {
      setSaveStatus(`error: ${String(err)}`);
    }
  };

  return (
    <>
      {/* Main App Container */}
      <div className="container pt-4 pb-5">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            {/* Header from HomePage */}
            <div className="text-center mb-5">
              <h1 id="title" className="display-4">
                PlateIt
              </h1>
              <h3 id="tagline" className="mt-2 fs-5 text-muted">
                Need ideas or a recipe for your meal?
              </h3>
              <div id="quote" className="mt-4 fs-4">
                <h4 className="fw-medium text-body">Type it</h4>
                <h4 className="text-muted">Follow the recipe</h4>
                <h4 className="fw-medium text-body">Plate it</h4>
              </div>
            </div>

            {/* Error alert from FormPage */}
            {error && (
              <div className="alert alert-danger" role="alert">
                <strong>Error: </strong>
                {error}
              </div>
            )}

            {/* Form Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-body p-4">
                <form onSubmit={handleSubmitForm}>
                  {/* Model select from FormPage */}
                  <div className="mb-3">
                    <label htmlFor="modelSelect" className="form-label">
                      Select Gemini Model
                    </label>
                    <select
                      id="modelSelect"
                      className="form-select"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      disabled={textBusy}
                    >
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    </select>
                  </div>

                  {/* Dietary filters from HomePage */}
                  <div className="mb-3">
                    <label className="form-label d-block">
                      Dietary Filters
                    </label>
                    <div
                      className="d-flex flex-wrap justify-content-center gap-3 mt-2"
                      role="group"
                      aria-label="Dietary filters"
                    >
                      {Object.keys(filters).map((filterKey) => (
                        <div
                          className="form-check form-check-inline"
                          key={filterKey}
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`filter-${filterKey}`}
                            checked={filters[filterKey]}
                            onChange={() => toggleFilter(filterKey)}
                            disabled={textBusy}
                          />
                          <label
                            className="form-check-label text-capitalize"
                            htmlFor={`filter-${filterKey}`}
                          >
                            {filterKey}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients textarea from FormPage */}
                  <div className="mb-3">
                    <label htmlFor="ingredients" className="form-label">
                      Your recipe ingredients
                    </label>
                    <textarea
                      id="ingredients"
                      className="form-control"
                      rows={4}
                      placeholder="e.g., chicken thighs, garlic, lemon, olive oil, paprika"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={textBusy}
                    />
                    <div className="form-text mt-1">
                      Tip: Include quantities for more precise results.
                    </div>
                  </div>

                  {/* Submit/Clear buttons from FormPage */}
                  <div className="d-flex gap-3 justify-content-center">
                    <button
                      type="submit"
                      className="btn btn-primary d-inline-flex align-items-center"
                      disabled={textBusy || !query.trim()}
                    >
                      {textBusy ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Generating...
                        </>
                      ) : (
                        "Generate Recipe"
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={textBusy}
                      onClick={handleClear}
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Structured output from FormPage */}
            {structuredResult && (
              <div className="card shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="card-title mb-0">Generated Recipe</h5>

                    {saveStatus && (
                      <span
                        className={`badge ${
                          String(saveStatus).startsWith("ok") ||
                          String(saveStatus).startsWith("JSON")
                            ? "text-bg-success"
                            : "text-bg-warning"
                        }`}
                      >
                        <Markdown>{markdown}</Markdown>
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <pre className="bg-light p-3 rounded small">
                      {JSON.stringify(structuredResult, null, 2)}
                    </pre>
                  </div>

                  <div className="mt-4 d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-success btn-sm"
                      disabled={!savePayload || textBusy}
                      onClick={handleSaveRecipe}
                    >
                      Save Recipe
                    </button>

                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(structuredResult, null, 2)
                        )
                      }
                    >
                      Copy JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer text from HomePage */}
            <div className="text-center mt-5 text-muted small">
              <p>
                This app accepts text from a form. Model inference is handled by
                a server-side generative API.
              </p>
              <p>
                Use the <strong>New</strong> link to create a new recipe, or{" "}
                <strong>All</strong> to view saved recipes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
