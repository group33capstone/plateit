import React, { useState } from "react";
import { generateText, buildSavePayload } from "../utilities/geminiAPI";

export default function FormPage() {
  const [question, setQuestion] = useState("");
  const [modelId, setModelId] = useState("gemini-2.0-flash");
  const [textBusy, setTextBusy] = useState(false);

  const [responseText, setResponseText] = useState("");
  const [responseIsJson, setResponseIsJson] = useState(false);
  const [error, setError] = useState(null);
  const [structuredFlag, setStructuredFlag] = useState(false);
  const [asRecipeFlag, setAsRecipeFlag] = useState(false);
  const [structuredResult, setStructuredResult] = useState(null);
  const [savePayload, setSavePayload] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // GenAI call moved to utilities/geminiaidemo.generateText

  async function handleSubmitText(e) {
    e && e.preventDefault && e.preventDefault();
    setTextBusy(true);
    setError(null);
    setResponseText("");
    try {
      const result = await generateText({
        model: modelId,
        question,
        persist: {
          title: (question || "Question").slice(0, 80),
          question,
          model: modelId,
        },
        structured: structuredFlag || asRecipeFlag,
        asRecipe: asRecipeFlag,
      });

      if (!result.ok) {
        setError(result.error || "Unknown error");
      } else {
        setResponseIsJson(Boolean(result.isJson));
        setResponseText(result.respText || "");
        setStructuredResult(result.structured || null);
        setSavePayload(
          result.structured ? buildSavePayload(result.structured) : null
        );
      }
    } finally {
      setTextBusy(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Input your Ingredients</h2>

      <form
        onSubmit={handleSubmitText}
        style={{ display: "grid", gap: 10, maxWidth: 700 }}
      >
        <label>
          Select Gemini Model
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          </select>
        </label>

        <label>
          Your recipe ingredients:
          <textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label style={{ display: "block", marginTop: 6 }}>
          <input
            type="checkbox"
            checked={structuredFlag}
            onChange={(e) => setStructuredFlag(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Request structured recipe
        </label>

        <label style={{ display: "block", marginTop: 6 }}>
          <input
            type="checkbox"
            checked={asRecipeFlag}
            onChange={(e) => setAsRecipeFlag(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Generate recipe from ingredients (auto-prompt)
        </label>

        <div>
          <button type="submit" disabled={textBusy}>
            {textBusy ? "Thinking…" : "Submit"}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{ color: "#b00020", whiteSpace: "pre-wrap", marginTop: 12 }}
        >
          Error: {error}
        </div>
      )}

      {responseText && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            border: "1px solid #ddd",
          }}
        >
          <strong>Response</strong>
          <div style={{ marginTop: 8 }}>
            {responseIsJson ? (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                {responseText}
              </pre>
            ) : (
              <div style={{ whiteSpace: "pre-wrap" }}>{responseText}</div>
            )}
          </div>
        </div>
      )}

      {/* Debug: show structured response and save payload when requested */}
      {structuredFlag && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #eee" }}>
          <strong>Structured response</strong>
          <div style={{ marginTop: 8 }}>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
              {JSON.stringify(structuredResult, null, 2)}
            </pre>
          </div>

          <strong style={{ marginTop: 8, display: "block" }}>
            Save payload
          </strong>
          <div style={{ marginTop: 8 }}>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
              {JSON.stringify(savePayload, null, 2)}
            </pre>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
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
                    // response was not JSON
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
            {saveStatus && <div style={{ marginTop: 8 }}>{saveStatus}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
