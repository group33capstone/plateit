import React, { useState } from "react";
import { generateText, buildSavePayload } from "../utilities/geminiAPI";

export default function FormPage() {
  const [question, setQuestion] = useState("");
  const [modelId, setModelId] = useState("gemini-2.0-flash");
  const [textBusy, setTextBusy] = useState(false);

  const [error, setError] = useState(null);
  const [structuredResult, setStructuredResult] = useState(null);
  const [savePayload, setSavePayload] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  async function handleSubmitText(e) {
    e?.preventDefault?.();
    setTextBusy(true);
    setError(null);
    try {
      const result = await generateText({
        model: modelId,
        question,
        persist: {
          title: (question || "Question").slice(0, 80),
          question,
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
    } finally {
      setTextBusy(false);
    }
  }

  return (
    <div className="container my-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h2 className="mb-3">Input your Ingredients</h2>
          <p className="text-muted">
            Enter ingredients (e.g., <em>eggs, tomatoes, pasta</em>) and choose a Gemini model.
            We’ll generate a structured recipe you can save.
          </p>

          {/* Error alert */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <form onSubmit={handleSubmitText} className="d-grid gap-3">
                {/* Model select */}
                <div>
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

                {/* Ingredients textarea */}
                <div>
                  <label htmlFor="ingredients" className="form-label">
                    Your recipe ingredients
                  </label>
                  <textarea
                    id="ingredients"
                    className="form-control"
                    rows={4}
                    placeholder="e.g., chicken thighs, garlic, lemon, olive oil, paprika"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={textBusy}
                  />
                  <div className="form-text">
                    Tip: Include quantities for more precise results.
                  </div>
                </div>

                {/* Submit */}
                <div className="d-flex gap-2 justify-content-center align-items-center">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={textBusy || !question.trim()}
                  >
                    {textBusy ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Thinking…
                      </>
                    ) : (
                      "Generate Recipe"
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={textBusy && !question}
                    onClick={() => {
                      setQuestion("");
                      setStructuredResult(null);
                      setSavePayload(null);
                      setSaveStatus(null);
                      setError(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Structured output */}
          {structuredResult && (
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <strong>Structured response</strong>
                  {saveStatus && (
                    <span
                      className={
                        "badge " +
                        (String(saveStatus).startsWith("ok")
                          ? "text-bg-success"
                          : "text-bg-warning")
                      }
                    >
                      {saveStatus}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <pre className="bg-light p-3 rounded small mb-0">
                    {JSON.stringify(structuredResult, null, 2)}
                  </pre>
                </div>

                <div className="mt-3 d-flex gap-2">
                  <button
                    className="btn btn-success"
                    disabled={!savePayload}
                    onClick={async () => {
                      setSaveStatus("saving");
                      try {
                        const devBase =
                          typeof import.meta !== "undefined" &&
                          import.meta.env &&
                          import.meta.env.DEV
                            ? "http://localhost:3001"
                            : "";
                        const res = await fetch(`${devBase}/api/recipes`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(savePayload),
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
                          setSaveStatus(
                            `ok: recipeId=${j?.recipeId ?? j?.id ?? "unknown"}`
                          );
                        }
                      } catch (err) {
                        setSaveStatus(`error: ${String(err)}`);
                      }
                    }}
                  >
                    Save as recipe
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        JSON.stringify(structuredResult, null, 2)
                      );
                    }}
                  >
                    Copy JSON
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
